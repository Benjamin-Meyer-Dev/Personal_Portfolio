import * as THREE from 'three';
import { flatMat, mixHex } from '../colour.ts';
import { layoutSizes, type Layout } from '../layout.ts';
import { blobPts, inPoly, offsetPts, shapeFrom, type Pt } from './geometry.ts';
import { naturalLayers, type IslandParts, type Layers } from './island.ts';
import { landLevels, type LakeParts } from './lake.ts';
import { worldRandom } from './seed.ts';
import { cssColour, hexColour } from '#lib/styles/tokens.ts';

const natureColours = {
	hillLo: hexColour('--hill-low'),
	hillHi: hexColour('--hill-high'),
	trunk: hexColour('--tree-trunk'),
	canopies: [
		cssColour('--tree-canopy-1'),
		cssColour('--tree-canopy-2'),
		cssColour('--tree-canopy-3'),
		cssColour('--tree-canopy-4'),
		cssColour('--tree-canopy-5')
	],
	rocks: [
		cssColour('--rock-1'),
		cssColour('--rock-2'),
		cssColour('--rock-3'),
		cssColour('--rock-4')
	]
};

/* Scale for trees and rocks */
type Tree = [number, number, number, number];
type Rock = [number, number, number, number, number];

/* Ground already used by a tree or a rock */
type Taken = [number, number, number][];
const isFree = (taken: Taken, x: number, z: number, radius: number) =>
	taken.every(([tx, tz, tr]) => Math.hypot(x - tx, z - tz) > tr + radius);
const treeRadius = (scale: number) => 0.4 * scale;
const rockRadius = (scale: number) => 1.1 * scale;

/* Trees on an island's grassy shelft and boulders along its beach, helpt clear of railway and the name */
function islandDressing(
	parts: IslandParts,
	rnd: () => number,
	taken: Taken
): { trees: Tree[]; rocks: Rock[] } {
	const island = parts.island;
	const trees: Tree[] = [];
	const rocks: Rock[] = [];
	const clear = (x: number, z: number) => {
		if (Math.abs(x - island.spineX) < 1.4) {
			return false;
		}

		const inFront = island.sz < 0 ? z > island.z0 - 1.2 : z > island.z1 - 0.6;
		const along = island.sx * (x - island.x0);

		return !(inFront && along > -0.2 && along < layoutSizes.marg + 7.2);
	};

	const nearDistrict = offsetPts(parts.top, 0.45);
	const farFromDistrcit = offsetPts(parts.top, 2.4);
	const grass = offsetPts(parts.mid, -0.3);
	const xs = parts.mid.map(([x]) => x);
	const zs = parts.mid.map(([, z]) => z);
	const minX = Math.min(...xs);
	const minZ = Math.min(...zs);
	const spanX = Math.max(...xs) - minX;
	const spanZ = Math.max(...zs) - minZ;
	const spotOnGrass = (): [number, number] | null => {
		const x = minX + rnd() * spanX;
		const z = minZ + rnd() * spanZ;
		return inPoly(x, z, grass) && !inPoly(x, z, nearDistrict) && clear(x, z) ? [x, z] : null;
	};

	for (let tries = Math.round(spanX * spanZ * 0.6); tries > 0; tries--) {
		const spot = spotOnGrass();

		if (!spot) {
			continue;
		}

		const [x, z] = spot;

		if (rnd() > (inPoly(x, z, farFromDistrcit) ? 0.8 : 0.3)) {
			continue;
		}

		const scale = 0.42 + rnd() * 0.32;

		if (!isFree(taken, x, z, treeRadius(scale))) {
			continue;
		}

		trees.push([x, parts.midY, z, scale]);
		taken.push([x, z, treeRadius(scale)]);
	}

	for (let tries = Math.round(spanX * spanZ * 0.04); tries > 0; tries--) {
		const spot = spotOnGrass();

		if (!spot) {
			continue;
		}

		const [x, z] = spot;
		const scale = 0.1 + rnd() * 0.14;

		if (!isFree(taken, x, z, rockRadius(scale))) {
			continue;
		}

		rocks.push([x, parts.midY + 0.02, z, scale, rnd() * 6]);
		taken.push([x, z, rockRadius(scale)]);

		const [sx, sz] = [x + (rnd() - 0.5) * 0.8, z + (rnd() - 0.5) * 0.8];

		if (rnd() < 0.5 && inPoly(sx, sz, grass) && isFree(taken, sx, sz, rockRadius(scale * 0.55))) {
			rocks.push([sx, parts.midY + 0.01, sz, scale * 0.55, rnd() * 6]);
			taken.push([sx, sz, rockRadius(scale * 0.55)]);
		}
	}

	return { trees, rocks };
}

export function buildNature(
	scene: THREE.Scene,
	layout: Layout,
	lake: LakeParts,
	islands: IslandParts[],
	capital: Layers,
	shadows: boolean
): THREE.Group {
	const root = new THREE.Group();
	scene.add(root);

	const rnd = worldRandom(1234);
	const lakeShape = lake.lake;
	const { x0: minX, x1: maxX, z0: minZ, z1: maxZ } = lake.bounds;
	const hills: { cx: number; cz: number; radius: number }[] = [];
	const layers: { pts: Pt[]; y: number }[] = [];

	for (let hillIndex = 0; hillIndex < 15; hillIndex++) {
		const th = -Math.PI + ((hillIndex + 0.5) / 15) * Math.PI * 2 + (rnd() - 0.5) * 0.25;
		const cs = Math.cos(th);
		const sn = Math.sin(th);
		const front = sn > 0.3;

		if (front && rnd() < 0.55) {
			continue;
		}

		const r0 = Math.pow(Math.pow(Math.abs(cs), 4) + Math.pow(Math.abs(sn), 4), -0.25);
		const radius = (front ? 2.6 : 3.4) + rnd() * (front ? 1.6 : 3.6);
		const dist = 1.08 + (radius + 2.2 + rnd() * 3.5) / Math.max(lakeShape.hx, lakeShape.hz);
		const cx = cs * r0 * lakeShape.hx * dist;
		const cz = lakeShape.cz + sn * r0 * lakeShape.hz * dist;
		const count = front ? 1 + Math.floor(rnd() * 2) : 3 + Math.floor(rnd() * 4);

		for (let level = 0; level < count; level++) {
			const pts = blobPts(
				cx + (rnd() - 0.5) * 0.6 * level,
				cz + (rnd() - 0.5) * 0.6 * level,
				radius * (1 - level / (count + 0.6)),
				rnd,
				48
			);

			if (pts.some(([x, z]) => inPoly(x, z, lake.beachOut))) {
				if (level === 0) {
					break;
				}

				continue;
			}

			const geometry = new THREE.ExtrudeGeometry(shapeFrom(pts), {
				depth: 0.2,
				bevelEnabled: false
			});

			geometry.rotateX(-Math.PI / 2);

			const tone = mixHex(
				natureColours.hillLo,
				natureColours.hillHi,
				count > 1 ? level / (count - 1) : 0.4
			);
			const mesh = new THREE.Mesh(geometry, [
				flatMat(tone, { rough: 1 }),
				flatMat(mixHex(tone, hexColour('--hill-shade'), 0.12), { rough: 1 })
			]);

			mesh.position.y = landLevels.top + level * 0.2;
			mesh.castShadow = shadows;
			mesh.receiveShadow = true;
			root.add(mesh);
			layers.push({ pts, y: landLevels.top + (level + 1) * 0.2 });
		}

		hills.push({ cx, cz, radius });
	}

	const groundY = (x: number, z: number) =>
		layers.reduce(
			(y, layer) => (layer.y > y && inPoly(x, z, layer.pts) ? layer.y : y),
			landLevels.top
		);
	const trees: Tree[] = [];
	const rocks: Rock[] = [];
	const taken: Taken = [];
	const nearLake = offsetPts(lakeShape.pts, 7);
	const lakeEdge = offsetPts(lake.beachOut, 0.4);
	const spotOnShore = (): [number, number] | null => {
		const x = minX + 3 + rnd() * (maxX - minX - 6);
		const z = minZ + 3 + rnd() * (maxZ - minZ - 6);

		if (inPoly(x, z, lakeEdge)) {
			return null;
		}

		const nearHill = hills.some(
			(hill) => Math.hypot(x - hill.cx, (z - hill.cz) * 1.2) < hill.radius * 1.25
		);

		return !nearHill && !inPoly(x, z, nearLake) && rnd() < 0.8 ? null : [x, z];
	};

	for (let tries = 0; trees.length < 210 && tries < 4000; tries++) {
		const spot = spotOnShore();
		const scale = 0.65 + rnd() * 0.7;

		if (!spot || !isFree(taken, spot[0], spot[1], treeRadius(scale))) {
			continue;
		}

		const [x, z] = spot;
		trees.push([x, groundY(x, z), z, scale]);
		taken.push([x, z, treeRadius(scale)]);
	}

	for (let tries = 0; rocks.length < 30 && tries < 1000; tries++) {
		const spot = spotOnShore();
		const scale = 0.14 + rnd() * 0.2;

		if (!spot || !isFree(taken, spot[0], spot[1], rockRadius(scale))) {
			continue;
		}

		const [x, z] = spot;
		rocks.push([x, groundY(x, z) + 0.02, z, scale, rnd() * 6]);
		taken.push([x, z, rockRadius(scale)]);
	}

	const irnd = worldRandom(99);

	for (const parts of islands) {
		const dressing = islandDressing(parts, irnd, taken);
		trees.push(...dressing.trees);
		rocks.push(...dressing.rocks);
	}

	const outlines = [...islands.map((parts) => parts.beach), capital.beach];
	const spots: [number, number, number][] = [
		[0, layout.zFront + 2.5, 1.0],
		[0, -(layout.zBack + 2.5), 0.9],
		[layout.xMax + 2.5, 0, 0.9],
		[-(layout.xMax + 2.5), 0, 1.0],
		[-(layout.xMax + 1.5), layout.zFront + 1.5, 1.25],
		[layout.xMax + 1.5, -(layout.zBack + 1.5), 1.1]
	];

	const srnd = worldRandom(4242);

	for (const [x, z, radius] of spots) {
		const need = radius + 1.9;
		const clearOfIslands = outlines.every((outline) =>
			outline.every(([px, pz]) => Math.hypot(px - x, pz - z) > need)
		);

		if (!clearOfIslands || !inPoly(x, z, offsetPts(lakeShape.pts, -(radius + 2.4)))) {
			continue;
		}

		const group = new THREE.Group();
		root.add(group);
		naturalLayers(group, blobPts(x, z, radius, srnd, 48), {
			elev: 0.27,
			top: hexColour('--islet-top'),
			side: hexColour('--islet-side'),
			rnd: srnd,
			lobes: 2,
			mid: 0.14,
			midAmp: 0.12,
			beach: 0.16,
			beachAmp: 0.14
		});

		const spotOnTop = (): [number, number] => {
			const angle = srnd() * 6.283;
			const rr = radius * 0.55 * Math.sqrt(srnd());

			return [x + Math.cos(angle) * rr, z + Math.sin(angle) * rr * 0.8];
		};

		const treeCount = 1 + Math.floor(radius * 2.2);

		for (let placed = 0, tries = 0; placed < treeCount && tries < 20; tries++) {
			const [tx, tz] = spotOnTop();
			const scale = 0.5 + srnd() * 0.4;

			if (!isFree(taken, tx, tz, treeRadius(scale))) {
				continue;
			}

			trees.push([tx, 0.27, tz, scale]);
			taken.push([tx, tz, treeRadius(scale)]);
			placed++;
		}

		const [rx, rz] = spotOnTop();
		const rockScale = 0.08 + srnd() * 0.08;

		if (srnd() < 0.6 && isFree(taken, rx, rz, rockRadius(rockScale))) {
			rocks.push([rx, 0.27 + 0.02, rz, rockScale, srnd() * 6]);
			taken.push([rx, rz, rockRadius(rockScale)]);
		}
	}

	const matrix = new THREE.Matrix4();
	const quaternion = new THREE.Quaternion();
	const euler = new THREE.Euler();
	const tmpPosition = new THREE.Vector3();
	const tmpScale = new THREE.Vector3();
	const col = new THREE.Color();

	const canopy = new THREE.InstancedMesh(
		new THREE.IcosahedronGeometry(0.36, 0),
		flatMat(hexColour('--white'), { rough: 0.9 }),
		trees.length
	);
	const trunk = new THREE.InstancedMesh(
		new THREE.CylinderGeometry(0.035, 0.045, 1, 6),
		flatMat(natureColours.trunk, { rough: 1 }),
		trees.length
	);

	trees.forEach(([x, y, z, scale], i) => {
		const th = 0.42 * scale;
		euler.set(rnd() * 0.3, rnd() * 6, rnd() * 0.3);
		quaternion.setFromEuler(euler);
		matrix.compose(
			tmpPosition.set(x, y + th + 0.26 * scale, z),
			quaternion,
			tmpScale.set(scale, scale * (1 + rnd() * 0.5), scale)
		);
		canopy.setMatrixAt(i, matrix);
		canopy.setColorAt(
			i,
			col.set(natureColours.canopies[Math.floor(rnd() * natureColours.canopies.length)])
		);
		matrix.compose(
			tmpPosition.set(x, y + th / 2, z),
			quaternion.identity(),
			tmpScale.set(1, th + 0.1, 1)
		);
		trunk.setMatrixAt(i, matrix);
	});

	canopy.castShadow = trunk.castShadow = shadows;
	canopy.receiveShadow = true;
	root.add(canopy, trunk);

	const rockMesh = new THREE.InstancedMesh(
		new THREE.DodecahedronGeometry(1, 0),
		flatMat(hexColour('--white'), { rough: 1 }),
		rocks.length
	);

	rocks.forEach(([x, y, z, scale, turn], i) => {
		euler.set((rnd() - 0.5) * 0.6, turn, (rnd() - 0.5) * 0.6);
		quaternion.setFromEuler(euler);
		matrix.compose(
			tmpPosition.set(x, y, z),
			quaternion,
			tmpScale.set(
				scale * (0.9 + rnd() * 0.4),
				scale * (0.5 + rnd() * 0.3),
				scale * (0.8 + rnd() * 0.4)
			)
		);

		rockMesh.setMatrixAt(i, matrix);
		rockMesh.setColorAt(
			i,
			col.set(natureColours.rocks[Math.floor(rnd() * natureColours.rocks.length)])
		);
	});

	rockMesh.castShadow = shadows;
	rockMesh.receiveShadow = true;
	root.add(rockMesh);

	return root;
}
