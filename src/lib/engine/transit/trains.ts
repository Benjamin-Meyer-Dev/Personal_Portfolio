import * as THREE from 'three';
import { canvasEl } from '../colour.ts';
import { type Part } from '../MapScene.ts';
import { guideHeight, type Line, type Network } from './graph.ts';
import { stripGeo } from './track.ts';
import { carCount, Traffic, type TrainState } from './traffic.ts';
import { cssColour, cssValue, hexColour } from '#lib/styles/tokens.ts';

/* What the rest of the page wants lit up */
export interface TransitFocus {
	skill: string | null;
	selected: string | null;
	hoverCity: string | null;
	hoverEdge: number | null;
	incident: number;
}

interface Train {
	line: Line;
	li: number;
	state: TrainState;
	cars: THREE.Group[];
	mats: THREE.Material[];
	tag: THREE.Sprite;
	tagText: (text: string) => void;
	packet: number;
}

const trainSpeed = 1.7;
const alarmRed = hexColour('--model-red');

/* A small white pill with text floating above the train */
function worldTag(
	text: string,
	stroke: number
): { sprite: THREE.Sprite; set: (label: string) => void } {
	const canvas = canvasEl(320, 84);
	const ctx = canvas.getContext('2d')!;
	const tex = new THREE.CanvasTexture(canvas);

	tex.colorSpace = THREE.SRGBColorSpace;

	const set = (label: string) => {
		ctx.clearRect(0, 0, 320, 84);
		ctx.font = `500 34px ${cssValue('--mono')}`;

		const width = Math.min(312, ctx.measureText(label).width + 44);
		const x0 = (320 - width) / 2;

		ctx.fillStyle = cssColour('--tag-plate');
		ctx.beginPath();
		ctx.roundRect(x0, 6, width, 72, 30);
		ctx.fill();
		ctx.strokeStyle = '#' + stroke.toString(16).padStart(6, '0');
		ctx.lineWidth = 2;
		ctx.stroke();
		ctx.fillStyle = cssColour('--model-ink');
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(label, 160, 43);
		tex.needsUpdate = true;
	};

	set(text);

	const sprite = new THREE.Sprite(
		new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })
	);

	sprite.scale.set(1.05, 1.05 / (320 / 84), 1);
	sprite.center.set(0.5, -0.4);
	sprite.renderOrder = 5;

	return { sprite, set };
}

export class Trains implements Part {
	readonly root = new THREE.Group();

	focus: TransitFocus = {
		skill: null,
		selected: null,
		hoverCity: null,
		hoverEdge: null,
		incident: 0
	};

	private trains: Train[] = [];
	private traffic: Traffic;
	private stripes: { line: Line; mat: THREE.MeshBasicMaterial; op: number }[] = [];
	private carPoint = new THREE.Vector3();
	private aheadPoint = new THREE.Vector3();

	constructor(
		scene: THREE.Scene,
		private net: Network,
		shadows: boolean
	) {
		scene.add(this.root);

		const stripeW = net.laneGap * 0.82;

		net.lines.forEach((line) => {
			const mat = new THREE.MeshBasicMaterial({
				color: line.colour,
				transparent: true,
				opacity: 0.6,
				depthWrite: false,
				polygonOffset: true,
				polygonOffsetFactor: -2,
				polygonOffsetUnits: -2
			});

			this.stripes.push({ line, mat, op: 0.6 });

			for (const seg of line.segments) {
				const mesh = new THREE.Mesh(stripGeo(seg.pts, 0, stripeW, guideHeight + 0.004), mat);

				mesh.renderOrder = 2;
				this.root.add(mesh);
			}
		});

		this.traffic = new Traffic(net);
		this.traffic.trains.forEach((state, index) => {
			const li = state.route.line;
			const line = net.lines[li];
			const body = new THREE.MeshStandardMaterial({
				color: hexColour('--white'),
				roughness: 0.5,
				transparent: true
			});
			const band = new THREE.MeshStandardMaterial({
				color: line.colour,
				roughness: 0.6,
				transparent: true
			});
			const cars: THREE.Group[] = [];

			for (let carIndex = 0; carIndex < carCount; carIndex++) {
				const car = new THREE.Group();
				const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.17, 0.5), body);

				bodyMesh.position.y = 0.1;
				bodyMesh.castShadow = shadows;

				const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.05, 0.5), band);
				stripe.position.y = 0.13;

				const roof = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.46), band);
				roof.position.y = 0.2;

				car.add(bodyMesh, stripe, roof);
				this.root.add(car);
				cars.push(car);
			}

			const tag = worldTag(line.packets[index % line.packets.length], line.colour);
			tag.sprite.material.opacity = 0;

			this.root.add(tag.sprite);
			this.trains.push({
				line,
				li,
				state,
				cars,
				mats: [body, band],
				tag: tag.sprite,
				tagText: tag.set,
				packet: index
			});
		});
	}

	/* Which lines are lit */
	active(): boolean[] | null {
		const focus = this.focus;
		const lines = this.net.lines;

		if (focus.skill) {
			return lines.map((line) => line.skill === focus.skill);
		}

		if (focus.selected && focus.selected !== 'core') {
			return lines.map((line) => line.users.includes(focus.selected!));
		}

		if (focus.hoverEdge !== null) {
			const edge = this.net.edges[focus.hoverEdge];
			return lines.map((_, i) => edge.lines.includes(i));
		}

		if (focus.hoverCity && focus.hoverCity !== 'core') {
			return lines.map((line) => line.users.includes(focus.hoverCity!));
		}

		return null;
	}

	update(dt: number, time: number): void {
		const act = this.active();
		const inc = this.focus.incident > 0.3;
		const ease = Math.min(1, dt * 5);

		this.stripes.forEach((stripe, i) => {
			const target = act ? (act[i] ? 1 : 0.06) : 0.8;
			stripe.op += (target - stripe.op) * ease;
			stripe.mat.opacity = stripe.op;
			stripe.mat.color.setHex(inc && Math.sin(time * 8) > 0 ? alarmRed : stripe.line.colour);
		});

		const arrived = this.traffic.step(dt, trainSpeed * (inc ? 0.3 : 1));
		const { carPoint, aheadPoint } = this;

		for (const train of this.trains) {
			if (arrived.includes(train.state)) {
				train.packet = (train.packet + 1) % train.line.packets.length;
				train.tagText(train.line.packets[train.packet]);
			}

			train.cars.forEach((car, carIndex) => {
				this.traffic.carPose(train.state, carIndex, carPoint, aheadPoint);
				car.position.copy(carPoint);
				car.lookAt(aheadPoint);
			});

			train.tag.position.copy(train.cars[0].position);
			train.tag.position.y += 0.32;

			const op = act ? (act[train.li] ? 1 : 0.22) : 1;

			for (const material of train.mats) {
				material.opacity += (op - material.opacity) * ease;
			}

			const tagOp = act && act[train.li] ? 1 : 0;
			const tm = train.tag.material;

			tm.opacity += (tagOp - tm.opacity) * ease;
			train.tag.visible = tm.opacity > 0.03;
		}
	}
}
