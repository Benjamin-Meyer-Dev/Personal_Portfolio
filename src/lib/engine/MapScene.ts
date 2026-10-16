import * as THREE from 'three';
import { CameraRig } from './CameraRig';
import type { TiltShift } from './look.ts';
import { hexColour } from '#lib/styles/tokens.ts';

export interface MapSceneOptions {
	lite?: boolean;
	onReady?: () => void;
}

/* Anything that changes over time */
export interface Part {
	update(dt: number, time: number): void;
	dispose?(): void;
}

/* Owns the WebGL renderer, the scene and the render loop */
export class MapScene {
	readonly renderer: THREE.WebGLRenderer;
	readonly scene = new THREE.Scene();
	readonly camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 300);
	readonly rig: CameraRig;

	width = 0;
	height = 0;
	time = 0;
	frames = 0;

	onResize?: () => void;
	fx: TiltShift | null = null;
	qualitySteps: (() => void)[] = [];

	private dpr: number;
	private perf = { samples: 0, sum: 0, level: 0 };
	private parts: Part[] = [];
	private raf = 0;
	private last = 0;
	private onScreen = true;
	private shown = false;
	private io: IntersectionObserver;
	private ro: ResizeObserver;

	constructor(
		readonly canvas: HTMLCanvasElement,
		readonly opts: MapSceneOptions = {}
	) {
		this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
		this.dpr = Math.min(opts.lite ? 1.25 : 1.5, window.devicePixelRatio || 1);
		this.renderer.setPixelRatio(this.dpr);
		this.renderer.setClearColor(hexColour('--map-bg'), 1);

		this.rig = this.add(new CameraRig(this.camera, canvas));

		this.io = new IntersectionObserver(
			(entries) => {
				this.onScreen = entries.at(-1)?.isIntersecting ?? true;
			},
			{ rootMargin: '160px' }
		);
		this.io.observe(canvas);

		this.ro = new ResizeObserver(() => this.resize());
		this.ro.observe(canvas);
		this.resize();

		if (import.meta.env.DEV || location.search.includes('debug')) {
			(window as unknown as { debugMap: MapScene }).debugMap = this;
		}
	}

	/* Register something that needs updating every frame */
	add<T extends Part>(part: T): T {
		this.parts.push(part);
		return part;
	}

	start(): void {
		if (this.raf) {
			return;
		}

		const loop = (ts: number) => {
			this.raf = requestAnimationFrame(loop);
			this.frame(ts);
		};

		this.raf = requestAnimationFrame(loop);
	}

	stop(): void {
		cancelAnimationFrame(this.raf);
		this.raf = 0;
	}

	/* Swap the post-processing pass */
	setFx(fx: TiltShift | null): void {
		this.fx?.dispose();
		this.fx = fx;
		fx?.setSize(this.width, this.height, this.dpr);
	}

	setPixelRatio(dpr: number): void {
		this.dpr = dpr;
		this.renderer.setPixelRatio(dpr);
		this.resize(true);
	}

	private resize(force = false): void {
		const width = this.canvas.clientWidth;
		const height = this.canvas.clientHeight;

		if (!width || !height || (!force && width === this.width && height === this.height)) {
			return;
		}

		this.width = width;
		this.height = height;
		this.renderer.setSize(width, height, false);
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
		this.fx?.setSize(width, height, this.dpr);
		this.onResize?.();
	}

	private frame(ts: number): void {
		if (!this.onScreen || document.hidden) {
			this.last = 0;
			return;
		}

		const raw = this.last ? (ts - this.last) / 1000 : 1 / 60;
		const dt = Math.min(0.05, raw);

		this.last = ts;
		this.time += dt;
		this.frames++;

		for (const part of this.parts) {
			part.update(dt, this.time);
		}

		this.render();
		this.adapt(raw);

		if (!this.shown) {
			this.shown = true;
			this.opts.onReady?.();
		}
	}

	protected render(): void {
		if (this.fx) {
			this.fx.render(this.scene, this.camera);
		} else {
			this.renderer.render(this.scene, this.camera);
		}
	}

	private adapt(raw: number): void {
		const perf = this.perf;

		if (raw > 0.5 || perf.level >= this.qualitySteps.length) {
			return;
		}

		perf.samples++;
		perf.sum += raw;

		if (perf.samples < 90) {
			return;
		}

		const avg = perf.sum / perf.samples;
		perf.samples = 0;
		perf.sum = 0;

		if (avg < 1 / 32) {
			return;
		}

		this.qualitySteps[perf.level++]();
	}

	/* Free everything on the GPU */
	dispose(): void {
		this.stop();
		this.io.disconnect();
		this.ro.disconnect();

		for (const part of this.parts) {
			part.dispose?.();
		}

		this.fx?.dispose();

		this.scene.traverse((obj) => {
			const mesh = obj as THREE.Mesh;
			mesh.geometry?.dispose();

			const mats = Array.isArray(mesh.material)
				? mesh.material
				: mesh.material
					? [mesh.material]
					: [];

			for (const material of mats) {
				for (const value of Object.values(material)) {
					if (value instanceof THREE.Texture) {
						value.dispose();
					}
				}

				material.dispose();
			}
		});

		this.renderer.dispose();
	}
}
