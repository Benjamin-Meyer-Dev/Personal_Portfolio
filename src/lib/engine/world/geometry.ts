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

/* A smooth bumpy function around a closed loop */
export function wobble(rnd: () => number, lobes = 3): (progress: number) => number {
	const p1 = rnd() * 6.283;
	const p2 = rnd() * 6.283;
	const p3 = rnd() * 6.283;
	const f2 = lobes + 2 + Math.floor(rnd() * 2);
	const f3 = lobes * 3 + 1;

	return (progress) =>
		0.5 +
		0.5 *
			(0.52 * Math.sin(6.283 * lobes * progress + p1) +
				0.32 * Math.sin(6.283 * f2 * progress + p2) +
				0.16 * Math.sin(6.283 * f3 * progress + p3));
}

/* A rounded rectangle with its own radius on each corner as evenly spaced points */
export function rrectPts(
	x0: number,
	z0: number,
	x1: number,
	z1: number,
	radii: [number, number, number, number],
	count: number
): Pt[] {
	const shape = new THREE.Shape();
	shape.moveTo(x0 + radii[0], z0);
	shape.lineTo(x1 - radii[1], z0);
	shape.absarc(x1 - radii[1], z0 + radii[1], radii[1], -Math.PI / 2, 0, false);
	shape.lineTo(x1, z1 - radii[2]);
	shape.absarc(x1 - radii[2], z1 - radii[2], radii[2], 0, Math.PI / 2, false);
	shape.lineTo(x0 + radii[3], z1);
	shape.absarc(x0 + radii[3], z1 - radii[3], radii[3], Math.PI / 2, Math.PI, false);
	shape.lineTo(x0, z0 + radii[0]);
	shape.absarc(x0 + radii[0], z0 + radii[0], radii[0], Math.PI, Math.PI * 1.5, false);

	return shape
		.getSpacedPoints(count)
		.slice(0, count)
		.map((point) => [point.x, point.y]);
}

/* A random blob: a circle-ish outline with a few lobes */
export function blobPts(
	cx: number,
	cz: number,
	radius: number,
	rnd: () => number,
	count: number
): Pt[] {
	const phase1 = rnd() * 6;
	const phase2 = rnd() * 6;
	const phase3 = rnd() * 6;
	const squash = 0.7 + rnd() * 0.5;
	const out: Pt[] = [];

	for (let i = 0; i < count; i++) {
		const th = (i / count) * Math.PI * 2;
		const distance =
			radius *
			(1 +
				0.16 * Math.sin(2 * th + phase1) +
				0.09 * Math.sin(3 * th + phase2) +
				0.05 * Math.sin(5 * th + phase3));

		out.push([cx + Math.cos(th) * distance, cz + Math.sin(th) * distance * squash]);
	}

	return out;
}
