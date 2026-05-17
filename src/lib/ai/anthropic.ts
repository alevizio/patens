/**
 * Browser-side helper for calling our /api/ai/messages proxy.
 * The proxy forwards to Anthropic with the user's own API key.
 */

import { settings } from '$lib/stores/settings.svelte';

export type AnthropicTextBlock = { type: 'text'; text: string };
export type AnthropicImageBlock = {
	type: 'image';
	source: { type: 'base64'; media_type: 'image/png' | 'image/jpeg' | 'image/svg+xml'; data: string };
};
export type AnthropicMessageContent = string | Array<AnthropicTextBlock | AnthropicImageBlock>;

export type AnthropicMessage = {
	role: 'user' | 'assistant';
	content: AnthropicMessageContent;
};

export type AnthropicResponse = {
	content: Array<{ type: string; text?: string }>;
	stop_reason?: string;
	usage?: { input_tokens: number; output_tokens: number };
};

export class AnthropicError extends Error {
	constructor(message: string, public status?: number) {
		super(message);
		this.name = 'AnthropicError';
	}
}

export const askClaude = async (input: {
	system?: string;
	messages: AnthropicMessage[];
	maxTokens?: number;
}): Promise<{ text: string; raw: AnthropicResponse }> => {
	if (!settings.hasKey) {
		throw new AnthropicError('No Anthropic API key configured. Add one in Settings.');
	}
	const res = await fetch('/api/ai/messages', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			apiKey: settings.anthropicApiKey,
			model: settings.preferredModel,
			max_tokens: input.maxTokens ?? 1024,
			system: input.system,
			messages: input.messages
		})
	});
	if (!res.ok) {
		const body = await res.text();
		let message = body;
		try {
			const j = JSON.parse(body);
			message = j.error?.message ?? j.error ?? body;
		} catch {
			/* ignore */
		}
		throw new AnthropicError(`Claude error (${res.status}): ${message}`, res.status);
	}
	const raw = (await res.json()) as AnthropicResponse;
	const text = raw.content
		.filter((b) => b.type === 'text')
		.map((b) => b.text ?? '')
		.join('\n');
	return { text, raw };
};

/** Render the current glyph contours to a small PNG for visual audit. */
export const glyphsToPng = (
	contoursList: Array<{
		codepoint: number;
		name: string;
		contours: Array<{ commands: Array<{ type: string; x?: number; y?: number; x1?: number; y1?: number; x2?: number; y2?: number }> }>;
	}>,
	metrics: { ascender: number; descender: number },
	size = 64
): string => {
	if (contoursList.length === 0) return '';
	const cellsPerRow = Math.min(8, contoursList.length);
	const rows = Math.ceil(contoursList.length / cellsPerRow);
	const W = cellsPerRow * size;
	const H = rows * size;
	const canvas = document.createElement('canvas');
	canvas.width = W;
	canvas.height = H;
	const ctx = canvas.getContext('2d')!;
	ctx.fillStyle = '#ffffff';
	ctx.fillRect(0, 0, W, H);
	ctx.fillStyle = '#000000';
	const fontHeight = metrics.ascender - metrics.descender;
	const scale = (size * 0.85) / fontHeight;
	contoursList.forEach((g, idx) => {
		const col = idx % cellsPerRow;
		const row = Math.floor(idx / cellsPerRow);
		const x0 = col * size + size * 0.07;
		const y0 = row * size + size * 0.92;
		ctx.beginPath();
		for (const contour of g.contours) {
			for (const cmd of contour.commands) {
				if (cmd.type === 'M' && cmd.x !== undefined && cmd.y !== undefined)
					ctx.moveTo(x0 + cmd.x * scale, y0 - cmd.y * scale);
				else if (cmd.type === 'L' && cmd.x !== undefined && cmd.y !== undefined)
					ctx.lineTo(x0 + cmd.x * scale, y0 - cmd.y * scale);
				else if (
					cmd.type === 'C' &&
					cmd.x1 !== undefined &&
					cmd.y1 !== undefined &&
					cmd.x2 !== undefined &&
					cmd.y2 !== undefined &&
					cmd.x !== undefined &&
					cmd.y !== undefined
				)
					ctx.bezierCurveTo(
						x0 + cmd.x1 * scale,
						y0 - cmd.y1 * scale,
						x0 + cmd.x2 * scale,
						y0 - cmd.y2 * scale,
						x0 + cmd.x * scale,
						y0 - cmd.y * scale
					);
				else if (
					cmd.type === 'Q' &&
					cmd.x1 !== undefined &&
					cmd.y1 !== undefined &&
					cmd.x !== undefined &&
					cmd.y !== undefined
				)
					ctx.quadraticCurveTo(
						x0 + cmd.x1 * scale,
						y0 - cmd.y1 * scale,
						x0 + cmd.x * scale,
						y0 - cmd.y * scale
					);
				else if (cmd.type === 'Z') ctx.closePath();
			}
		}
		ctx.fill('evenodd');
	});
	// Returns base64 data only (strip the "data:image/png;base64," prefix)
	return canvas.toDataURL('image/png').split(',')[1];
};
