import * as THREE from 'three';
import { canvasEl, flatMat } from '../colour.ts';
import { layoutSizes, type Lot } from '../layout.ts';
import { lerp } from '../util.ts';
import { cssColour, cssValue, hexColour } from '#lib/styles/tokens.ts';

export interface LotParts {
	lot: Lot;
	group: THREE.Group;
	hit: THREE.Mesh;
	mats: THREE.Material[];
	vis: number;
}

function signTexture(lot: Lot): THREE.CanvasTexture {
	const island = lot.island;
	const canvas = canvasEl(512, 256);
	const ctx = canvas.getContext('2d')!;
	const tex = new THREE.CanvasTexture(canvas);

	tex.colorSpace = THREE.SRGBColorSpace;
	tex.anisotropy = 4;

	const draw = () => {
		ctx.fillStyle = cssColour('--white');
		ctx.fillRect(0, 0, 512, 256);
		ctx.fillStyle = island.type.ink;
		ctx.fillRect(0, 0, 512, 18);
		ctx.textBaseline = 'middle';
		ctx.fillStyle = cssColour('--model-ink');
		ctx.font = `700 58px ${cssValue('--sans')}`;
		ctx.fillText(`Lot ${lot.idx + 1}`, 26, 82);
		ctx.fillStyle = cssColour('--ink-4');
		ctx.font = `500 30px ${cssValue('--mono')}`;
		ctx.fillText('Reserved for my next', 28, 150);
		ctx.fillText(island.type.noun, 28, 196);
		tex.needsUpdate = true;
	};

	draw();
	document.fonts?.ready.then(draw);

	return tex;
}

export function buildLot(scene: THREE.Scene, lot: Lot): LotParts {
	const island = lot.island;
	const group = new THREE.Group();

	group.position.set(lot.x, island.elev, lot.z);
	scene.add(group);

	const halfSize = layoutSizes.lot / 2 - 0.45;
	const sides = [
		[-halfSize, -halfSize, halfSize, -halfSize],
		[halfSize, -halfSize, halfSize, halfSize],
		[halfSize, halfSize, -halfSize, halfSize],
		[-halfSize, halfSize, -halfSize, -halfSize]
	];
	const segs: number[] = [];

	for (const [x0, z0, x1, z1] of sides) {
		for (let i = 0; i < 10; i += 2) {
			const dashStart = i / 10;
			const dashEnd = (i + 1) / 10;

			segs.push(
				lerp(x0, x1, dashStart),
				0.02,
				lerp(z0, z1, dashStart),
				lerp(x0, x1, dashEnd),
				0.02,
				lerp(z0, z1, dashEnd)
			);
		}
	}

	const lg = new THREE.BufferGeometry();
	lg.setAttribute('position', new THREE.Float32BufferAttribute(segs, 3));

	const lineMat = new THREE.LineBasicMaterial({
		color: hexColour('--lot-outline'),
		transparent: true,
		opacity: 0.8
	});

	group.add(new THREE.LineSegments(lg, lineMat));

	const stakeMat = flatMat(hexColour('--lot-stake'));
	const flagMat = new THREE.MeshBasicMaterial({
		color: island.type.accent,
		side: THREE.DoubleSide,
		transparent: true
	});

	for (const [x, z] of [
		[-halfSize, -halfSize],
		[halfSize, -halfSize],
		[halfSize, halfSize],
		[-halfSize, halfSize]
	]) {
		const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), stakeMat);
		stake.position.set(x, 0.25, z);
		stake.castShadow = true;

		const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.12), flagMat);
		flag.position.set(x + 0.1, 0.44, z);
		flag.userData.flag = true;
		group.add(stake, flag);
	}

	const signMat = new THREE.MeshBasicMaterial({ map: signTexture(lot), transparent: true });
	const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.75), signMat);
	sign.position.set(0, 1.0, 0.2);

	const board = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.81, 0.04), stakeMat);
	board.position.set(0, 0.31, 0.17);
	board.castShadow = true;

	group.add(sign, board);

	for (const x of [-0.6, 0.6]) {
		const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.62, 6), stakeMat);
		post.position.set(x, 0.31, 0.17);
		post.castShadow = true;
		group.add(post);
	}

	const hit = new THREE.Mesh(
		new THREE.BoxGeometry(layoutSizes.lot - 0.6, 1.6, layoutSizes.lot - 0.6),
		new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })
	);

	hit.position.y = 0.8;
	hit.userData.lot = lot;
	group.add(hit);

	return { lot, group, hit, mats: [lineMat, flagMat, signMat], vis: 1 };
}
