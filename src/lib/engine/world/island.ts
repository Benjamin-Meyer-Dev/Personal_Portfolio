import * as THREE from 'three';
import { canvasEl, flatMat, mixHex } from '../colour.ts';
import { cityRadius, landOutline, layoutSizes, type Island, type Layout } from '../layout.ts';
import { bandGeo, offsetPts, pushOut, rrectPts, shapeFrom, wobble, type Pt } from './geometry.ts';
import { landLevels } from './lake.ts';
import { worldRandom } from './seed.ts';
import { cssColour, cssValue, hexColour } from '#lib/styles/tokens.ts';

export const islandStyle = {
	beachTop: 0.12,
	sand: hexColour('--island-sand'),
	sandSide: hexColour('--island-sand-side'),
	grass: hexColour('--island-grass'),
	grassSide: hexColour('--island-grass-side'),
	shallow: cssColour('--island-shallow'),
	water: cssColour('--lake-water')
};

/* One flay layer of the model */
function layerMesh(pts: Pt[], y0: number, y1: number, top: number, side: number, shadows: boolean) {
	const geometry = new THREE.ExtrudeGeometry(shapeFrom(pts), {
		depth: y1 - y0,
		bevelEnabled: false,
		curveSegments: 1
	});

	geometry.rotateX(-Math.PI / 2);
	geometry.translate(0, y0, 0);

	const mesh = new THREE.Mesh(geometry, [
		flatMat(top, { rough: 0.95 }),
		flatMat(side, { rough: 0.95 })
	]);

	mesh.receiveShadow = true;
	mesh.castShadow = shadows;

	return mesh;
}

/* How a stack of layers looks */
export interface LayerStyle {
	elev: number;
	top: number;
	side: number;
	shadows: boolean;
}

export interface LayerOptions extends LayerStyle {
	rnd: () => number;
	mid: number;
	midAmp: number;
	beach: number;
	beachAmp: number;
	lobes?: number;
}

export interface Layers {
	top: Pt[];
	mid: Pt[];
	beach: Pt[];
	midY: number;
	plate: THREE.Mesh;
}

/* Grows a grassy shelf and a beach out from a plateau outline then stacks them */
export function naturalLayers(group: THREE.Group, top: Pt[], options: LayerOptions): Layers {
	const w1 = wobble(options.rnd, options.lobes ?? 3);
	const w2 = wobble(options.rnd, (options.lobes ?? 3) + 2);
	const mid = pushOut(
		top,
		(progress) => options.mid + Math.pow(w1(progress), 1.5) * options.midAmp
	);
	const beach = pushOut(mid, (progress) => options.beach + w2(progress) * options.beachAmp);

	return stackLayers(group, top, mid, beach, options);
}

/* Stacks a plateau on a grassy shelf on a beach */
function stackLayers(
	group: THREE.Group,
	top: Pt[],
	mid: Pt[],
	beach: Pt[],
	options: LayerStyle
): Layers {
	const midY = islandStyle.beachTop + (options.elev - islandStyle.beachTop) * 0.62;

	group.add(
		layerMesh(beach, -0.04, islandStyle.beachTop, islandStyle.sand, islandStyle.sandSide, false)
	);
	group.add(
		layerMesh(
			mid,
			islandStyle.beachTop - 0.02,
			midY,
			islandStyle.grass,
			islandStyle.grassSide,
			options.shadows
		)
	);

	const plate = layerMesh(
		top,
		midY - 0.02,
		options.elev,
		options.top,
		options.side,
		options.shadows
	);

	group.add(plate);

	const fadeSteps = 6;
	const outlines: Pt[][] = [beach];
	const alphas: number[] = [1];

	for (let step = 0; step <= fadeSteps; step++) {
		const along = step / fadeSteps;

		outlines.push(offsetPts(beach, 0.9 + 0.9 * along));
		alphas.push(1 - along * along * (3 - 2 * along));
	}

	const shallowColours = outlines.map((pts) =>
		pts === beach ? islandStyle.shallow : islandStyle.water
	);
	const shallows = new THREE.Mesh(
		bandGeo(outlines, landLevels.water + 0.006, shallowColours, alphas),
		new THREE.MeshStandardMaterial({
			vertexColors: true,
			roughness: 0.4,
			transparent: true,
			opacity: 0.85,
			depthWrite: false,
			polygonOffset: true,
			polygonOffsetFactor: -1,
			polygonOffsetUnits: -4
		})
	);

	shallows.receiveShadow = true;
	group.add(shallows);

	return { top, mid, beach, midY, plate };
}

export interface IslandParts extends Layers {
	island: Island;
	group: THREE.Group;
	trim: THREE.LineBasicMaterial;
	decal: THREE.MeshBasicMaterial;
}

/* The island's name and lot count engraved on the plateau */
function nameDecal(island: Island): THREE.Mesh {
	const canvas = canvasEl(1024, 200);
	const ctx = canvas.getContext('2d')!;
	const tex = new THREE.CanvasTexture(canvas);

	tex.colorSpace = THREE.SRGBColorSpace;
	tex.anisotropy = 8;

	const draw = () => {
		ctx.clearRect(0, 0, 1024, 200);
		ctx.textBaseline = 'middle';

		const name = island.type.name.toUpperCase();
		ctx.font = `700 64px ${cssValue('--sans')}`;

		const fs = Math.min(64, Math.floor((64 * 1000) / Math.max(1, ctx.measureText(name).width)));
		ctx.fillStyle = island.type.ink;
		ctx.font = `700 ${fs}px ${cssValue('--sans')}`;
		ctx.fillText(name, 8, 58);

		const sub = `${island.used} of ${island.total} lots built · ${island.type.sub}`;
		ctx.font = `500 36px ${cssValue('--mono')}`;

		const fs2 = Math.min(36, Math.floor((36 * 1000) / Math.max(1, ctx.measureText(sub).width)));
		ctx.fillStyle = cssColour('--ink-4');
		ctx.font = `500 ${fs2}px ${cssValue('--mono')}`;
		ctx.fillText(sub, 10, 140);

		tex.needsUpdate = true;
	};

	draw();
	document.fonts?.ready.then(draw);

	const decal = new THREE.Mesh(
		new THREE.PlaneGeometry(6.6, 1.29),
		new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
	);

	decal.rotation.x = -Math.PI / 2;

	const sizes = layoutSizes;
	const x = island.x0 + island.sx * (sizes.marg + 3.3);
	const inset = sizes.marg * 0.5 + sizes.band * 0.5;
	const z = island.sz < 0 ? island.z0 - inset : island.z1 - inset;

	decal.position.set(x, island.elev + 0.015, z);

	return decal;
}

export function buildIsland(scene: THREE.Scene, island: Island, shadows: boolean): IslandParts {
	const group = new THREE.Group();
	scene.add(group);

	const rnd = worldRandom(17 + ['cloud', 'work', 'self', 'data'].indexOf(island.type.id) * 31);
	const x0 = Math.min(island.x0, island.x1);
	const x1 = Math.max(island.x0, island.x1);
	const z0 = Math.min(island.z0, island.z1);
	const z1 = Math.max(island.z0, island.z1);
	const corner = layoutSizes.districtCorner;
	const radii = [0, 1, 2, 3].map(() => corner + rnd()) as [number, number, number, number];
	const bumps = wobble(rnd, 4);
	const top = pushOut(rrectPts(x0, z0, x1, z1, radii, 220), (progress) => bumps(progress) * 0.35);
	const beach = landOutline(island.land, 220, wobble(rnd, 3));
	const sand = wobble(rnd, 5);
	const mid = pushOut(beach, (progress) => -(0.5 + 0.35 * sand(progress)));
	const topCol = mixHex(hexColour('--island-top'), island.type.accent, 0.22);
	const sideCol = mixHex(topCol, hexColour('--island-side-shade'), 0.14);
	const layers = stackLayers(group, top, mid, beach, {
		elev: island.elev,
		top: topCol,
		side: sideCol,
		shadows
	});
	const trimPts = top.map(([x, z]) => new THREE.Vector3(x, island.elev + 0.012, z));
	const trim = new THREE.LineBasicMaterial({
		color: island.type.accent,
		transparent: true,
		opacity: 0.5
	});

	group.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(trimPts), trim));

	const decal = nameDecal(island);
	group.add(decal);

	return { ...layers, island, group, trim, decal: decal.material as THREE.MeshBasicMaterial };
}

/* The capital plateau's radius */
function capitalRadius(layout: Layout): number {
	const core = layout.sites[0];
	return cityRadius(core) * core.scale + 0.45;
}

/* The small round island in the middle where the capital stands */
export function buildCapitalIsland(scene: THREE.Scene, layout: Layout, shadows: boolean): Layers {
	const radius = capitalRadius(layout);
	const rnd = worldRandom(77);
	const bumps = wobble(rnd);
	const pts: Pt[] = [];

	for (let i = 0; i < 120; i++) {
		const th = (i / 120) * Math.PI * 2;
		const distance = radius + 0.12 * bumps(i / 120);

		pts.push([Math.cos(th) * distance, Math.sin(th) * distance]);
	}

	const group = new THREE.Group();
	scene.add(group);

	return naturalLayers(group, pts, {
		elev: landLevels.coreElev,
		top: hexColour('--island-side'),
		side: mixHex(hexColour('--island-side'), hexColour('--island-side-shade'), 0.16),
		rnd,
		shadows,
		mid: 0.26,
		midAmp: 0.22,
		beach: 0.24,
		beachAmp: 0.2
	});
}
