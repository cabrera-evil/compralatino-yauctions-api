export type YacPhoto = { id: string; label: string; url?: string };

export type YacSpec = { label: string; value: string };

export type YacShippingStage = {
	code: string;
	title: string;
	duration: string;
};

export type YacShipping = {
	deliveryWindow: string;
	pickupPoint: string;
	coverage: string;
	freightNote: string;
	stages: YacShippingStage[];
};

declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace PrismaJson {
		type YacLotPhotos = YacPhoto[];
		type YacLotDescription = string[];
		type YacLotSpecs = YacSpec[];
		type YacLotShipping = YacShipping;
	}
}
