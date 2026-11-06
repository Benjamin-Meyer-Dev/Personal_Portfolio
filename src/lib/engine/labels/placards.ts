import * as THREE from 'three';
import { capitalInfo } from '#lib/data/projects.ts';
import type { City } from '../cities/City.ts';
import { canvasEl, flatMat } from '../colour.ts';
import type { MapScene } from '../MapScene.ts';
import type { Network } from '../transit/graph.ts';
import { clamp } from '../util.ts';
import { cssColour, cssValue, hexColour } from '#lib/styles/tokens.ts';

const typeLabels: Record<string, string> = {
	cloud: 'CLOUD',
	work: "WORK · STUBBE'S",
	data: 'DATA + ML',
	self: 'SELF-HOSTED'
};

export interface Placard {
	city: City;
	root: THREE.Group;
	sign: THREE.Group;
	card: THREE.Group;
	body: THREE.Mesh;
	mats: THREE.Material[];
	height: number;
	aspect: number;
	floatH: number;
	target: number;
	op: number;
	readScale: number;
	lift: number;
	slide: number;
	liftV: number;
	slideV: number;
}

function hex(colour: number): string {
	return '#' + colour.toString(16).padStart(6, '0');
}

export function buildPlacard(city: City, net: Network, compact = false): Placard {
	const project = city.project;
	const core = city.id === 'core';
	const band = city.accent;
	const lines = net.lines.filter((line) => core || line.users.includes(city.id));
	const lot = city.site.lot ? city.site.lot.idx + 1 : 0;
	const root = new THREE.Group();

	root.position.set(0, 0.14, core ? -(city.radius * 0.66) : -(city.radius - 0.55));
	city.group.add(root);

	const sign = new THREE.Group();
	const card = new THREE.Group();

	root.add(sign);
	sign.add(card);

	const canvasWidth = 1280;
	const canvasHeight = compact ? 300 : 420;
	const canvas = canvasEl(canvasWidth, canvasHeight);
	const ctx = canvas.getContext('2d')!;
	const tex = new THREE.CanvasTexture(canvas);

	tex.colorSpace = THREE.SRGBColorSpace;
	tex.anisotropy = 8;

	const faceMat = new THREE.MeshBasicMaterial({
		map: tex,
		transparent: true,
		toneMapped: false,
		polygonOffset: true,
		polygonOffsetFactor: -2,
		polygonOffsetUnits: -8
	});

	faceMat.onBeforeCompile = (shader) => {
		shader.fragmentShader = shader.fragmentShader.replace(
			'#include <map_fragment>',
			'diffuseColor *= texture2D(map, vMapUv, -1.0);'
		);
	};
	const bodyMat = flatMat(hexColour('--placard-body'), { rough: 0.85, transparent: true });
	const backMat = new THREE.MeshBasicMaterial({ color: band, transparent: true });
	const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.07), bodyMat);

	body.castShadow = true;
	body.userData.cityId = city.id;

	const face = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), faceMat);
	face.position.z = 0.06;
	face.renderOrder = 3;

	const back = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), backMat);
	back.rotation.y = Math.PI;
	back.position.z = -0.06;
	card.add(body, face, back);

	const placard: Placard = {
		city,
		root,
		sign,
		card,
		body,
		mats: [faceMat, bodyMat, backMat],
		height: compact ? 1.5 : 2.0,
		aspect: 3,
		floatH: Math.max(1.6, city.site.labelY - 0.2),
		target: 1,
		op: 1,
		readScale: 1,
		lift: 0,
		slide: 0,
		liftV: 0,
		slideV: 0
	};

	const draw = () => {
		const sans = cssValue('--sans');
		const mono = cssValue('--mono');
		const top = core
			? 'THE CAPITAL'
			: (typeLabels[project?.type ?? ''] ?? '') + (lot ? ` · LOT ${lot}` : '');
		const title = core ? capitalInfo.title : (project?.title ?? city.id);
		const sub = core ? capitalInfo.sub : (project?.sub ?? '');
		const pad = 52;
		let tf = 128;
		let sf = 58;
		const bf = 46;
		ctx.font = `700 ${tf}px ${sans}`;

		const tw = ctx.measureText(title).width;
		ctx.font = `600 ${sf}px ${mono}`;

		const sw = compact ? 0 : ctx.measureText(sub).width;
		ctx.font = `700 ${bf}px ${mono}`;

		const bw = ctx.measureText(top).width;
		const need = Math.max(tw, sw, bw + 30, lines.length * 54) + pad * 2;
		const shrink = Math.min(1, canvasWidth / need);

		tf *= shrink;
		sf *= shrink;

		const width = Math.min(canvasWidth, Math.ceil(need));
		ctx.clearRect(0, 0, canvasWidth, canvasHeight);
		ctx.fillStyle = cssColour('--white');
		ctx.fillRect(0, 0, width, canvasHeight);
		ctx.fillStyle = hex(band);
		ctx.fillRect(0, 0, width, 72);
		ctx.fillStyle = cssColour('--white');
		ctx.font = `700 ${bf}px ${mono}`;
		ctx.textBaseline = 'middle';
		ctx.fillText(top, pad, 38);
		ctx.fillStyle = cssColour('--ink');
		ctx.font = `700 ${tf}px ${sans}`;
		ctx.textBaseline = 'alphabetic';
		ctx.fillText(title, pad - 4, compact ? 200 : 196);

		if (!compact) {
			ctx.fillStyle = cssColour('--ink-3');
			ctx.font = `600 ${sf}px ${mono}`;
			ctx.fillText(sub, pad, 282);
		}

		lines.forEach((line, i) => {
			ctx.beginPath();
			ctx.arc(pad + 18 + i * 54, compact ? 258 : 352, 20, 0, Math.PI * 2);
			ctx.fillStyle = hex(line.colour);
			ctx.fill();
		});

		ctx.strokeStyle = cssColour('--placard-border');
		ctx.lineWidth = 4;
		ctx.strokeRect(2, 2, width - 4, canvasHeight - 4);
		tex.repeat.set(width / canvasWidth, 1);
		tex.needsUpdate = true;
		placard.aspect = width / canvasHeight;
	};

	draw();
	document.fonts?.ready.then(draw);

	return placard;
}

/* Fade, scale, lift and turn a placard to face the camera */
export function stepPlacard(
	placard: Placard,
	map: MapScene,
	dt: number,
	hover: number,
	minPx?: number
): void {
	const { city } = placard;
	const cam = map.camera;
	const gs = city.scale;
	const height = placard.height;

	placard.op += (placard.target - placard.op) * Math.min(1, dt * 5);

	for (const material of placard.mats) {
		material.opacity = placard.op;
	}

	placard.root.visible = placard.op > 0.03;

	if (!placard.root.visible) {
		return;
	}

	const wx = city.site.x;
	const wy = city.elev + (0.14 + placard.floatH + height / 2) * gs;
	const wz = city.site.z + placard.root.position.z * gs;
	const dist = Math.max(
		1,
		Math.hypot(cam.position.x - wx, cam.position.y - wy, cam.position.z - wz)
	);
	const viewHeight = map.height || 900;
	const px = (cam.projectionMatrix.elements[5] * height * gs * viewHeight) / (2 * dist);
	const want = minPx ?? Math.max(28, 0.06 * viewHeight);
	const sT = clamp(want / px, 1, 2.6) * (1 + 0.08 * hover);

	placard.readScale += (sT - placard.readScale) * Math.min(1, dt * 6);
	placard.liftV += (placard.lift - placard.liftV) * Math.min(1, dt * 5);
	placard.slideV += (placard.slide - placard.slideV) * Math.min(1, dt * 5);

	const cw = height * placard.aspect * placard.readScale;
	const ch = height * placard.readScale;
	const cx = placard.slideV * cw;
	const by = placard.floatH + placard.liftV * ch * 1.08;

	placard.card.scale.set(cw, ch, 1);
	placard.card.position.set(cx, by + ch / 2, 0);

	const view = map.rig.view;
	const yaw = Math.atan2(cam.position.x - view.tx, cam.position.z - view.tz);
	const pitch = Math.atan2(
		cam.position.y - wy,
		Math.hypot(cam.position.x - wx, cam.position.z - wz)
	);

	placard.sign.rotation.y = yaw;
	placard.card.rotation.x = -pitch * 0.85;
	placard.card.position.z = (Math.sin(pitch * 0.85) * ch) / 2;
}
