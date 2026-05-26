import pkg from '../../../package.json' with { type: 'json' };

export const runVersion = (): number => {
	process.stdout.write(`patens ${pkg.version}\n`);
	return 0;
};
