import * as THREE from 'three';
import type { Placard } from './placards.ts';

const candidtateOffsets: [number, number][] = [
	[0, 0],
	[1, 0],
	[0, -0.56],
	[0, 0.56],
	[1, -0.56],
	[1, 0.56],
	[2, 0],
	[2, -0.56],
	[2, 0.56],
	[0, -1.1],
	[0, 1.1]
];

type Box = [number, number, number, number];

const cardBottom = new THREE.Vector3();
const cardTop = new THREE.Vector3();

export function declutter(
	placards: Placard[],
	camera: THREE.Camera,
	width: number,
	height: number,
	topLimit: number,
	sideLimit = 8
): void {
	const items: { placard: Placard; x: number; y: number; width: number; height: number }[] = [];

	for (const placard of placards) {
		if (!placard.root.visible || placard.op < 0.25) {
			placard.lift = 0;
			placard.slide = 0;
			continue;
		}

		const city = placard.city;
		const bx = city.site.x;
		const bz = city.site.z + placard.root.position.z * city.scale;
		const by = city.elev + (0.14 + placard.floatH) * city.scale;

		cardBottom.set(bx, by, bz).project(camera);
		cardTop.set(bx, by + placard.height * placard.readScale * city.scale, bz).project(camera);

		if (cardBottom.z > 1) {
			continue;
		}

		const hh = (Math.abs(cardBottom.y - cardTop.y) / 2) * height;

		items.push({
			placard,
			x: ((cardBottom.x + 1) / 2) * width,
			y: ((1 - cardBottom.y) / 2) * height,
			width: hh * placard.aspect + 6,
			height: hh + 4
		});
	}

	items.sort((first, second) => second.y - first.y);

	const placed: Box[] = [];

	for (const it of items) {
		let pick = candidtateOffsets[0];
		let best: Box | null = null;
		let bestOver = Infinity;

		for (const candidate of candidtateOffsets) {
			const y1 = it.y - it.height * 0.04 - candidate[0] * it.height * 1.08;
			const y0 = y1 - it.height;
			const cx = it.x + candidate[1] * it.width;
			const x0 = cx - it.width / 2;
			const x1 = cx + it.width / 2;

			if (y0 < topLimit || x0 < sideLimit || x1 > width - sideLimit) {
				continue;
			}

			let over = 0;

			for (const [px0, py0, px1, py1] of placed) {
				const ox = Math.min(x1, px1) - Math.max(x0, px0);
				const oy = Math.min(y1, py1) - Math.max(y0, py0);

				if (ox > 0 && oy > 0) {
					over += ox * oy;
				}
			}

			if (over === 0) {
				pick = candidate;
				best = [x0, y0, x1, y1];
				break;
			}

			if (over < bestOver) {
				pick = candidate;
				best = [x0, y0, x1, y1];
				bestOver = over;
			}
		}

		if (!best) {
			const yb = it.y - it.height * 0.04;
			best = [it.x - it.width / 2, yb - it.height, it.x + it.width / 2, yb];
			pick = candidtateOffsets[0];
		}

		placed.push(best);
		it.placard.lift = pick[0];
		it.placard.slide = pick[1];
	}
}
