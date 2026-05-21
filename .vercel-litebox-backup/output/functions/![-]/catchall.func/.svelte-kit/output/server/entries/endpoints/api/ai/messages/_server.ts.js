import { json } from "@sveltejs/kit";
//#region src/routes/api/ai/messages/+server.ts
var ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
var POST = async ({ request }) => {
	let payload;
	try {
		payload = await request.json();
	} catch {
		return json({ error: "Invalid JSON body" }, { status: 400 });
	}
	const apiKey = payload.apiKey?.trim();
	if (!apiKey || !apiKey.startsWith("sk-ant-")) return json({ error: "Missing or invalid Anthropic API key (expects \"sk-ant-…\")" }, { status: 400 });
	if (!Array.isArray(payload.messages) || payload.messages.length === 0) return json({ error: "messages must be a non-empty array" }, { status: 400 });
	const body = {
		model: payload.model ?? "claude-sonnet-4-6",
		max_tokens: payload.max_tokens ?? 1024,
		...payload.system ? { system: payload.system } : {},
		messages: payload.messages
	};
	let upstream;
	try {
		upstream = await fetch(ANTHROPIC_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": apiKey,
				"anthropic-version": "2023-06-01"
			},
			body: JSON.stringify(body)
		});
	} catch (err) {
		return json({ error: "Could not reach Anthropic API: " + (err instanceof Error ? err.message : String(err)) }, { status: 502 });
	}
	const text = await upstream.text();
	return new Response(text, {
		status: upstream.status,
		headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" }
	});
};
//#endregion
export { POST };
