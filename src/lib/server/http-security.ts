export type ServerErrorPayload = {
	message: string;
	status: number;
	url: string;
	stack?: string;
};

export const applySecurityHeaders = (headers: Headers, isHttps: boolean): void => {
	headers.set('X-Content-Type-Options', 'nosniff');
	headers.set('X-Frame-Options', 'DENY');
	headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	headers.set(
		'Permissions-Policy',
		'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
	);
	if (isHttps) {
		headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
	}
};

export const serverErrorPayload = (input: {
	error: unknown;
	message: string;
	status: number;
	url: string;
	exposeDetails: boolean;
}): ServerErrorPayload => {
	if (input.exposeDetails) {
		const err = input.error as Error;
		return {
			message: err?.message ?? input.message ?? 'Unknown server error',
			stack: err?.stack,
			status: input.status,
			url: input.url
		};
	}

	return {
		message: input.status === 404 ? 'Not found' : 'Something went wrong.',
		status: input.status,
		url: input.url
	};
};
