/**
 * A short list of Unicode blocks relevant to font design.
 * Full Unicode has hundreds of blocks; this list focuses on the blocks a
 * typical Latin/multiscript foundry font targets.
 */
export type UnicodeBlock = {
	name: string;
	from: number;
	to: number;
};

export const RELEVANT_BLOCKS: UnicodeBlock[] = [
	{ name: 'Basic Latin', from: 0x0020, to: 0x007e },
	{ name: 'Latin-1 Supplement', from: 0x00a0, to: 0x00ff },
	{ name: 'Latin Extended-A', from: 0x0100, to: 0x017f },
	{ name: 'Latin Extended-B', from: 0x0180, to: 0x024f },
	{ name: 'IPA Extensions', from: 0x0250, to: 0x02af },
	{ name: 'Spacing Modifier Letters', from: 0x02b0, to: 0x02ff },
	{ name: 'Combining Diacritical Marks', from: 0x0300, to: 0x036f },
	{ name: 'Greek and Coptic', from: 0x0370, to: 0x03ff },
	{ name: 'Cyrillic', from: 0x0400, to: 0x04ff },
	{ name: 'Cyrillic Supplement', from: 0x0500, to: 0x052f },
	{ name: 'Armenian', from: 0x0530, to: 0x058f },
	{ name: 'Hebrew', from: 0x0590, to: 0x05ff },
	{ name: 'Arabic', from: 0x0600, to: 0x06ff },
	{ name: 'Devanagari', from: 0x0900, to: 0x097f },
	{ name: 'Thai', from: 0x0e00, to: 0x0e7f },
	{ name: 'Vietnamese (Latin Extended Additional)', from: 0x1e00, to: 0x1eff },
	{ name: 'General Punctuation', from: 0x2000, to: 0x206f },
	{ name: 'Superscripts and Subscripts', from: 0x2070, to: 0x209f },
	{ name: 'Currency Symbols', from: 0x20a0, to: 0x20cf },
	{ name: 'Letterlike Symbols', from: 0x2100, to: 0x214f },
	{ name: 'Number Forms', from: 0x2150, to: 0x218f },
	{ name: 'Arrows', from: 0x2190, to: 0x21ff },
	{ name: 'Mathematical Operators', from: 0x2200, to: 0x22ff },
	{ name: 'Box Drawing', from: 0x2500, to: 0x257f },
	{ name: 'Geometric Shapes', from: 0x25a0, to: 0x25ff },
	{ name: 'Emoji (Misc Symbols/Pictographs)', from: 0x1f300, to: 0x1f6ff }
];

export type BlockCoverage = {
	block: UnicodeBlock;
	drawn: number;
	total: number;
	defined: number;
};

/**
 * Counts drawn vs. project-defined glyphs per Unicode block. "Total" is the
 * block's full codepoint range (a theoretical max); "defined" is how many of
 * those codepoints exist in the project at all; "drawn" is how many of those
 * defined glyphs have outlines or components.
 */
export const computeBlockCoverage = (
	glyphs: Record<number, { contours: unknown[]; components?: unknown[] }>
): BlockCoverage[] => {
	const codepoints = Object.keys(glyphs).map((k) => Number(k));
	return RELEVANT_BLOCKS.map((block) => {
		const inBlock = codepoints.filter((cp) => cp >= block.from && cp <= block.to);
		const drawn = inBlock.filter((cp) => {
			const g = glyphs[cp];
			return (g.contours?.length ?? 0) > 0 || (g.components?.length ?? 0) > 0;
		}).length;
		return {
			block,
			drawn,
			defined: inBlock.length,
			total: block.to - block.from + 1
		};
	}).filter((c) => c.defined > 0);
};
