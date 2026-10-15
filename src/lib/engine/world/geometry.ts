import * as THREE from 'three';

export type Pt = [number, number];

/* Is the point inside a polygon */
export function inPoly(x: number, z: number, pts: Pt[]): boolean {
	let inside = false;

	for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
		const [xi, zi] = pts[i];
		const [xj, zj] = pts[j];

		if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) {
			inside = !inside;
		}
	}

	return inside;
}

/* A three.js shape from an outline */
export function shapeFrom(pts: Pt[]): THREE.Shape {
	const shape = new THREE.Shape();
	pts.forEach(([x, z], i) => (i ? shape.lineTo(x, -z) : shape.moveTo(x, -z)));
	return shape;
}

/* Move every point of a closed outline outward by d */
export function offsetPts(pts: Pt[], distance: number): Pt[] {
	return pushOut(pts, () => distance);
}

/* Move every point outward along a normal distance per point */
export function pushOut(
	pts: Pt[],
	dist: (progress: number, nx: number, nz: number) => number
): Pt[] {
	const count = pts.length;
	let cx = 0;
	let cz = 0;

	for (const [x, z] of pts) {
		cx += x;
		cz += z;
	}

	cx /= count;
	cz /= count;

	return pts.map((point, i) => {
		const prev = pts[(i + count - 1) % count];
		const next = pts[(i + 1) % count];
		const tx = next[0] - prev[0];
		const tz = next[1] - prev[1];
		const tl = Math.hypot(tx, tz) || 1;

		let nx = tz / tl;
		let nz = -tx / tl;

		if (nx * (point[0] - cx) + nz * (point[1] - cz) < 0) {
			nx = -nx;
			nz = -nz;
		}

		const distance = dist(i / count, nx, nz);
		return [point[0] + nx * distance, point[1] + nz * distance];
	});
}

/* A flat band across several outlines */
export function bandGeo(
	outlines: Pt[][],
	y: number,
	colours: (string | number)[],
	alphas: number[]
): THREE.BufferGeometry {
	const count = outlines[0].length;
	const pos: number[] = [];
	const col: number[] = [];
	const uv: number[] = [];
	const idx: number[] = [];

	outlines.forEach((pts, ring) => {
		const colour = new THREE.Color(colours[ring]);

		for (const [x, z] of pts) {
			pos.push(x, y, z);
			col.push(colour.r, colour.g, colour.b, alphas[ring]);
			uv.push(x, -z);
		}
	});

	for (let ring = 0; ring < outlines.length - 1; ring++) {
		for (let i = 0; i < count; i++) {
			const inner = ring * count + i;
			const innerNext = ring * count + ((i + 1) % count);
			const outer = inner + count;
			const outerNext = innerNext + count;
			idx.push(inner, innerNext, outer, outer, innerNext, outerNext);
		}
	}

	const normals = new Float32Array(pos.length);

	for (let i = 1; i < normals.length; i += 3) {
		normals[i] = 1;
	}

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	geometry.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
	geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
	geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
	geometry.setIndex(idx);

	return geometry;
}

/* A flat strip between two outlines with the same number of points */
export function ringGeo(
	inner: Pt[],
	outer: Pt[],
	y: number,
	colIn: string | number,
	colOut: string | number
): THREE.BufferGeometry {
	return bandGeo([inner, outer], y, [colIn, colOut], [1, 1]);
}
