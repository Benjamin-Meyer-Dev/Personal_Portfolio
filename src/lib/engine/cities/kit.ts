import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { canvasEl } from '../colour.ts';
import { clamp, mulberry32 } from '../util.ts';
import type { City } from './City.ts';
import { cssColour, hexColour, withAlpha } from '#lib/styles/tokens.ts';

/* The studio model palette */
export const modelColours = {
	white: hexColour('--model-white'),
	paper: hexColour('--model-paper'),
	pale: hexColour('--model-pale'),
	mid: hexColour('--model-mid'),
	ink: hexColour('--model-ink'),
	blue: hexColour('--model-blue'),
	amber: hexColour('--model-amber'),
	red: hexColour('--model-red'),
	violet: hexColour('--model-violet'),
	mint: hexColour('--model-mint')
};

export function css(hex: number, alpha = 1): string {
	const colour = new THREE.Color(hex);
	const channels = [colour.r, colour.g, colour.b].map((channel) =>
		Math.round(channel * 255)
			.toString(16)
			.padStart(2, '0')
	);

	return withAlpha(`#${channels.join('')}`, alpha);
}

/* Matte white card or any palette colour */
export function modelMat(
	city: City,
	color: number = modelColours.white
): THREE.MeshStandardMaterial {
	return city.track(new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0 }));
}

export function lineMat(city: City, color: number, opacity = 0.55): THREE.LineBasicMaterial {
	return city.track(new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
}

/* A shape in white card with its edges drawn in a colour */
export function edged(
	city: City,
	geo: THREE.BufferGeometry,
	color: number,
	face: number = modelColours.white
): THREE.Group {
	const group = new THREE.Group();
	const mesh = new THREE.Mesh(geo, modelMat(city, face));
	mesh.castShadow = true;

	const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), lineMat(city, color));
	group.add(mesh, edges);
	group.userData.mesh = mesh;
	group.userData.edges = edges;

	return group;
}

/* A box building stading on the city disc */
export function bldg(
	width: number,
	height: number,
	depth: number,
	x: number,
	z: number,
	ry = 0,
	y0 = 0.14
) {
	const geometry = new THREE.BoxGeometry(width, height, depth);
	const uv = geometry.attributes.uv;

	for (let face = 0; face < 6; face++) {
		for (let vertex = 0; vertex < 4; vertex++) {
			const i = face * 4 + vertex;

			if (face === 2 || face === 3) {
				uv.setXY(i, 0.01, 0.01);
			} else {
				uv.setXY(i, uv.getX(i) * (face < 2 ? depth : width) * 2.2, uv.getY(i) * height * 2.4);
			}
		}
	}

	geometry.rotateY(ry);
	geometry.translate(x, y0 + height / 2, z);

	return geometry;
}

export type FacadeStyle = 'office' | 'server' | 'glass' | 'house' | 'stands';

/* Windows on white card */
export function facadeTexture(style: FacadeStyle, seed: number, lit: [string, string]) {
	const canvas = canvasEl(64, 128);
	const ctx = canvas.getContext('2d')!;
	const rnd = mulberry32(seed);

	ctx.fillStyle = cssColour('--model-white');
	ctx.fillRect(0, 0, 64, 128);

	const unlit = cssColour('--window-unlit');

	if (style === 'server') {
		for (let y = 6; y < 120; y += 10) {
			ctx.fillStyle = cssColour('--facade-server');
			ctx.fillRect(3, y - 3, 58, 7);

			for (let x = 6; x < 60; x += 6) {
				const roll = rnd();
				ctx.fillStyle = roll < 0.5 ? lit[0] : roll < 0.62 ? lit[1] : unlit;
				ctx.fillRect(x, y - 1, 3, 2);
			}
		}
	} else if (style === 'glass') {
		for (let x = 2; x < 62; x += 8) {
			ctx.fillStyle = cssColour('--facade-glass');
			ctx.fillRect(x, 0, 6, 124);
		}

		for (let y = 4; y < 122; y += 6) {
			for (let x = 2; x < 62; x += 8) {
				if (rnd() < 0.42) {
					ctx.fillStyle = rnd() < 0.7 ? lit[0] : lit[1];
					ctx.fillRect(x + 1, y, 4, 3);
				}
			}
		}
	} else if (style === 'house') {
		for (let x = 10; x < 60; x += 22) {
			if (rnd() < 0.8) {
				ctx.fillStyle = lit[0];
				ctx.fillRect(x, 48, 10, 12);
			}
		}
	} else if (style === 'stands') {
		for (let y = 6; y < 122; y += 6) {
			for (let x = 2; x < 62; x += 4) {
				if (rnd() < 0.55) {
					ctx.fillStyle = rnd() < 0.8 ? lit[0] : lit[1];
					ctx.fillRect(x, y, 2, 2);
				}
			}
		}
	} else {
		for (let y = 4; y < 122; y += 8) {
			for (let x = 4; x < 60; x += 8) {
				const roll = rnd();
				ctx.fillStyle = roll < 0.2 ? lit[0] : roll < 0.28 ? lit[1] : unlit;
				ctx.fillRect(x, y, 5, 4);
			}
		}
	}

	const texture = new THREE.CanvasTexture(canvas);
	texture.colorSpace = THREE.SRGBColorSpace;
	texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

	return texture;
}

/* Merge many building into one mesh with their outlines */
export function cityMesh(
	city: City,
	geos: THREE.BufferGeometry[],
	tex: THREE.Texture,
	edgeColour: number,
	edgeOpacity = 0.3
) {
	const geo = mergeGeometries(geos);

	for (const building of geos) {
		building.dispose();
	}

	const mat = city.track(
		new THREE.MeshStandardMaterial({
			color: hexColour('--white'),
			map: tex,
			roughness: 0.8,
			metalness: 0
		})
	);
	const mesh = new THREE.Mesh(geo, mat);
	mesh.castShadow = true;

	const edges = new THREE.LineSegments(
		new THREE.EdgesGeometry(geo, 30),
		lineMat(city, edgeColour, edgeOpacity)
	);

	city.group.add(mesh, edges);

	return { mesh, mat, edges };
}

/* Buildings near the front of a city are kept lower so they don't hide the rest from the camera */
export function frontLow(z: number, radius: number): number {
	const front = clamp((z / radius + 0.2) / 1.1, 0, 1);
	return 1 - 0.68 * front;
}

/* A stable number from a string for seeding */
export function hashStr(text: string): number {
	let hash = 2166136261;

	for (let i = 0; i < text.length; i++) {
		hash ^= text.charCodeAt(i);
		hash = Math.imul(hash, 16777619);
	}

	return hash >>> 0;
}
