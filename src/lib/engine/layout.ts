import { projectTypes, lotsFor } from '#lib/data/index.ts';
import type { Project, ProjectType, TypeId } from '#lib/data/index.ts';

/* Sizes in world units, one unit is roughly one city block */
export const layoutSizes = {
	lot: 6.0,
	corr: 1.5,
	marg: 0.6,
	rowGap: 0.4,
	aveX: 3.9,
	aveZ: 3.4,
	band: 1.5,
	scale: 0.84
};

/* Which quadrant each island sits in */
export const islandSide: Record<TypeId, [number, number]> = {
	cloud: [-1, -1],
	work: [1, -1],
	data: [-1, 1],
	self: [1, 1]
};

/* Islands sit at slightly different heights */
export const islandElev: Record<TypeId, number> = {
	cloud: 0.42,
	work: 0.56,
	data: 0.36,
	self: 0.46
};

export interface Lot {
	island: Island;
	idx: number;
	row: number;
	col: number;
	x: number;
	z: number;
	projectId: string | null;
}

export interface Island {
	type: ProjectType;
	sx: number;
	sz: number;
	rows: number;
	width: number;
	depth: number;
	elev: number;
	used: number;
	total: number;
	x0: number;
	x1: number;
	z0: number;
	z1: number;
	spineX: number;
	rowStart: number;
	lots: Lot[];
}

/* A spot on the map where a city stands */
export interface Site {
	id: string;
	type: TypeId | null;
	x: number;
	z: number;
	radius: number;
	labelY: number;
	focus: { distance: number; ty: number; el: number };
	scale: number;
	elev: number;
	lot: Lot | null;
	preview: boolean;
}

export interface Layout {
	islands: Island[];
	sites: Site[];
	freeLots: Lot[];
	xMax: number;
	zBack: number;
	zFront: number;
}

export function layoutProjects(list: Project[], opts: { coreElev?: number } = {}): Layout {
	const sizes = layoutSizes;
	const islands: Island[] = [];
	const freeLots: Lot[] = [];
	const sites: Site[] = [
		{
			id: 'core',
			type: null,
			x: 0,
			z: 0,
			radius: 1.5,
			labelY: 3.45,
			focus: { distance: 9, ty: 2.4, el: 0.4 },
			scale: sizes.scale,
			elev: opts.coreElev ?? 0,
			lot: null,
			preview: false
		}
	];

	for (const type of projectTypes) {
		const members = list.filter((project) => project.type === type.id);
		const [sx, sz] = islandSide[type.id];
		const rows = lotsFor(members.length) / 2;
		const width = 2 * sizes.marg + 2 * sizes.lot + sizes.corr;
		const depth = 2 * sizes.marg + sizes.band + rows * sizes.lot + (rows - 1) * sizes.rowGap;
		const elev = islandElev[type.id];
		const rowStart = sizes.aveZ + sizes.marg + (sz < 0 ? sizes.band : 0);

		const island: Island = {
			type,
			sx,
			sz,
			rows,
			width,
			depth,
			elev,
			used: members.length,
			total: rows * 2,
			x0: sx * sizes.aveX,
			x1: sx * (sizes.aveX + width),
			z0: sz * sizes.aveZ,
			z1: sz * (sizes.aveZ + depth),
			spineX: sx * (sizes.aveX + sizes.marg + sizes.lot + sizes.corr / 2),
			rowStart,
			lots: []
		};

		for (let lotIndex = 0; lotIndex < rows * 2; lotIndex++) {
			const row = Math.floor(lotIndex / 2);
			const col = lotIndex % 2;
			const project = members[lotIndex];
			const lot: Lot = {
				island,
				idx: lotIndex,
				row,
				col,
				x: sx * (sizes.aveX + sizes.marg + sizes.lot / 2 + col * (sizes.lot + sizes.corr)),
				z: sz * (rowStart + sizes.lot / 2 + row * (sizes.lot + sizes.rowGap)),
				projectId: project ? project.id : null
			};

			island.lots.push(lot);

			if (project) {
				sites.push({
					id: project.id,
					type: type.id,
					x: lot.x,
					z: lot.z,
					radius: project.map?.radius ?? 1.8,
					labelY: project.map?.labelY ?? 2.5,
					focus: project.map?.focus ?? { distance: 8.5, ty: 1.0, el: 0.5 },
					scale: sizes.scale,
					elev,
					lot,
					preview: Boolean(project.preview)
				});
			} else {
				freeLots.push(lot);
			}
		}

		islands.push(island);
	}

	let xMax = 0;
	let zBack = 0;
	let zFront = 0;

	for (const island of islands) {
		xMax = Math.max(xMax, Math.abs(island.x1));

		if (island.sz < 0) {
			zBack = Math.max(zBack, Math.abs(island.z1));
		} else {
			zFront = Math.max(zFront, Math.abs(island.z1));
		}
	}

	return { islands, sites, freeLots, xMax, zBack, zFront };
}

/* The island under a point */
export function islandAt(layout: Layout, x: number, z: number): Island | null {
	return (
		layout.islands.find(
			(island) =>
				x >= Math.min(island.x0, island.x1) &&
				x <= Math.max(island.x0, island.x1) &&
				z >= Math.min(island.z0, island.z1) &&
				z <= Math.max(island.z0, island.z1)
		) ?? null
	);
}

/* Height of the ground at a point (0 over water) */
export function groundAt(layout: Layout, x: number, z: number): number {
	return islandAt(layout, x, z)?.elev ?? 0;
}
