import * as THREE from 'three';
import { canvasEl } from '../colour.ts';
import { mulberry32 } from '../util.ts';
import type { City } from './City.ts';
import { css, hashStr, modelColours, modelMat } from './kit.ts';
import { cssColour } from '#lib/styles/tokens.ts';

/* The base streets */
export const streets = { count: 9, turn: 0.3 };

/* The pattern on top of the base, a ring road, spoked, a dashed boundary and a scatter of tiny lights */
function groundTexture(city: City): THREE.CanvasTexture {
	const size = 512;
	const half = size / 2;
	const canvas = canvasEl(size, size);
	const ctx = canvas.getContext('2d')!;
	const rnd = mulberry32(hashStr(city.id));

	ctx.fillStyle = cssColour('--city-ground');
	ctx.fillRect(0, 0, size, size);

	const ring = (radius: number, width: number, col: string) => {
		ctx.beginPath();
		ctx.arc(half, half, radius, 0, Math.PI * 2);
		ctx.lineWidth = width;
		ctx.strokeStyle = col;
		ctx.stroke();
	};

	const roadRadius = half * 0.68;
	const step = (Math.PI * 2) / streets.count;

	for (let street = 0; street < streets.count; street++) {
		const angle = streets.turn + (street + 0.5) * step;

		ctx.beginPath();
		ctx.moveTo(half + Math.cos(angle) * half * 0.42, half + Math.sin(angle) * half * 0.42);
		ctx.lineTo(half + Math.cos(angle) * half, half + Math.sin(angle) * half);
		ctx.lineWidth = 10;
		ctx.strokeStyle = cssColour('--city-path');
		ctx.stroke();
	}

	ring(roadRadius, 16, cssColour('--city-road'));

	const dashes = 5;
	const dashArc = (0.45 * step) / (dashes + 1);

	ctx.lineWidth = 3;
	ctx.strokeStyle = css(city.accent, 0.55);

	for (let street = 0; street < streets.count; street++) {
		for (let dash = 1; dash <= dashes; dash++) {
			const middle = streets.turn + (street + 0.5 + dash / (dashes + 1)) * step;
			ctx.beginPath();
			ctx.arc(half, half, roadRadius, middle - dashArc / 2, middle + dashArc / 2);
			ctx.stroke();
		}
	}

	ring(half * 0.42, 3, css(city.accent, 0.35));

	for (let dot = 0; dot < 260; dot++) {
		const radius = half * (0.72 + rnd() * 0.26);
		const angle = rnd() * Math.PI * 2;

		ctx.fillStyle = rnd() < 0.5 ? css(city.accent, 0.5) : css(modelColours.amber, 0.35);
		ctx.fillRect(half + Math.cos(angle) * radius, half + Math.sin(angle) * radius, 2, 2);
	}

	const texture = new THREE.CanvasTexture(canvas);
	texture.colorSpace = THREE.SRGBColorSpace;
	texture.anisotropy = 4;

	return texture;
}

export function buildBase(city: City): void {
	const radius = city.radius;
	const side = modelMat(city, modelColours.paper);
	const top = modelMat(city, modelColours.white);
	const plat = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.04, 0.14, 72), [
		side,
		top,
		top
	]);

	plat.position.y = 0.07;
	plat.castShadow = true;
	plat.receiveShadow = true;
	city.group.add(plat);

	const disc = new THREE.Mesh(
		new THREE.CircleGeometry(radius * 0.985, 72),
		city.track(new THREE.MeshStandardMaterial({ map: groundTexture(city), roughness: 0.9 }))
	);

	disc.rotation.x = -Math.PI / 2;
	disc.position.y = 0.142;
	disc.receiveShadow = true;
	city.group.add(disc);

	const trim = new THREE.Mesh(
		new THREE.RingGeometry(radius * 0.975, radius * 1.005, 128),
		city.track(
			new THREE.MeshBasicMaterial({ color: city.accent, opacity: 0.45, side: THREE.DoubleSide })
		)
	);

	trim.rotation.x = -Math.PI / 2;
	trim.position.y = 0.148;
	city.group.add(trim);

	city.hit = new THREE.Mesh(
		new THREE.CylinderGeometry(radius, radius, 3.4, 16),
		new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })
	);
	city.hit.position.y = 1.7;
	city.hit.userData.cityId = city.id;
	city.group.add(city.hit);
}
