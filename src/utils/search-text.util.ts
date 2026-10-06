export const normalizeSearchText = (value: string): string =>
	value
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase()
		.replace(/\s+/g, ' ')
		.trim();

export const buildProductSearchText = (
	title: string,
	categoryLabel: string
): string => normalizeSearchText(`${title} ${categoryLabel}`);

const LIKE_WILDCARDS = /[%_\\]/g;

export const toSearchTerms = (query: string, maxTerms = 10): string[] =>
	normalizeSearchText(query)
		.replace(LIKE_WILDCARDS, '')
		.split(' ')
		.filter(Boolean)
		.slice(0, maxTerms);
