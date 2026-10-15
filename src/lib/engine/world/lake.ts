import * as THREE from 'three';
import { canvasEl, flatMat } from '../colour.ts';
import type { Layout } from '../layout.ts';
import type { Part } from '../MapScene.ts';
import { bandGeo, inPoly, offsetPts, pushOut, ringGeo, shapeFrom, type Pt } from './geometry.ts';
import { cssColour, hexColour } from '#lib/styles/tokens.ts';

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
	const hx = layout.xMax + 6.6;
	const zb = layout.zBack + 7.0;
	const zf = layout.zFront + 6.4;
	const cz = (zf - zb) / 2;
	const hz = (zb + zf) / 2;
	const pts: Pt[] = [];
	const segments = 200;

	for (let i = 0; i < segments; i++) {
		const th = (i / segments) * Math.PI * 2;
		const cosine = Math.cos(th);
		const sine = Math.sin(th);
		const radius = Math.pow(Math.pow(Math.abs(cosine), 4) + Math.pow(Math.abs(sine), 4), -0.25);
		const wob =
			1 +
			0.045 * Math.sin(2 * th + 0.7) +
			0.03 * Math.sin(3 * th + 2.1) +
			0.022 * Math.sin(5 * th + 0.3) +
			0.012 * Math.sin(9 * th + 1.3);

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

	const beachOut = pushOut(
		lake.pts,
		(progress) =>
			2.0 +
			0.25 * Math.sin(progress * Math.PI * 2 * 4 + 0.8) +
			0.15 * Math.sin(progress * Math.PI * 2 * 9 + 2.3)
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
		0.6 * Math.sin(progress * Math.PI * 2 * 3 + 2.0) +
		0.3 * Math.sin(progress * Math.PI * 2 * 7 + 0.4);
	const fadeWidth = 2.0;
	const fadeSteps = 8;
	const shoreOutlines: Pt[][] = [];
	const fadeIn: number[] = [];

	for (let step = 0; step <= fadeSteps; step++) {
		const along = step / fadeSteps;

		shoreOutlines.push(
			pushOut(lake.pts, (progress) => -shallowWidth(progress) - fadeWidth * (1 - along))
		);

		fadeIn.push(along * along * (3 - 2 * along));
	}

	shoreOutlines.push(lake.pts);
	fadeIn.push(1);

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

	const openGeo = new THREE.ShapeGeometry(shapeFrom(shoreOutlines[0]));
	openGeo.rotateX(-Math.PI / 2);

	const openCalm = new Array(openGeo.attributes.position.count).fill(0);
	openGeo.setAttribute('calm', new THREE.Float32BufferAttribute(openCalm, 1));

	const shoreGeo = bandGeo(
		shoreOutlines,
		0,
		shoreOutlines.map(() => colours.water),
		fadeIn
	);
	const shoreCalm = shoreOutlines.flatMap((pts, ring) => pts.map(() => fadeIn[ring] * 0.9));
	shoreGeo.setAttribute('calm', new THREE.Float32BufferAttribute(shoreCalm, 1));

	const water = new THREE.Mesh(openGeo, waterMat);
	const waterShore = new THREE.Mesh(shoreGeo, waterMat);

	for (const mesh of [water, waterShore]) {
		mesh.position.y = landLevels.water;
		mesh.receiveShadow = true;
		root.add(mesh);
	}

	const shallowColours = shoreOutlines.map((pts) =>
		pts === lake.pts ? colours.shallow : colours.deep
	);
	const shallows = new THREE.Mesh(
		bandGeo(shoreOutlines, landLevels.water + 0.004, shallowColours, fadeIn),
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
