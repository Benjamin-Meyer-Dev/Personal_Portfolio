import * as THREE from 'three';
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

	width = 0;
	height = 0;
	time = 0;
	frames = 0;

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
		this.renderer.setPixelRatio(Math.min(opts.lite ? 1.25 : 2, window.devicePixelRatio || 1));
		this.renderer.setClearColor(hexColour('--map-bg'), 1);

		this.camera.position.set(0, 6, 10);
		this.camera.lookAt(0, 0, 0);

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

	private resize(): void {
		const width = this.canvas.clientWidth;
		const height = this.canvas.clientHeight;

		if (!width || !height || (width === this.width && height === this.height)) {
			return;
		}

		this.width = width;
		this.height = height;
		this.renderer.setSize(width, height, false);
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
	}

	private frame(ts: number): void {
		if (!this.onScreen || document.hidden) {
			this.last = 0;
			return;
		}

		const dt = this.last ? Math.min(0.05, (ts - this.last) / 1000) : 1 / 60;

		this.last = ts;
		this.time += dt;
		this.frames++;

		for (const part of this.parts) {
			part.update(dt, this.time);
		}

		this.render();

		if (!this.shown) {
			this.shown = true;
			this.opts.onReady?.();
		}
	}

	protected render(): void {
		this.renderer.render(this.scene, this.camera);
	}

	/* Free everything on the GPU */
	dispose(): void {
		this.stop();
		this.io.disconnect();
		this.ro.disconnect();

		for (const part of this.parts) {
			part.dispose?.();
		}

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
