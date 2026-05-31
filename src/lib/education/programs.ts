/**
 * Type-design education programs map.
 *
 * The 10 programs identified in docs/research/type-education-landscape.md
 * Part 1. Six formal MA-level programs + 4 certificate/intensive programs.
 *
 * Surfaced publicly at /education so:
 * - Prospective type-design students can find their path
 * - Educators see Patens's audit-as-pedagogy positioning grounded in
 *   the actual education landscape
 * - NLnet reviewers can verify that letters-of-support from these
 *   programs are credible (they exist, they're contactable)
 */

export type ProgramFormat = 'MA' | 'MRes' | 'Postgraduate Research' | 'Certificate' | 'Intensive';

export type ProgramConfidence = 'confirmed' | 'likely' | 'uncertain';

export type EducationProgram = {
	id: string;
	index: number;
	/** Program name as published (no abbreviation expansion). */
	name: string;
	/** Host institution. */
	institution: string;
	city: string;
	country: string;
	/** ISO 3166-1 alpha-2 country code for sorting. */
	countryCode: string;
	established: number;
	format: ProgramFormat;
	/** Program length — "1 year", "9 months", "2 years", etc. */
	length: string;
	/** Approximate cohort size per year. */
	cohortSize: string;
	/** Tooling taught. */
	tools: string[];
	/** Named faculty with confidence levels. */
	faculty: Array<{ name: string; role: string; confidence: ProgramConfidence }>;
	/** Why Patens cares about this program specifically. */
	whyPatensCares: string;
	/** Tradition / lineage / pedagogical approach. */
	tradition?: string;
	/** Program URL. */
	url: string;
	/** Confidence in the overall characterization. */
	confidence: ProgramConfidence;
};

export const PROGRAMS: ReadonlyArray<EducationProgram> = [
	{
		id: 'reading-matd',
		index: 1,
		name: 'MA Communication Design: Typeface Design Pathway',
		institution: 'University of Reading',
		city: 'Reading',
		country: 'United Kingdom',
		countryCode: 'GB',
		established: 1996,
		format: 'MA',
		length: '1 year (+ 1-year MRes option)',
		cohortSize: '12–15 / year',
		tools: ['Glyphs (primary)', 'Python scripting', 'UFO', 'fontmake'],
		faculty: [
			{
				name: 'Gerry Leonidas',
				role: 'Professor of Typography (Reading 1998–; former ATypI President)',
				confidence: 'confirmed'
			},
			{
				name: 'Fiona Ross',
				role: 'Professor in Type Design (joined 2003; ex-Linotype non-Latin lead 1978–89)',
				confidence: 'confirmed'
			}
		],
		whyPatensCares:
			"The gold-standard MA. Leonidas's Greek-type-design primer is already in Patens's citation corpus. Ross's non-Latin expertise overlaps with the multi-script research at docs/research/multi-script-canon.md.",
		tradition: 'British type tradition; alumni in foundries globally.',
		url: 'https://www.reading.ac.uk/typography',
		confidence: 'confirmed'
	},
	{
		id: 'kabk-type-and-media',
		index: 2,
		name: 'Type and Media',
		institution: 'Royal Academy of Art (KABK)',
		city: 'The Hague',
		country: 'Netherlands',
		countryCode: 'NL',
		established: 1995,
		format: 'MA',
		length: '1 year',
		cohortSize: '12 (cap)',
		tools: [
			'RoboFont (heavily)',
			'Python from week one',
			'DrawBot',
			'UFO native',
			'fontmake'
		],
		faculty: [
			{
				name: 'Erik van Blokland',
				role: 'Head of program, LettError co-founder, UFO + WOFF co-author',
				confidence: 'confirmed'
			},
			{
				name: 'Just van Rossum',
				role: 'DrawBot + RoboFab + FontTools/TTX co-creator',
				confidence: 'confirmed'
			}
		],
		whyPatensCares:
			"The spiritual home of open-tool + open-spec type design. Van Blokland is a key open-standards advocate — the kind of educator who would write a credible NLnet letter of support. Noordzij's stroke theory tradition is the pedagogical backbone Patens's audit module respects.",
		tradition: 'Gerrit Noordzij stroke tradition. Open-source-aligned by lineage.',
		url: 'https://typemedia.org/',
		confidence: 'confirmed'
	},
	{
		id: 'anrt-nancy',
		index: 3,
		name: 'Atelier National de Recherche Typographique (ANRT)',
		institution: 'École nationale supérieure d\'art et de design de Nancy',
		city: 'Nancy',
		country: 'France',
		countryCode: 'FR',
		established: 1985,
		format: 'Postgraduate Research',
		length: '2 years',
		cohortSize: '6 / cohort',
		tools: [
			'Tool-agnostic',
			'Heavy programming + custom workflows',
			'Historical-revival research'
		],
		faculty: [
			{
				name: 'Thomas Huot-Marchand',
				role: 'Director',
				confidence: 'likely'
			}
		],
		whyPatensCares:
			"Research-oriented (gotico-antiqua project, Sigilla, others) — the kind of work that benefits from documented, citable audit rules. Notably contemporaneous with Noordzij's Stroke (both 1985).",
		tradition: 'French research-typography tradition; Cnap network.',
		url: 'http://anrt-nancy.fr/',
		confidence: 'confirmed'
	},
	{
		id: 'esadtype-amiens',
		index: 4,
		name: 'EsadType: Post-diplôme Typographie & Langage',
		institution: 'ESAD Amiens',
		city: 'Amiens',
		country: 'France',
		countryCode: 'FR',
		established: 2005,
		format: 'Postgraduate Research',
		length: '18 months',
		cohortSize: '6–10 / cohort',
		tools: ['Glyphs (primary)', 'DrawBot Python', 'Calligraphy + sign-painting'],
		faculty: [
			{
				name: 'Sébastien Morlighem',
				role: 'Coordinator; lecturer-researcher',
				confidence: 'confirmed'
			},
			{
				name: 'Patrick Doan',
				role: 'Lecturer-researcher',
				confidence: 'confirmed'
			}
		],
		whyPatensCares:
			'Bilingual French/English program with calligraphy-first emphasis maps cleanly to the Noordzij stroke pedagogy Patens references. New session starts September 2026 — outreach timing aligns.',
		url: 'https://esad-amiens.fr/',
		confidence: 'confirmed'
	},
	{
		id: 'ecal-lausanne',
		index: 5,
		name: 'Master Type Design',
		institution: 'ECAL Lausanne',
		city: 'Lausanne',
		country: 'Switzerland',
		countryCode: 'CH',
		established: 2016,
		format: 'MA',
		length: '2 years',
		cohortSize: '~10 / year',
		tools: ['Glyphs (primary)', 'Multi-script emphasis', 'Collective + personal projects'],
		faculty: [
			{
				name: 'Marie Lusa',
				role: 'Professor in the Master Type Design department',
				confidence: 'confirmed'
			}
		],
		whyPatensCares:
			"Switzerland's only Master in Type Design. Multi-script emphasis aligns with Patens's existing Cyrillic + Greek demo coverage. Visiting faculty (Porchez, Kupferschmid) provide a wider European foundry network.",
		tradition: 'Swiss design tradition; multi-script-aware.',
		url: 'https://www.ecal.ch/en/studies/master/type-design',
		confidence: 'confirmed'
	},
	{
		id: 'plantin-antwerp',
		index: 6,
		name: 'Expert Class Type Design',
		institution: 'Plantin Institute of Typography',
		city: 'Antwerp',
		country: 'Belgium',
		countryCode: 'BE',
		established: 1996,
		format: 'Certificate',
		length: '9 months (part-time)',
		cohortSize: '16',
		tools: ['Glyphs / FontLab (student preference)', 'Historical revival using Plantin-Moretus collection'],
		faculty: [
			{
				name: 'Jeremy Tankard',
				role: 'Lead (took over autumn 2025 from Frank Blokland after 15 years)',
				confidence: 'confirmed'
			}
		],
		whyPatensCares:
			"Plantin-Moretus is a UNESCO site and Europe's most concrete connection between historical printing and contemporary practice. Collection-based pedagogy maps cleanly to Patens's canonical-library framing. Tankard is publicly reachable.",
		tradition: 'Historical revival from primary punches + matrices. Hands-on with the source material.',
		url: 'https://www.plantin.org/',
		confidence: 'confirmed'
	},
	{
		id: 'type-cooper-nyc',
		index: 7,
		name: 'Type@Cooper Extended Program',
		institution: 'The Cooper Union',
		city: 'New York City',
		country: 'United States',
		countryCode: 'US',
		established: 2010,
		format: 'Certificate',
		length: '3 terms × 10 weeks',
		cohortSize: 'Up to 14 online / 16 in-person',
		tools: ['Glyphs (primary)', 'Python electives', 'Lettering + calligraphy heavy'],
		faculty: [
			{
				name: 'Sara Soueidan, Cara Di Edwardo, Hannes Famira, Juan Villanueva, others',
				role: 'Rotating faculty + visiting',
				confidence: 'likely'
			}
		],
		whyPatensCares:
			'Cheaper + shorter than Reading/KABK; reaches the New York design community + adjacent typography scenes. Hosts Type@Cooper Online which makes type-design education accessible to designers worldwide.',
		url: 'https://coopertype.org/',
		confidence: 'confirmed'
	},
	{
		id: 'type-west-letterform',
		index: 8,
		name: 'Type West',
		institution: 'Letterform Archive',
		city: 'San Francisco (+ online)',
		country: 'United States',
		countryCode: 'US',
		established: 2018,
		format: 'Certificate',
		length: '1 year',
		cohortSize: '~15 / year',
		tools: ['Glyphs', 'Python', 'UFO'],
		faculty: [
			{
				name: 'James Edmondson',
				role: 'Founder + lead instructor (OH no Type Co.)',
				confidence: 'confirmed'
			}
		],
		whyPatensCares:
			'Letterform Archive is the West Coast counterpart to Cooper Union\'s collection. Edmondson is a working foundry director (OH no Type Co.) who actively teaches — exactly the kind of educator who tests new tools in their workflow.',
		tradition: 'San Francisco design scene; tied to Letterform Archive\'s collection.',
		url: 'https://letterformarchive.org/type-west/',
		confidence: 'confirmed'
	},
	{
		id: 'eina-barcelona',
		index: 9,
		name: 'Máster en Tipografía Avanzada y Diseño de Página',
		institution: 'EINA Centre Universitari de Disseny i Art de Barcelona',
		city: 'Barcelona',
		country: 'Spain',
		countryCode: 'ES',
		established: 2010,
		format: 'MA',
		length: '1 year',
		cohortSize: '~12–15',
		tools: ['Glyphs', 'Spanish-language instruction'],
		faculty: [
			{
				name: 'Various — see program page',
				role: 'Coordinated by EINA faculty',
				confidence: 'uncertain'
			}
		],
		whyPatensCares:
			"Spain's primary type-design master. Spanish-language instruction reaches the Latin American + Iberian designer audience, where Patens's /es marketing surface is already positioned (voseo voice). Catalan + Castilian language considerations are non-trivial for multi-script work.",
		url: 'https://www.eina.cat/',
		confidence: 'likely'
	},
	{
		id: 'typeparis',
		index: 10,
		name: 'TypeParis Summer Intensive',
		institution: 'TypeParis',
		city: 'Paris',
		country: 'France',
		countryCode: 'FR',
		established: 2013,
		format: 'Intensive',
		length: '5 weeks (summer)',
		cohortSize: '~30',
		tools: ['Glyphs (primary)', 'Calligraphy', 'Type-history workshops'],
		faculty: [
			{
				name: 'Jean-Baptiste Levée',
				role: 'Director (Production Type founder)',
				confidence: 'confirmed'
			}
		],
		whyPatensCares:
			'Summer intensive draws international designers + working professionals. Levée\'s Production Type studio is a contemporary foundry-of-record. The 30-person cohort size makes it the largest concentrated outreach surface in the European calendar.',
		url: 'https://typeparis.com/',
		confidence: 'confirmed'
	}
];

/** Program lookup by id. */
export const programById = (id: string): EducationProgram | undefined =>
	PROGRAMS.find((p) => p.id === id);

/** Programs grouped by region (Europe / North America). */
export const programsByRegion = (): {
	'Europe': EducationProgram[];
	'North America': EducationProgram[];
} => {
	const europe: EducationProgram[] = [];
	const northAmerica: EducationProgram[] = [];
	for (const p of PROGRAMS) {
		if (['US', 'CA'].includes(p.countryCode)) northAmerica.push(p);
		else europe.push(p);
	}
	return { Europe: europe, 'North America': northAmerica };
};
