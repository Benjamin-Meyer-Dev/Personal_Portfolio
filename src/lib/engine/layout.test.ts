import { describe, expect, it } from 'vitest';
import { projectList } from '#lib/data/index.ts';
import {
	distrcitFits,
	groundAt,
	islandAt,
	landOutline,
	layoutProjects,
	layoutSizes
} from './layout.ts';
import { mulberry32 } from './util.ts';

describe('layoutProjects', () => {
	const layout = layoutProjects(projectList());

	it('makes one island per project type', () => {
		expect(layout.islands.map((island) => island.type.id)).toEqual([
			'cloud',
			'work',
			'data',
			'self'
		]);
	});

	it('puts the capital in the middle and a site for every project', () => {
		expect(layout.sites[0]).toMatchObject({ id: 'core', x: 0, z: 0 });
		expect(layout.sites).toHaveLength(projectList().length + 1);
	});

	it('places the first cloud lot in the back-left quadrant, on its district', () => {
		const island = layout.islands[0];
		const lot = island.lots[0];

		expect(lot.x).toBeLessThan(0);
		expect(lot.z).toBeLessThan(0);
		expect(islandAt(layout, lot.x, lot.z)).toBe(island);
		expect(lot.projectId).toBe('chaos');
	});

	it('gives every island the same size of land', () => {
		for (const island of layout.islands) {
			expect(island.land.hx).toBe(layout.islands[0].land.hx);
			expect(island.land.hz).toBe(layout.islands[0].land.hz);
		}
	});

	it('keeps at least one free lot on every island', () => {
		for (const island of layout.islands) {
			expect(island.total - island.used, island.type.id).toBeGreaterThan(0);
		}

		expect(layout.freeLots.length).toBeGreaterThan(0);
	});

	it('grows every island when one distrcit needs another row', () => {
		const before = layout.islands.find((island) => island.type.id === 'self')!;
		const grownLayout = layoutProjects(projectList(3));
		const grown = grownLayout.islands.find((island) => island.type.id === 'self')!;

		expect(before.used).toBe(3);
		expect(before.rows).toBe(2);
		expect(grown.used).toBe(4);
		expect(grown.rows).toBe(3);

		for (const island of grownLayout.islands) {
			expect(island.land.hz).toBeGreaterThan(before.land.hz);
		}
	});

	it('keeps the islands in their quadrants, clear of the channels and the capital on any visit', () => {
		for (let seed = 1; seed <= 200; seed++) {
			const random = layoutProjects(projectList(), { rnd: mulberry32(seed) });

			for (const island of random.islands) {
				const shore = landOutline(island.land, 120);

				for (const [x, z] of shore) {
					expect(island.sx * x).toBeGreaterThanOrEqual(layoutSizes.aveX - 1e-6);
					expect(island.sz * z).toBeGreaterThanOrEqual(layoutSizes.aveZ - 1e-6);
					expect(Math.hypot(x, z)).toBeGreaterThanOrEqual(layoutSizes.capitalRoom - 1e-6);
				}

				const midX = (island.x0 + island.x1) / 2;
				const midZ = (island.z0 + island.z1) / 2;

				expect(
					distrcitFits(island.land, midX, midZ, island.width, island.depth, layoutSizes.shoreRoom),
					`seed ${seed}, ${island.type.id}`
				).toBe(true);
			}

			expect(random.xMax).toBeCloseTo(layout.xMax);
		}
	});

	it('knows the ground height', () => {
		const lot = layout.islands[0].lots[0];

		expect(islandAt(layout, lot.x, lot.z)?.type.id).toBe('cloud');
		expect(groundAt(layout, lot.x, lot.z)).toBe(layout.islands[0].elev);
		expect(groundAt(layout, 0, 0)).toBe(0);
	});
});
