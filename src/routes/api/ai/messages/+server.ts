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

export const POST: RequestHandler = async ({ request }) => {
	let payload: {
		apiKey?: string;
		model?: string;
		max_tokens?: number;
		system?: string;
		messages: Array<{ role: 'user' | 'assistant'; content: unknown }>;
	};
	try {
		payload = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const apiKey = payload.apiKey?.trim();
	if (!apiKey || !apiKey.startsWith('sk-ant-')) {
		return json(
			{ error: 'Missing or invalid Anthropic API key (expects "sk-ant-…")' },
			{ status: 400 }
		);
	}
	if (!Array.isArray(payload.messages) || payload.messages.length === 0) {
		return json({ error: 'messages must be a non-empty array' }, { status: 400 });
	}

	const body = {
		model: payload.model ?? 'claude-sonnet-4-6',
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

	// Forward the response verbatim
	const text = await upstream.text();
	return new Response(text, {
		status: upstream.status,
		headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' }
	});
};
