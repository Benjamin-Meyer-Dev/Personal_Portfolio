import * as THREE from 'three';
import { lerp } from './util.ts';

/* Blend two colours */
export function mixHex(from: number | string, to: number | string, amount: number): number {
	const fromColour = new THREE.Color(from);
	const toColour = new THREE.Color(to);

	return new THREE.Color(
		lerp(fromColour.r, toColour.r, amount),
		lerp(fromColour.g, toColour.g, amount),
		lerp(fromColour.b, toColour.b, amount)
	).getHex();
}

/* The matte painted-card material */
export function flatMat(
	color: number | string,
	opts: { rough?: number; transparent?: boolean; opacity?: number; side?: THREE.Side } = {}
): THREE.MeshStandardMaterial {
	return new THREE.MeshStandardMaterial({
		color,
		roughness: opts.rough ?? 0.85,
		metalness: 0,
		transparent: opts.transparent ?? false,
		opacity: opts.opacity ?? 1,
		side: opts.side ?? THREE.FrontSide
	});
}

/* A blank canvas to draw on */
export function canvasEl(width: number, height: number): HTMLCanvasElement {
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;

	return canvas;
}
