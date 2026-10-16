import * as THREE from 'three';
import { canvasEl, flatMat } from '../colour.ts';
import type { Layout } from '../layout.ts';
import type { Part } from '../MapScene.ts';
import { bandGeo, inPoly, offsetPts, pushOut, ringGeo, shapeFrom, type Pt } from './geometry.ts';
import { cssColour, hexColour } from '#lib/styles/tokens.ts';
import { worldRandom } from './seed.ts';
import { clamp } from '../util.ts';

/* Heights of the landscape layers */
export const landLevels = { water: 0.04, top: 0.16, coreElev: 0.3 };

export const lakeColours = {
	land: hexColour('--lake-land'),
	landSide: hexColour('--lake-land-side'),
	sand: cssColour('--lake-sand'),
	water: hexColour('--lake-water'),
	shallow: cssColour('--lake-shallow'),
	deep: cssColour('--lake-water'),
	incident: hexColour('--lake-incident')
};

export interface Lake {
	pts: Pt[];
	cz: number;
	hx: number;
	hz: number;
}

/* A rounded lake with a slightly irregular shore, sized to leave water around every island */
export function lakeOutline(layout: Layout): Lake {
	const hx = layout.xMax + 8.0;
	const zb = layout.zBack + 8.4;
	const zf = layout.zFront + 7.8;
	const cz = (zf - zb) / 2;
	const hz = (zb + zf) / 2;
	const rnd = worldRandom(1);
	const phase = [rnd(), rnd(), rnd(), rnd()].map((value) => value * Math.PI * 2);
	const pts: Pt[] = [];
	const segments = 200;

	for (let i = 0; i < segments; i++) {
		const th = (i / segments) * Math.PI * 2;
		const cosine = Math.cos(th);
		const sine = Math.sin(th);
		const radius = Math.pow(Math.pow(Math.abs(cosine), 4) + Math.pow(Math.abs(sine), 4), -0.25);
		const wob =
			1 +
			0.045 * Math.sin(2 * th + phase[0]) +
			0.03 * Math.sin(3 * th + phase[1]) +
			0.022 * Math.sin(5 * th + phase[2]) +
			0.012 * Math.sin(9 * th + phase[3]);

		pts.push([cosine * radius * hx * wob, cz + sine * radius * hz * wob]);
	}

	return { pts, cz, hx, hz };
}

/* A tiling normal map of small overlapping waves, drifting acorss the water makes ripples */
function rippleTexture(): THREE.CanvasTexture {
	const size = 256;
	const canvas = canvasEl(size, size);
	const ctx = canvas.getContext('2d')!;
	const im = ctx.createImageData(size, size);
	const pixels = im.data;
	const angleStep = (Math.PI * 2) / size;
	const waves = [
		[3, 2, 0.5, 0.3],
		[5, -4, 0.32, 1.7],
		[-7, 9, 0.22, 4.1],
		[11, 13, 0.12, 2.2],
		[-13, 6, 0.1, 5.3],
		[17, -11, 0.07, 0.9],
		[2, 19, 0.06, 3.4],
		[-23, -7, 0.04, 1.1]
	];
	const heightAt = (x: number, y: number) =>
		waves.reduce(
			(sum, wave) => sum + Math.sin(angleStep * (wave[0] * x + wave[1] * y) + wave[3]) * wave[2],
			0
		);

	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const dx = (heightAt(x + 1, y) - heightAt(x - 1, y)) * 9;
			const dy = (heightAt(x, y + 1) - heightAt(x, y - 1)) * 9;
			const normalLength = Math.sqrt(dx * dx + dy * dy + 1);
			const i = (y * size + x) * 4;

			pixels[i] = (-dx / normalLength / 2 + 0.5) * 255;
			pixels[i + 1] = (-dy / normalLength / 2 + 0.5) * 255;
			pixels[i + 2] = (1 / normalLength / 2 + 0.5) * 255;
			pixels[i + 3] = 255;
		}
	}

	ctx.putImageData(im, 0, 0);

	const texture = new THREE.CanvasTexture(canvas);
	texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
	texture.repeat.set(1 / 13, 1 / 13);

	return texture;
}

export interface LakeParts extends Part {
	root: THREE.Group;
	lake: Lake;
	water: THREE.Mesh;
	beachOut: Pt[];
	bounds: { x0: number; x1: number; z0: number; z1: number };
	incident: number;
}

export function buildLake(scene: THREE.Scene, layout: Layout): LakeParts {
	const colours = lakeColours;
	const root = new THREE.Group();

	scene.add(root);

	const lake = lakeOutline(layout);
	const bounds = {
		x0: -(lake.hz + 34),
		x1: lake.hx + 34,
		z0: lake.cz - lake.hz - 30,
		z1: lake.cz + lake.hz + 18
	};
	const board = new THREE.Shape();

	board.moveTo(bounds.x0, -bounds.z0);
	board.lineTo(bounds.x1, -bounds.z0);
	board.lineTo(bounds.x1, -bounds.z1);
	board.lineTo(bounds.x0, -bounds.z1);
	board.holes.push(shapeFrom(lake.pts));

	const boardGeo = new THREE.ExtrudeGeometry(board, {
		depth: landLevels.top + 0.04,
		bevelEnabled: false
	});

	boardGeo.rotateX(-Math.PI / 2);
	boardGeo.translate(0, -0.04, 0);

	const boardMesh = new THREE.Mesh(boardGeo, [
		flatMat(colours.land, { rough: 1 }),
		flatMat(colours.landSide, { rough: 1 })
	]);

	boardMesh.receiveShadow = true;
	root.add(boardMesh);

	const rnd = worldRandom(2);
	const beachPhase = [rnd(), rnd()].map((value) => value * Math.PI * 2);
	const shallowPhase = [rnd(), rnd()].map((value) => value * Math.PI * 2);

	const beachOut = pushOut(
		lake.pts,
		(progress) =>
			2.0 +
			0.25 * Math.sin(progress * Math.PI * 2 * 4 + beachPhase[0]) +
			0.15 * Math.sin(progress * Math.PI * 2 * 9 + beachPhase[1])
	);
	const beach = new THREE.Mesh(
		ringGeo(
			lake.pts,
			beachOut,
			landLevels.top + 0.004,
			colours.sand,
			cssColour('--lake-beach-edge')
		),
		new THREE.MeshStandardMaterial({
			vertexColors: true,
			roughness: 1,
			polygonOffset: true,
			polygonOffsetFactor: -1,
			polygonOffsetUnits: -4
		})
	);

	beach.receiveShadow = true;
	root.add(beach);

	const shallowWidth = (progress: number) =>
		1.8 +
		0.6 * Math.sin(progress * Math.PI * 2 * 3 + shallowPhase[0]) +
		0.3 * Math.sin(progress * Math.PI * 2 * 7 + shallowPhase[1]);
	const fadeWidth = 2.0;
	const smoothStep = (along: number) => along * along * (3 - 2 * along);

	const waterMat = new THREE.MeshStandardMaterial({
		color: colours.water,
		roughness: 0.32,
		metalness: 0,
		normalMap: rippleTexture(),
		normalScale: new THREE.Vector2(0.11, 0.11)
	});

	waterMat.onBeforeCompile = (shader) => {
		shader.vertexShader = shader.vertexShader
			.replace(
				'#include <common>',
				'#include <common>\nattribute float calm;\nvarying float vCalm;'
			)
			.replace('#include <begin_vertex>', '#include <begin_vertex>\nvCalm = calm;');

		shader.fragmentShader = shader.fragmentShader
			.replace('#include <common>', '#include <common>\nvarying float vCalm;')
			.replace('mapN.xy *= normalScale;', 'mapN.xy *= normalScale * (1.0 - vCalm);');
	};

	const xs = lake.pts.map(([x]) => x);
	const zs = lake.pts.map(([, z]) => z);
	const x0 = Math.min(...xs) - 1;
	const x1 = Math.max(...xs) + 1;
	const z0 = Math.min(...zs) - 1;
	const z1 = Math.max(...zs) + 1;
	const waterGeo = new THREE.PlaneGeometry(x1 - x0, z1 - z0, 96, 96);

	waterGeo.rotateX(-Math.PI / 2);
	waterGeo.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);

	const position = waterGeo.attributes.position;
	const uv = waterGeo.attributes.uv;
	const calm = new Float32Array(position.count);

	for (let i = 0; i < position.count; i++) {
		const x = position.getX(i);
		const z = position.getZ(i);

		uv.setXY(i, x, -z);

		let nearest = 0;
		let gap = Infinity;

		lake.pts.forEach(([px, pz], j) => {
			const distance = Math.hypot(px - x, pz - z);

			if (distance < gap) {
				gap = distance;
				nearest = j;
			}
		});

		const depth = inPoly(x, z, lake.pts) ? gap : 0;
		const width = shallowWidth(nearest / lake.pts.length);
		const along = clamp((width + fadeWidth - depth) / fadeWidth, 0, 1);

		calm[i] = 0.9 * smoothStep(along);
	}

	waterGeo.setAttribute('calm', new THREE.BufferAttribute(calm, 1));

	const water = new THREE.Mesh(waterGeo, waterMat);
	water.position.y = landLevels.water;
	water.receiveShadow = true;
	root.add(water);

	const fadeSteps = 8;
	const outlines: Pt[][] = [];
	const shallowColours: string[] = [];
	const alphas: number[] = [];

	for (let step = 0; step <= fadeSteps; step++) {
		const along = step / fadeSteps;

		outlines.push(
			pushOut(lake.pts, (progress) => -shallowWidth(progress) - fadeWidth * (1 - along))
		);
		shallowColours.push(colours.deep);
		alphas.push(smoothStep(along));
	}

	outlines.push(lake.pts, offsetPts(lake.pts, 1.0));
	shallowColours.push(colours.shallow, colours.shallow);
	alphas.push(1, 1);

	const shallows = new THREE.Mesh(
		bandGeo(outlines, landLevels.water + 0.004, shallowColours, alphas),
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
	root.add(shallows);

	const material = water.material as THREE.MeshStandardMaterial;
	const ripples = material.normalMap!;
	const parts: LakeParts = {
		root,
		lake,
		water,
		beachOut,
		bounds,
		incident: 0,
		update(dt) {
			ripples.offset.x = (ripples.offset.x + dt * 0.012) % 1;
			ripples.offset.y = (ripples.offset.y + dt * 0.007) % 1;
			material.color.setHex(parts.incident > 0.3 ? colours.incident : colours.water);
		}
	};

	return parts;
}

/* Is a point on dry land, clear of the lake and beach */
export function onShore(parts: LakeParts, x: number, z: number, margin = 1.4): boolean {
	return !inPoly(x, z, offsetPts(parts.lake.pts, margin));
}
