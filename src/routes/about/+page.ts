import pkg from '../../../package.json';

export const prerender = true;

export const load = () => ({
	version: pkg.version as string
});
