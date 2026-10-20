import * as THREE from 'three';
import { canvasEl, flatMat } from '../colour.ts';
import { groundAt, type Layout } from '../layout.ts';
import { guideHeight, type Network } from './graph.ts';
import { cssColour, hexColour } from '#lib/styles/tokens.ts';

const deckWidth = 0.66;
const trackColours = {
	deck: hexColour('--track-deck'),
	side: hexColour('--track-side'),
	pillar: hexColour('--track-pillar'),
	platform: hexColour('--track-platform'),
	canopy: hexColour('--track-canopy')
};

/* A flat strip that follows a path */
export function stripGeo(
	pts: THREE.Vector3[],
	off: number,
	width: number,
	y: number | null,
	sideH = 0
): THREE.BufferGeometry {
	const pos: number[] = [];
	const idx: number[] = [];
	const count = pts.length;

	for (let index = 0; index < count; index++) {
		const from = pts[Math.max(0, index - 1)];
		const to = pts[Math.min(count - 1, index + 1)];
		const tx = to.x - from.x;
		const tz = to.z - from.z;
		const tl = Math.hypot(tx, tz) || 1;
		const sx = -tz / tl;
		const sz = tx / tl;
		const point = pts[index];
		const cx = point.x + sx * off;
		const cz = point.z + sz * off;
		const yy = y ?? point.y;

		pos.push(
			cx - (sx * width) / 2,
			yy,
			cz - (sz * width) / 2,
			cx + (sx * width) / 2,
			yy,
			cz + (sz * width) / 2
		);

		if (sideH) {
			pos.push(
				cx - (sx * width) / 2,
				yy - sideH,
				cz - (sz * width) / 2,
				cx + (sx * width) / 2,
				yy - sideH,
				cz + (sz * width) / 2
			);
		}
	}

	const step = sideH ? 4 : 2;

	for (let index = 0; index < count - 1; index++) {
		const i0 = index * step;
		const i1 = (index + 1) * step;

		idx.push(i0, i0 + 1, i1, i1, i0 + 1, i1 + 1);

		if (sideH) {
			idx.push(i0 + 2, i0, i1 + 2, i1 + 2, i0, i1, i0 + 1, i0 + 3, i1 + 1, i1 + 1, i0 + 3, i1 + 3);
		}
	}

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	geometry.setIndex(idx);
	geometry.computeVertexNormals();

	return geometry;
}

function hex(colour: number): string {
	return '#' + colour.toString(16).padStart(6, '0');
}

/* A little round sign showing a dot for every line that stops at a station */
function stationSign(colours: number[]): THREE.Sprite {
	const canvas = canvasEl(64 * colours.length + 16, 80);
	const ctx = canvas.getContext('2d')!;

	ctx.fillStyle = cssColour('--white');
	ctx.beginPath();
	ctx.roundRect(0, 0, canvas.width, 80, 40);
	ctx.fill();

	colours.forEach((col, index) => {
		ctx.beginPath();
		ctx.arc(40 + index * 64, 40, 24, 0, Math.PI * 2);
		ctx.fillStyle = hex(col);
		ctx.fill();
	});

	const tex = new THREE.CanvasTexture(canvas);
	tex.colorSpace = THREE.SRGBColorSpace;

	const sign = new THREE.Sprite(
		new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })
	);
	const width = 0.16 * colours.length + 0.04;

	sign.scale.set(width, (width * 80) / canvas.width, 1);

	return sign;
}

/* Points evenly spaced apart along a path */
function evenlyAlong(pts: THREE.Vector3[], length: number, gap: number): THREE.Vector3[] {
	const count = Math.max(1, Math.round(length / gap));
	const step = length / count;
	const out: THREE.Vector3[] = [];

	let walked = 0;
	let index = 1;

	for (let along = 0; along < count; along++) {
		const target = (along + 0.5) * step;
		let piece = pts[index].distanceTo(pts[index - 1]);

		while (walked + piece < target && index < pts.length - 1) {
			walked += piece;
			index++;
			piece = pts[index].distanceTo(pts[index - 1]);
		}

		out.push(pts[index - 1].clone().lerp(pts[index], (target - walked) / (piece || 1)));
	}

	return out;
}

export interface Track {
	root: THREE.Group;
	hits: THREE.Mesh[];
	deck: THREE.MeshStandardMaterial;
}

export function buildTrack(
	scene: THREE.Scene,
	net: Network,
	layout: Layout,
	shadows: boolean
): Track {
	const root = new THREE.Group();
	scene.add(root);

	const deck = flatMat(trackColours.deck, { rough: 0.7, side: THREE.DoubleSide });
	const hits: THREE.Mesh[] = [];
	const pillars: [number, number, number, number][] = [];

	for (const edge of net.edges) {
		const strip = new THREE.Mesh(stripGeo(edge.pts, 0, deckWidth, null, 0.14), deck);
		strip.castShadow = shadows;
		strip.receiveShadow = true;
		root.add(strip);

		for (const point of evenlyAlong(edge.pts, edge.len, 1.7)) {
			const gy = groundAt(layout, point.x, point.z);
			const height = guideHeight - 0.14 - gy;
			const crowded = pillars.some(([x, , z]) => Math.hypot(x - point.x, z - point.z) < 0.8);

			if (height > 0.15 && Math.hypot(point.x, point.z) > 0.5 && !crowded) {
				pillars.push([point.x, gy, point.z, height]);
			}
		}

		const curve = new THREE.CatmullRomCurve3(
			edge.pts.filter((_, i) => i % 2 === 0 || i === edge.pts.length - 1)
		);
		const hit = new THREE.Mesh(
			new THREE.TubeGeometry(curve, Math.max(4, Math.ceil(edge.len * 2)), 0.42, 5, false),
			new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })
		);

		hit.userData.edge = edge.i;
		root.add(hit);
		hits.push(hit);
	}

	const pm = new THREE.InstancedMesh(
		new THREE.CylinderGeometry(0.09, 0.11, 1, 10),
		flatMat(trackColours.pillar, { rough: 0.9 }),
		Math.max(1, pillars.length)
	);
	const matrix = new THREE.Matrix4();

	pillars.forEach(([x, y, z, height], i) => {
		matrix.makeScale(1, height, 1);
		matrix.setPosition(x, y + height / 2, z);
		pm.setMatrixAt(i, matrix);
	});

	pm.count = pillars.length;
	pm.castShadow = shadows;
	pm.receiveShadow = true;
	root.add(pm);

	const platformMat = flatMat(trackColours.platform);
	const canopyMat = flatMat(trackColours.canopy);
	const postMat = flatMat(trackColours.pillar);

	for (const id of Object.keys(net.nodes)) {
		if (!id.startsWith('s_') && id !== 'rN' && id !== 'rS') {
			continue;
		}

		const nd = net.nodes[id];
		const lines = net.lines.filter((line) => line.stops.includes(id));
		const station = new THREE.Group();

		station.position.copy(nd.position);

		if (id === 'rN' || id === 'rS') {
			station.rotation.y = Math.PI / 2;
		}

		root.add(station);

		for (const side of [-1, 1]) {
			if ((id === 'rN' && side === -1) || (id === 'rS' && side === 1)) {
				continue;
			}

			const plat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 1.7), platformMat);
			plat.position.set(side * (deckWidth / 2 + 0.24), -0.06, 0);
			plat.castShadow = shadows;
			plat.receiveShadow = true;

			const roof = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 1.5), canopyMat);
			roof.position.set(side * (deckWidth / 2 + 0.26), 0.42, 0);
			roof.castShadow = shadows;
			station.add(plat, roof);

			for (const z of [-0.6, 0.6]) {
				const post = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.44, 6), postMat);
				post.position.set(side * (deckWidth / 2 + 0.42), 0.2, z);
				station.add(post);
			}
		}

		if (lines.length) {
			const sign = stationSign(lines.map((line) => line.colour));
			sign.position.set(0, 0.78, 0);
			station.add(sign);
		}
	}

	return { root, hits, deck };
}
