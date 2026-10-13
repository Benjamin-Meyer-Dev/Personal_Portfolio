import { describe, expect, it } from 'vitest';
import { projectList } from '#lib/data/index.ts';
import { layoutSizes, groundAt, islandAt, layoutProjects } from './layout.ts';

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

	it('places the first cloud lot in the back-left quadrant', () => {
		const lot = layout.islands[0].lots[0];

		expect(lot.x).toBeCloseTo(-(layoutSizes.aveX + layoutSizes.marg + layoutSizes.lot / 2));
		expect(lot.z).toBeCloseTo(
			-(layoutSizes.aveZ + layoutSizes.marg + layoutSizes.band + layoutSizes.lot / 2)
		);
		expect(lot.projectId).toBe('chaos');
	});

	it('keeps at least one free lot on every island', () => {
		for (const island of layout.islands) {
			expect(island.total - island.used, island.type.id).toBeGreaterThan(0);
		}

		expect(layout.freeLots.length).toBeGreaterThan(0);
	});

	it('grows an island by a row when it runs out of lots', () => {
		const before = layout.islands.find((island) => island.type.id === 'self')!;
		const grown = layoutProjects(projectList(3)).islands.find(
			(island) => island.type.id === 'self'
		)!;

		expect(before.used).toBe(3);
		expect(before.rows).toBe(2);
		expect(grown.used).toBe(4);
		expect(grown.rows).toBe(3);
		expect(Math.abs(grown.z1)).toBeGreaterThan(Math.abs(before.z1));
	});

	it('knows the ground height', () => {
		const lot = layout.islands[0].lots[0];

		expect(islandAt(layout, lot.x, lot.z)?.type.id).toBe('cloud');
		expect(groundAt(layout, lot.x, lot.z)).toBe(layout.islands[0].elev);
		expect(groundAt(layout, 0, 0)).toBe(0);
	});
});
