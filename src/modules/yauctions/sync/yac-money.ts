import { Prisma } from 'prisma/generated/client';
import type { YacAmount } from '../source/yac-source.types';

const { Decimal } = Prisma;

export const USD_DECIMALS = 2;
const MONEY_INTEGER_LIMIT = new Decimal(10).pow(12);
const JPY_INTEGER_LIMIT = new Decimal(10).pow(16);
export const JPY_DECIMALS = 0;

export type ConvertedAmount = {
	source: Prisma.Decimal;
	usd: Prisma.Decimal;
	jpy: Prisma.Decimal;
};

export const toDecimal = (
	amount: YacAmount | undefined
): Prisma.Decimal | null => {
	if (amount === null || amount === undefined || amount === '') return null;
	try {
		const value = new Decimal(String(amount));
		return value.isFinite() && !value.isNegative() ? value : null;
	} catch {
		return null;
	}
};

// Raw source amounts must fit DECIMAL(14,2) exactly; they are never rounded to fit.
export const fitsSourceAmount = (value: Prisma.Decimal): boolean =>
	value.decimalPlaces() <= 2 && value.lt(MONEY_INTEGER_LIMIT);

// Converted amounts must fit DECIMAL(14,2) (USD) and DECIMAL(16,0) (JPY).
export const fitsConverted = (amount: ConvertedAmount): boolean =>
	amount.usd.lt(MONEY_INTEGER_LIMIT) && amount.jpy.lt(JPY_INTEGER_LIMIT);

export type FxRates = { sourceToUsd: Prisma.Decimal; usdToJpy: Prisma.Decimal };

export const parseRates = (sourceToUsd: string, usdToJpy: string): FxRates => ({
	sourceToUsd: new Decimal(sourceToUsd),
	usdToJpy: new Decimal(usdToJpy),
});

// Assumption: USD keeps 2 dp and JPY 0 dp (ISO 4217), rounded half-up; JPY derives from the unrounded USD value.
export const convertAmount = (
	source: Prisma.Decimal,
	rates: FxRates
): ConvertedAmount => {
	const exactUsd = source.mul(rates.sourceToUsd);
	return {
		source: source.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
		usd: exactUsd.toDecimalPlaces(USD_DECIMALS, Decimal.ROUND_HALF_UP),
		jpy: exactUsd
			.mul(rates.usdToJpy)
			.toDecimalPlaces(JPY_DECIMALS, Decimal.ROUND_HALF_UP),
	};
};
