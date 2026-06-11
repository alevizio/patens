/**
 * Patens MCP server — stdio transport, zero runtime dependencies.
 *
 * Implements the slice of the Model Context Protocol a tools-only
 * server needs: JSON-RPC 2.0 messages, one per line, over stdin/stdout
 * (the MCP stdio framing). Handled methods:
 *
 *   initialize                  capability + version negotiation
 *   notifications/initialized   client handshake completion (ignored)
 *   ping                        liveness ({} response)
 *   tools/list                  the three tool definitions
 *   tools/call                  dispatch to a tool handler
 *
 * Everything else gets a -32601 (method not found) for requests and is
 * silently ignored for notifications, as the spec requires. stdout
 * carries protocol messages ONLY — diagnostics go to stderr.
 *
 * Why hand-rolled instead of @modelcontextprotocol/sdk: the CLI's
 * whole design is zero runtime deps (see cli/src/index.ts), and a
 * stdio tools-only server is ~100 lines of dispatch. The SDK earns its
 * keep for resources/prompts/sampling/transports we don't use.
 *
 * Bundled by cli/build-mcp.mjs → cli/dist/mcp-server.mjs, exposed as
 * the `patens-mcp` bin.
 */

import { createInterface } from 'node:readline';
import pkg from '../../../package.json' with { type: 'json' };
import { TOOLS } from './tools';

/** Spec revisions this server knows. Echo the client's if supported. */
const SUPPORTED_PROTOCOL_VERSIONS = ['2024-11-05', '2025-03-26', '2025-06-18'];
const LATEST_PROTOCOL_VERSION = '2025-06-18';

type JsonRpcId = string | number;

type JsonRpcMessage = {
	jsonrpc?: string;
	id?: JsonRpcId | null;
	method?: string;
	params?: Record<string, unknown>;
};

const send = (message: Record<string, unknown>): void => {
	process.stdout.write(JSON.stringify(message) + '\n');
};

const sendResult = (id: JsonRpcId, result: Record<string, unknown>): void => {
	send({ jsonrpc: '2.0', id, result });
};

const sendError = (id: JsonRpcId | null, code: number, message: string): void => {
	send({ jsonrpc: '2.0', id, error: { code, message } });
};

const handleInitialize = (id: JsonRpcId, params: Record<string, unknown>): void => {
	const requested = typeof params.protocolVersion === 'string' ? params.protocolVersion : '';
	const protocolVersion = SUPPORTED_PROTOCOL_VERSIONS.includes(requested)
		? requested
		: LATEST_PROTOCOL_VERSION;
	sendResult(id, {
		protocolVersion,
		capabilities: { tools: {} },
		serverInfo: { name: 'patens-mcp', version: pkg.version },
		instructions:
			'Deterministic font QA for Patens .font.json projects. Call audit_font with a file path to ' +
			'get structured findings; explain_audit_code / list_audit_codes document the audit codes.'
	});
};

const handleToolsList = (id: JsonRpcId): void => {
	sendResult(id, {
		tools: TOOLS.map((t) => ({
			name: t.name,
			description: t.description,
			inputSchema: t.inputSchema
		}))
	});
};

const handleToolsCall = async (id: JsonRpcId, params: Record<string, unknown>): Promise<void> => {
	const name = params.name;
	const tool = TOOLS.find((t) => t.name === name);
	if (!tool) {
		sendError(id, -32602, `Unknown tool "${String(name)}". Available: ${TOOLS.map((t) => t.name).join(', ')}.`);
		return;
	}
	const args =
		params.arguments && typeof params.arguments === 'object'
			? (params.arguments as Record<string, unknown>)
			: {};
	try {
		const result = await tool.handler(args);
		sendResult(id, result);
	} catch (e) {
		// Tool execution errors are in-band (isError result), not protocol
		// errors — the calling model should see them and self-correct.
		sendResult(id, {
			content: [{ type: 'text', text: `${tool.name}: ${e instanceof Error ? e.message : String(e)}` }],
			isError: true
		});
	}
};

const handleMessage = async (message: JsonRpcMessage): Promise<void> => {
	const { id, method } = message;
	const params = message.params ?? {};
	const isRequest = id !== undefined && id !== null;

	if (typeof method !== 'string') {
		if (isRequest) sendError(id, -32600, 'Invalid request: missing method.');
		return;
	}

	switch (method) {
		case 'initialize':
			if (isRequest) handleInitialize(id, params);
			return;
		case 'ping':
			if (isRequest) sendResult(id, {});
			return;
		case 'tools/list':
			if (isRequest) handleToolsList(id);
			return;
		case 'tools/call':
			if (isRequest) await handleToolsCall(id, params);
			return;
		default:
			// Notifications (initialized, cancelled, …) are ignored;
			// unknown requests get method-not-found.
			if (isRequest) sendError(id, -32601, `Method not found: ${method}`);
	}
};

const main = (): void => {
	const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
	rl.on('line', (line) => {
		const trimmed = line.trim();
		if (!trimmed) return;
		let message: JsonRpcMessage;
		try {
			message = JSON.parse(trimmed) as JsonRpcMessage;
		} catch {
			sendError(null, -32700, 'Parse error: message is not valid JSON.');
			return;
		}
		void handleMessage(message).catch((e) => {
			process.stderr.write(`patens-mcp: ${e instanceof Error ? e.message : String(e)}\n`);
		});
	});
	rl.on('close', () => process.exit(0));
};

main();
