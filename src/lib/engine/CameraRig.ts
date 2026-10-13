import * as THREE from 'three';
import type { Part } from './MapScene.ts';
import { clamp } from './util.ts';

/* Where the camera is, as an orbit around a taget point - angles in radians */
export interface View {
	tx: number;
	ty: number;
	tz: number;
	distance: number;
	az: number;
	el: number;
}

/* Screen margins, in CSS pixels, that the overview has to keep clear */
export interface FitFrame {
	top: number;
	bottom: number;
	side: number;
}

/* A point that the overview must keep on screen */
export interface FitPoint {
	point: THREE.Vector3;
	lift?: number;
}

const viewKeys = ['tx', 'ty', 'tz', 'distance', 'az', 'el'] as const;

/* Orbit camer with smooth fly-to, drag orbits, ctrl + scroll zooms, plain scroll tilts */
export class CameraRig implements Part {
	view: View = { tx: 0, ty: 0, tz: 0, distance: 12, az: 0, el: 0.56 };
	goal: View = { ...this.view };

	dragged = false;
	wasDrag = false;

	minR = 4;
	maxR = 140;

	reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	onDragStart?: () => void;

	private pointers = new Map<number, { x: number; y: number }>();
	private drag: { x: number; y: number; az: number; el: number; moved: boolean } | null = null;
	private pinch: { gap: number; distance: number } | null = null;
	private ptr = { x: 0, y: 0 };
	private parallax = { x: 0, y: 0 };
	private fitCam = new THREE.PerspectiveCamera();
	private tmp = new THREE.Vector3();

	constructor(
		private camera: THREE.PerspectiveCamera,
		private canvas: HTMLCanvasElement
	) {
		canvas.addEventListener('pointerdown', this.onDown);
		canvas.addEventListener('pointermove', this.onMove);
		canvas.addEventListener('pointerup', this.onUp);
		canvas.addEventListener('pointercancel', this.onUp);
		canvas.addEventListener('pointerleave', this.onLeave);
		canvas.addEventListener('wheel', this.onWheel, { passive: false });
		canvas.style.cursor = 'grab';
	}

	/* Glide to a new view */
	flyTo(goal: Partial<View>): void {
		this.goal = { ...this.goal, ...goal };
	}

	/* Jump straight to the goal with no glide */
	snap(): void {
		this.view = { ...this.goal };
	}

	/* The closest overview that keeps every point inside the frame - from near to far */
	fit(
		points: FitPoint[],
		width: number,
		height: number,
		frame: FitFrame,
		at: { tx: number; tz: number; el: number }
	): View {
		const cam = this.fitCam;
		cam.fov = this.camera.fov;
		cam.aspect = width / height;
		cam.updateProjectionMatrix();

		const projected = this.tmp;

		for (let distance = this.minR; distance <= this.maxR; distance += 0.5) {
			cam.position.set(at.tx, distance * Math.sin(at.el), at.tz + distance * Math.cos(at.el));
			cam.lookAt(at.tx, 0, at.tz);
			cam.updateMatrixWorld();

			const fits = points.every((fitPoint) => {
				projected.copy(fitPoint.point).project(cam);
				const sx = ((projected.x + 1) / 2) * width;
				const sy = ((1 - projected.y) / 2) * height - (fitPoint.lift ?? 0) * height;

				return (
					sx >= frame.side &&
					sx <= width - frame.side &&
					sy >= frame.top &&
					sy <= height - frame.bottom
				);
			});

			if (fits) {
				return { tx: at.tx, ty: 0, tz: at.tz, distance, az: 0, el: at.el };
			}
		}

		return { tx: at.tx, ty: 0, tz: at.tz, distance: this.maxR, az: 0, el: at.el };
	}

	update(dt: number, time: number): void {
		const view = this.view;
		const goal = this.goal;
		const blend = 1 - Math.exp(-dt * (this.reduced ? 8 : 2.4));

		for (const key of viewKeys) {
			view[key] += (goal[key] - view[key]) * blend;
		}

		const still = this.reduced || this.dragged;
		this.parallax.x += (this.ptr.x - this.parallax.x) * 0.04;
		this.parallax.y += (this.ptr.y - this.parallax.y) * 0.04;

		const drift = still ? 0 : 0.08 * Math.sin(time * 0.11);
		const az = view.az + drift + (still ? 0 : this.parallax.x * 0.07);
		const el = clamp(view.el - (still ? 0 : this.parallax.y * 0.04), 0.15, 1.35);

		this.camera.position.set(
			view.tx + view.distance * Math.cos(el) * Math.sin(az),
			view.ty + view.distance * Math.sin(el),
			view.tz + view.distance * Math.cos(el) * Math.cos(az)
		);
		this.camera.lookAt(view.tx, view.ty, view.tz);
		this.camera.updateMatrixWorld();
	}

	dispose(): void {
		const canvas = this.canvas;
		canvas.removeEventListener('pointerdown', this.onDown);
		canvas.removeEventListener('pointermove', this.onMove);
		canvas.removeEventListener('pointerup', this.onUp);
		canvas.removeEventListener('pointercancel', this.onUp);
		canvas.removeEventListener('pointerleave', this.onLeave);
		canvas.removeEventListener('wheel', this.onWheel);
	}

	private onDown = (event: PointerEvent) => {
		this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
		this.wasDrag = false;

		if (this.pointers.size === 2) {
			this.drag = null;
			this.pinch = { gap: this.pinchDistance(), distance: this.goal.distance };
			return;
		}

		this.drag = {
			x: event.clientX,
			y: event.clientY,
			az: this.goal.az,
			el: this.goal.el,
			moved: false
		};

		this.canvas.setPointerCapture(event.pointerId);
	};

	private onMove = (event: PointerEvent) => {
		const rect = this.canvas.getBoundingClientRect();

		if (rect.width) {
			this.ptr = {
				x: (event.clientX - rect.left) / rect.width - 0.5,
				y: (event.clientY - rect.top) / rect.height - 0.5
			};
		}

		if (!this.pointers.has(event.pointerId)) {
			return;
		}

		this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

		if (this.pinch) {
			const distance = (this.pinch.distance * this.pinch.gap) / Math.max(1, this.pinchDistance());
			this.goal.distance = clamp(distance, this.minR, this.maxR);
			this.dragged = true;
			return;
		}

		const drag = this.drag;

		if (!drag) {
			return;
		}

		const dx = event.clientX - drag.x;
		const dy = event.clientY - drag.y;

		if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 6) {
			drag.moved = true;
			this.wasDrag = true;
			this.dragged = true;
			this.onDragStart?.();
		}

		if (drag.moved) {
			this.goal.az = drag.az - dx * 0.006;
			this.goal.el = clamp(drag.el + dy * 0.004, 0.22, 1.3);
			this.canvas.style.cursor = 'grabbing';
		}
	};

	private onUp = (event: PointerEvent) => {
		this.pointers.delete(event.pointerId);

		if (this.pointers.size < 2) {
			this.pinch = null;
		}

		this.drag = null;
		this.canvas.style.cursor = 'grab';
	};

	private onLeave = () => {
		this.ptr = { x: 0, y: 0 };
	};

	private onWheel = (event: WheelEvent) => {
		if (!event.ctrlKey && !event.metaKey) {
			return;
		}

		event.preventDefault();
		this.goal.distance = clamp(
			this.goal.distance * Math.exp(event.deltaY * 0.002),
			this.minR,
			this.maxR
		);

		this.dragged = true;
	};

	private pinchDistance(): number {
		const [first, second] = [...this.pointers.values()];
		return Math.hypot(first.x - second.x, first.y - second.y);
	}
}
