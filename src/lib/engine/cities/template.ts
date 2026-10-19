import * as THREE from 'three';
import { mulberry32 } from '../util.ts';
import type { City } from './City.ts';
import {
	bldg,
	cityMesh,
	edged,
	facadeTexture,
	frontLow,
	hashStr,
	lineMat,
	modelColours
} from './kit.ts';
import { streets } from './base.ts';
import { cssColour } from '#lib/styles/tokens.ts';

type Landmark = 'dome' | 'stack' | 'mast' | 'tower';

function landmarkFor(city: City): Landmark {
	const uses = city.project ? Object.keys(city.project.uses) : [];

	if (uses.includes('ml')) {
		return 'dome';
	}

	if (uses.includes('docker') || uses.includes('selfHost')) {
		return 'stack';
	}

	if (uses.includes('cdk') || uses.includes('serverless')) {
		return 'mast';
	}

	return 'tower';
}

export function buildTemplate(city: City): void {
	const rnd = mulberry32(hashStr(city.id));
	const preview = Boolean(city.project?.preview);
	const outerRadius = city.radius - 0.2;
	const ringRadius = city.radius * 0.84;
	const geos: THREE.BufferGeometry[] = [];

	for (let i = 0; i < streets.count; i++) {
		const angle = streets.turn + (i / streets.count) * Math.PI * 2;
		const x = Math.cos(angle) * ringRadius;
		const z = Math.sin(angle) * ringRadius;
		const height =
			(0.35 + rnd() * 0.8) * frontLow(z, outerRadius) * (preview ? (i % 3 === 0 ? 0.25 : 0.7) : 1);

		geos.push(bldg(0.42 + rnd() * 0.2, height, 0.36 + rnd() * 0.2, x, z, -angle));
	}

	const lit: [string, string] = [cssColour('--model-amber'), cssColour('--model-blue')];
	cityMesh(city, geos, facadeTexture('office', hashStr(city.id) % 97, lit), city.accent);

	const group = new THREE.Group();
	city.content.add(group);

	const kind = landmarkFor(city);
	let land: THREE.Object3D;

	if (kind === 'dome') {
		land = edged(
			city,
			new THREE.SphereGeometry(0.62, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
			city.accent
		);
		land.position.y = 0.14;
	} else if (kind === 'stack') {
		land = new THREE.Group();

		for (let layer = 0; layer < 4; layer++) {
			const box = edged(city, new THREE.BoxGeometry(0.9, 0.24, 0.42), city.accent);
			box.position.set((layer % 2) * 0.12 - 0.06, 0.26 + layer * 0.25, 0);
			box.rotation.y = layer * 0.35;
			land.add(box);
		}
	} else if (kind === 'mast') {
		land = new THREE.Group();

		const mast = edged(city, new THREE.CylinderGeometry(0.05, 0.16, 1.8, 6), city.accent);
		mast.position.y = 1.04;

		const dish = edged(city, new THREE.CylinderGeometry(0.32, 0.05, 0.12, 16), city.accent);
		dish.position.y = 1.7;
		dish.rotation.x = 0.6;

		land.add(mast, dish);
	} else {
		land = edged(city, new THREE.BoxGeometry(0.5, 1.8, 0.5), city.accent);
		land.position.y = 1.04;
	}

	group.add(land);

	if (!preview) {
		city.update = (dt) => {
			land.rotation.y += dt * 0.12;
		};

		return;
	}

	const pts: number[] = [];
	const sx = 0.95;
	const sz = 0.55;
	const corners = [
		[-1, -1],
		[1, -1],
		[1, 1],
		[-1, 1]
	];

	for (let floor = 0; floor <= 5; floor++) {
		const y = 0.14 + floor * 0.22;

		for (let j = 0; j < 4; j++) {
			const [ax, az] = corners[j];
			const [bx, bz] = corners[(j + 1) % 4];

			pts.push(sx + ax * 0.3, y, sz + az * 0.24, sx + bx * 0.3, y, sz + bz * 0.24);
		}
	}

	for (const [cx, cz] of corners) {
		pts.push(sx + cx * 0.3, 0.14, sz + cz * 0.24, sx + cx * 0.3, 1.24, sz + cz * 0.24);
	}

	const sg = new THREE.BufferGeometry();
	sg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
	group.add(new THREE.LineSegments(sg, lineMat(city, modelColours.amber, 0.7)));

	const mast = edged(city, new THREE.BoxGeometry(0.07, 2.2, 0.07), modelColours.amber);
	mast.position.set(-0.9, 1.24, -0.6);

	const jib = new THREE.Group();
	jib.position.set(-0.9, 2.34, -0.6);

	const arm = edged(city, new THREE.BoxGeometry(1.5, 0.05, 0.05), modelColours.amber);
	arm.position.x = 0.4;

	jib.add(arm);
	group.add(mast, jib);
	city.update = (dt, time) => {
		jib.rotation.y = 0.6 * Math.sin(time * 0.3 + city.site.x);
		land.rotation.y += dt * 0.15;
	};
}
