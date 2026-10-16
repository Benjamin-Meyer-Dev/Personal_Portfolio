import { mulberry32 } from '../util.ts';

function pickSeed(): number {
	if (typeof location !== 'undefined') {
		const fromAddress = Number(new URLSearchParams(location.search).get('seed'));

		if (Number.isInteger(fromAddress) && fromAddress > 0) {
			return fromAddress;
		}
	}

	return 1 + Math.floor(Math.random() * 1000000);
}

/* This visit's seed */
export const worldSeed = pickSeed();

/* A random source for one part of the landscape */
export function worldRandom(part: number): () => number {
	return mulberry32(worldSeed * 7919 + part);
}
