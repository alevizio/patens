/**
 * Anthropic API proxy.
 *
 * Why this exists: anthropic.com blocks browser-origin requests via CORS so
 * the client can't call the API directly. This serverless route forwards the
 * caller's request (with their own API key passed in the body) to Anthropic
 * and streams the response back.
 *
 * Privacy: the API key is never logged or stored. It lives in the user's
 * browser localStorage and is only sent to Anthropic per-request.
 */

import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MAX_BODY_BYTES = 256 * 1024;
const MAX_MESSAGES = 8;
const MAX_TEXT_CHARS = 24_000;
const MAX_SYSTEM_CHARS = 12_000;
const MAX_TOKENS = 4096;
const ALLOWED_MODELS = new Set([
	'claude-opus-4-7',
	'claude-sonnet-4-6',
	'claude-haiku-4-5-20251001'
]);

type AnthropicBlock =
	| { type: 'text'; text: string }
	| {
			type: 'image';
			source: {
				type: 'base64';
				media_type: 'image/png' | 'image/jpeg' | 'image/svg+xml';
				data: string;
			};
	  };

type AnthropicMessage = {
	role: 'user' | 'assistant';
	content: string | AnthropicBlock[];
};

type AnthropicPayload = {
	apiKey?: string;
	model?: string;
	max_tokens?: number;
	system?: string;
	messages: AnthropicMessage[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

const isTextWithinLimit = (value: unknown, max: number): value is string =>
	typeof value === 'string' && value.length <= max;

const isAnthropicBlock = (value: unknown): value is AnthropicBlock => {
	if (!isRecord(value) || typeof value.type !== 'string') return false;
	if (value.type === 'text') return isTextWithinLimit(value.text, MAX_TEXT_CHARS);
	if (value.type !== 'image' || !isRecord(value.source)) return false;
	return (
		value.source.type === 'base64' &&
		(value.source.media_type === 'image/png' ||
			value.source.media_type === 'image/jpeg' ||
			value.source.media_type === 'image/svg+xml') &&
		isTextWithinLimit(value.source.data, MAX_BODY_BYTES)
	);
};

const isMessageContent = (value: unknown): value is AnthropicMessage['content'] => {
	if (isTextWithinLimit(value, MAX_TEXT_CHARS)) return true;
	if (!Array.isArray(value) || value.length === 0 || value.length > 8) return false;
	return value.every(isAnthropicBlock);
};

const parsePayload = (value: unknown): AnthropicPayload | { error: string } => {
	if (!isRecord(value)) return { error: 'Payload must be an object' };
	const messages = value.messages;
	if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
		return { error: `messages must contain 1-${MAX_MESSAGES} items` };
	}
	for (const message of messages) {
		if (!isRecord(message)) return { error: 'Each message must be an object' };
		if (message.role !== 'user' && message.role !== 'assistant') {
			return { error: 'message.role must be "user" or "assistant"' };
		}
		if (!isMessageContent(message.content)) {
			return { error: 'message.content is missing, unsupported, or too large' };
		}
	}
	if (value.system !== undefined && !isTextWithinLimit(value.system, MAX_SYSTEM_CHARS)) {
		return { error: 'system is too large' };
	}
	if (value.max_tokens !== undefined) {
		if (
			typeof value.max_tokens !== 'number' ||
			!Number.isInteger(value.max_tokens) ||
			value.max_tokens < 1 ||
			value.max_tokens > MAX_TOKENS
		) {
			return { error: `max_tokens must be an integer from 1-${MAX_TOKENS}` };
		}
	}
	if (value.model !== undefined && typeof value.model !== 'string') {
		return { error: 'model must be a string' };
	}
	if (value.apiKey !== undefined && typeof value.apiKey !== 'string') {
		return { error: 'apiKey must be a string' };
	}
	return value as AnthropicPayload;
};

export const POST: RequestHandler = async ({ request }) => {
	const contentLength = Number(request.headers.get('content-length') ?? 0);
	if (contentLength > MAX_BODY_BYTES) {
		return json({ error: 'Request body too large' }, { status: 413 });
	}

	let raw: string;
	try {
		raw = await request.text();
	} catch {
		return json({ error: 'Could not read request body' }, { status: 400 });
	}
	if (raw.length > MAX_BODY_BYTES) {
		return json({ error: 'Request body too large' }, { status: 413 });
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const payload = parsePayload(parsed);
	if ('error' in payload) {
		return json({ error: payload.error }, { status: 400 });
	}

	const apiKey = payload.apiKey?.trim();
	if (!apiKey || !apiKey.startsWith('sk-ant-')) {
		return json(
			{ error: 'Missing or invalid Anthropic API key (expects "sk-ant-…")' },
			{ status: 400 }
		);
	}
	const model = payload.model ?? 'claude-sonnet-4-6';
	if (!ALLOWED_MODELS.has(model)) {
		return json({ error: 'Unsupported Anthropic model' }, { status: 400 });
	}

	const body = {
		model,
		max_tokens: payload.max_tokens ?? 1024,
		...(payload.system ? { system: payload.system } : {}),
		messages: payload.messages
	};

	let upstream: Response;
	try {
		upstream = await fetch(ANTHROPIC_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': apiKey,
				'anthropic-version': '2023-06-01'
			},
			body: JSON.stringify(body)
		});
	} catch (err) {
		return json(
			{ error: 'Could not reach Anthropic API: ' + (err instanceof Error ? err.message : String(err)) },
			{ status: 502 }
		);
	}

	const text = await upstream.text();
	if (!upstream.ok) {
		return json(
			{ error: 'Anthropic request failed', status: upstream.status },
			{ status: upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502 }
		);
	}
	return new Response(text, {
		status: upstream.status,
		headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' }
	});
};
