const NAMED_ENTITIES: Record<string, string> = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	nbsp: ' ',
	ndash: '-',
	mdash: '-',
	lsquo: "'",
	rsquo: "'",
	ldquo: '"',
	rdquo: '"',
	hellip: '...',
	deg: '°',
	times: 'x',
};

const BLOCK_BREAKS =
	/<\s*(?:br|\/p|\/div|\/li|\/ul|\/ol|\/tr|\/h[1-6])\b[^>]*>/gi;
const NON_TEXT_BLOCKS = /<\s*(script|style)\b[\s\S]*?<\s*\/\s*\1\s*>/gi;
const TAGS = /<[a-z/!?][^>]*>/gi;
const SURROGATE_START = 0xd800;
const SURROGATE_END = 0xdfff;
const ENTITY = /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi;

const decodeEntity = (match: string, entity: string): string => {
	if (entity[0] === '#') {
		const hex = entity[1].toLowerCase() === 'x';
		const code = parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
		const valid =
			code > 0 &&
			code <= 0x10ffff &&
			!(code >= SURROGATE_START && code <= SURROGATE_END);
		return valid ? String.fromCodePoint(code) : ' ';
	}
	return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
};

// Strip tags, decode entities and re-strip so escaped markup never survives as HTML.
export const htmlToParagraphs = (html?: string | null): string[] => {
	if (!html) return [];
	return html
		.replace(NON_TEXT_BLOCKS, ' ')
		.replace(BLOCK_BREAKS, '\n')
		.replace(TAGS, ' ')
		.replace(ENTITY, decodeEntity)
		.replace(TAGS, ' ')
		.split(/\r?\n/)
		.map((line) => line.replace(/\s+/g, ' ').trim())
		.filter(Boolean);
};
