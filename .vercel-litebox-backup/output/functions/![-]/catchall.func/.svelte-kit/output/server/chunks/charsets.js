//#region src/lib/font/charsets.ts
var range = (start, end, category) => {
	const out = [];
	for (let cp = start; cp <= end; cp++) out.push({
		codepoint: cp,
		name: `uni${cp.toString(16).toUpperCase().padStart(4, "0")}`,
		category
	});
	return out;
};
/** Greek lowercase α–ω + uppercase Α–Ω */
var GREEK_PACK = [
	...range(913, 937, "uppercase").filter((g) => g.codepoint !== 930),
	...range(945, 969, "lowercase"),
	{
		codepoint: 902,
		name: "Alphatonos",
		category: "composite",
		composite: {
			base: 913,
			mark: 769
		}
	},
	{
		codepoint: 904,
		name: "Epsilontonos",
		category: "composite",
		composite: {
			base: 917,
			mark: 769
		}
	},
	{
		codepoint: 905,
		name: "Etatonos",
		category: "composite",
		composite: {
			base: 919,
			mark: 769
		}
	},
	{
		codepoint: 906,
		name: "Iotatonos",
		category: "composite",
		composite: {
			base: 921,
			mark: 769
		}
	},
	{
		codepoint: 908,
		name: "Omicrontonos",
		category: "composite",
		composite: {
			base: 927,
			mark: 769
		}
	},
	{
		codepoint: 910,
		name: "Upsilontonos",
		category: "composite",
		composite: {
			base: 933,
			mark: 769
		}
	},
	{
		codepoint: 911,
		name: "Omegatonos",
		category: "composite",
		composite: {
			base: 937,
			mark: 769
		}
	}
];
/** Cyrillic core: А–Я + а–я */
var CYRILLIC_PACK = [
	...range(1040, 1071, "uppercase"),
	...range(1072, 1103, "lowercase"),
	{
		codepoint: 1025,
		name: "afii10023",
		category: "uppercase"
	},
	{
		codepoint: 1105,
		name: "afii10071",
		category: "lowercase"
	}
];
var SCRIPT_PACKS = [
	{
		id: "greek",
		label: "Greek",
		description: "Α–Ω + α–ω + 7 tonos composites",
		glyphs: GREEK_PACK
	},
	{
		id: "cyrillic",
		label: "Cyrillic",
		description: "А–Я + а–я + Ё ё",
		glyphs: CYRILLIC_PACK
	},
	{
		id: "vietnamese",
		label: "Vietnamese",
		description: "Latin tone-mark composites + đ Đ",
		glyphs: [
			{
				codepoint: 7841,
				name: "adotbelow",
				category: "composite",
				composite: {
					base: 97,
					mark: 803
				}
			},
			{
				codepoint: 7843,
				name: "ahookabove",
				category: "composite",
				composite: {
					base: 97,
					mark: 777
				}
			},
			{
				codepoint: 7845,
				name: "acircumflexacute",
				category: "composite",
				composite: {
					base: 226,
					mark: 769
				}
			},
			{
				codepoint: 7847,
				name: "acircumflexgrave",
				category: "composite",
				composite: {
					base: 226,
					mark: 768
				}
			},
			{
				codepoint: 7849,
				name: "acircumflexhookabove",
				category: "composite",
				composite: {
					base: 226,
					mark: 777
				}
			},
			{
				codepoint: 7851,
				name: "acircumflextilde",
				category: "composite",
				composite: {
					base: 226,
					mark: 771
				}
			},
			{
				codepoint: 7853,
				name: "acircumflexdotbelow",
				category: "composite",
				composite: {
					base: 226,
					mark: 803
				}
			},
			{
				codepoint: 259,
				name: "abreve",
				category: "composite",
				composite: {
					base: 97,
					mark: 774
				}
			},
			{
				codepoint: 7855,
				name: "abreveacute",
				category: "composite",
				composite: {
					base: 259,
					mark: 769
				}
			},
			{
				codepoint: 7857,
				name: "abrevegrave",
				category: "composite",
				composite: {
					base: 259,
					mark: 768
				}
			},
			{
				codepoint: 7859,
				name: "abrevehookabove",
				category: "composite",
				composite: {
					base: 259,
					mark: 777
				}
			},
			{
				codepoint: 7861,
				name: "abrevetilde",
				category: "composite",
				composite: {
					base: 259,
					mark: 771
				}
			},
			{
				codepoint: 7863,
				name: "abrevedotbelow",
				category: "composite",
				composite: {
					base: 259,
					mark: 803
				}
			},
			{
				codepoint: 7879,
				name: "ecircumflexdotbelow",
				category: "composite",
				composite: {
					base: 234,
					mark: 803
				}
			},
			{
				codepoint: 7907,
				name: "ohorndotbelow",
				category: "composite",
				composite: {
					base: 111,
					mark: 795
				}
			},
			{
				codepoint: 7909,
				name: "udotbelow",
				category: "composite",
				composite: {
					base: 117,
					mark: 803
				}
			},
			{
				codepoint: 273,
				name: "dcroat",
				category: "lowercase"
			},
			{
				codepoint: 272,
				name: "Dcroat",
				category: "uppercase"
			}
		]
	}
];
//#endregion
export { SCRIPT_PACKS as t };
