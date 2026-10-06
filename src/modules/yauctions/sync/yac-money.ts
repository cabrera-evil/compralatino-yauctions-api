import { Prisma } from 'prisma/generated/client';
import type { YacAmount } from '../source/yac-source.types';

const { Decimal } = Prisma;

export const USD_DECIMALS = 2;
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
