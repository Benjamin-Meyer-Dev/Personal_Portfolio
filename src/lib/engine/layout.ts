import { projectTypes, lotsFor } from '#lib/data/index.ts';
import type { Project, ProjectType, TypeId } from '#lib/data/index.ts';

/* Sizes in world units, one unit is roughly one city block */
export const layoutSizes = {
	lot: 6.0,
	corr: 1.5,
	marg: 0.6,
	rowGap: 0.4,
	aveX: 2.0,
	aveZ: 2.0,
	capitalRoom: 5.6,
	shoreRoom: 2.0,
	landSlack: 0.6,
	districtCorner: 1.6,
	islandShift: 2.5,
	districtShift: 3.0,
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

/* The shape of every island's land */
export const landShape = { power: 3, aspect: 1.15, wobble: 0.03 };

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

export interface Land {
	cx: number;
	cz: number;
	hx: number;
	hz: number;
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
	land: Land;
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

/* A point on a land's oval at angle `th`, `scale` times its size */
export function landPoint(land: Land, th: number, scale = 1): [number, number] {
	const { power } = landShape;
	const cosine = Math.cos(th);
	const sine = Math.sin(th);
	const radius =
		scale *
		Math.pow(
			Math.pow(Math.abs(cosine) / land.hx, power) + Math.pow(Math.abs(sine) / land.hz, power),
			-1 / power
		);

	return [land.cx + cosine * radius, land.cz + sine * radius];
}

/* `count` points round a land's oval */
export function landOutline(
	land: Land,
	count: number,
	bump?: (progress: number) => number
): [number, number][] {
	return Array.from({ length: count }, (_, i) =>
		landPoint(land, (i / count) * Math.PI * 2, 1 + landShape.wobble * (bump ? bump(i / count) : 1))
	);
}

/* Is a point inside a land's oval */
export function inLand(land: Land, x: number, z: number): boolean {
	const { power } = landShape;

	return (
		Math.pow(Math.abs(x - land.cx) / land.hx, power) +
			Math.pow(Math.abs(z - land.cz) / land.hz, power) <=
		1 + 1e-9
	);
}

/* Does a distrcit fit inside a land with room to spare on each side */
export function districtFits(
	land: Land,
	x: number,
	z: number,
	width: number,
	depth: number,
	room: number
): boolean {
	const corner = layoutSizes.districtCorner;

	for (const sx of [-1, 1]) {
		for (const sz of [-1, 1]) {
			for (let step = 0; step <= 12; step++) {
				const th = (step / 12) * (Math.PI / 2);
				const px = x + sx * (width / 2 - corner + (corner + room) * Math.cos(th));
				const pz = z + sz * (depth / 2 - corner + (corner + room) * Math.sin(th));

				if (!inLand(land, px, pz)) {
					return false;
				}
			}
		}
	}

	return true;
}

/* Lays out the islands, their districts and lots and a site for each project */
export function layoutProjects(
	list: Project[],
	opts: { coreElev?: number; rnd?: () => number } = {}
): Layout {
	const sizes = layoutSizes;
	const rnd = opts.rnd ?? (() => 0.5);
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

	const rowsOf = (type: ProjectType) =>
		lotsFor(list.filter((project) => project.type === type.id).length) / 2;
	const depthOf = (rows: number) =>
		2 * sizes.marg + sizes.band + rows * sizes.lot + (rows - 1) * sizes.rowGap;
	const width = 2 * sizes.marg + 2 * sizes.lot + sizes.corr;
	const deepest = Math.max(...projectTypes.map((type) => depthOf(rowsOf(type))));
	const { aspect, wobble } = landShape;
	const ratio = (aspect * width) / deepest;

	let small = 1;
	let big = 60;

	for (let step = 0; step < 40; step++) {
		const half = (small + big) / 2;
		const trial: Land = { cx: 0, cz: 0, hx: ratio * half, hz: half };

		if (districtFits(trial, 0, 0, width, deepest, sizes.shoreRoom + sizes.landSlack)) {
			big = half;
		} else {
			small = half;
		}
	}

	const hz = big;
	const hx = ratio * big;
	const nearX = sizes.aveX + hx * (1 + wobble);
	const nearZ = sizes.aveZ + hz * (1 + wobble);

	for (const type of projectTypes) {
		const members = list.filter((project) => project.type === type.id);
		const [sx, sz] = islandSide[type.id];
		const rows = rowsOf(type);
		const depth = depthOf(rows);
		const elev = islandElev[type.id];

		const land: Land = {
			cx: sx * (nearX + rnd() * sizes.islandShift),
			cz: sz * (nearZ + rnd() * sizes.islandShift),
			hx,
			hz
		};

		for (let step = 0; step < 20; step++) {
			const shore = landOutline(land, 72);
			const closest = Math.min(...shore.map(([x, z]) => Math.hypot(x, z)));

			if (closest >= sizes.capitalRoom) {
				break;
			}

			const push = (sizes.capitalRoom - closest) / Math.SQRT2 + 0.05;
			land.cx += sx * push;
			land.cz += sz * push;
		}

		let dx = (rnd() * 2 - 1) * sizes.districtShift;
		let dz = (rnd() * 2 - 1) * sizes.districtShift;

		const fits = () =>
			districtFits(land, land.cx + dx, land.cz + dz, width, depth, sizes.shoreRoom);

		for (let step = 0; step < 40 && !fits(); step++) {
			dx *= 0.85;
			dz *= 0.85;
		}

		if (!fits()) {
			dx = dz = 0;
		}

		const midX = land.cx + dx;
		const midZ = land.cz + dz;
		const innerX = sx * midX - width / 2;
		const innerZ = sz * midZ - depth / 2;
		const rowStart = innerZ + sizes.marg + (sz < 0 ? sizes.band : 0);

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
			land,
			x0: sx * innerX,
			x1: sx * (innerX + width),
			z0: sz * innerZ,
			z1: sz * (innerZ + depth),
			spineX: sx * (innerX + sizes.marg + sizes.lot + sizes.corr / 2),
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
				x: sx * (innerX + sizes.marg + sizes.lot / 2 + col * (sizes.lot + sizes.corr)),
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

	let xMax = nearX + sizes.islandShift + hx * (1 + wobble);
	let zBack = nearZ + sizes.islandShift + hz * (1 + wobble);
	let zFront = zBack;

	for (const island of islands) {
		const { cx, cz } = island.land;
		xMax = Math.max(xMax, Math.abs(cx) + hx * (1 + wobble));

		if (island.sz < 0) {
			zBack = Math.max(zBack, Math.abs(cz) + hz * (1 + wobble));
		} else {
			zFront = Math.max(zFront, Math.abs(cz) + hz * (1 + wobble));
		}
	}

	return { islands, sites, freeLots, xMax, zBack, zFront };
}

/* Radius of a city's round base */
export function cityRadius(site: Site): number {
	return site.radius + (site.id === 'core' ? 1.1 : 1.15);
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
