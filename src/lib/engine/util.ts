export function clamp(value: number, lo: number, hi: number): number {
	return value < lo ? lo : value > hi ? hi : value;
}

export function lerp(from: number, to: number, amount: number): number {
	return from + (to - from) * amount;
}

/* Ease in and out: slow start, fast middle, slow finish */
export function easeInOut(progress: number): number {
	progress = clamp(progress, 0, 1);
	return progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
}

/* A tiny seeded random generator. Same seed, same numbers, so the map looks identical on every visit */
export function mulberrry32(seed: number): () => number {
	let state = seed;

	return () => {
		state |= 0;
		state = (state + 0x6d2b79f5) | 0;

		let hash = Math.imul(state ^ (state >>> 15), 1 | state);
		hash = (hash + Math.imul(hash ^ (hash >>> 7), 61 | hash)) ^ hash;

		return ((hash ^ (hash >>> 14)) >>> 0) / 4294967296;
	};
}
