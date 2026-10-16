import * as THREE from 'three';
import type { MapScene } from './MapScene.ts';
import { hexColour } from '#lib/styles/tokens.ts';

export const studio = {
	background: hexColour('--map-bg'),
	fog: { color: hexColour('--map-bg'), near: 78, far: 180 },
	ambient: { color: hexColour('--light-ambient'), intensity: 0.75 },
	key: { color: hexColour('--light-sun'), intensity: 3.3, position: [-11, 19, 8] as const },
	rim: { color: hexColour('--light-rim'), intensity: 0.4, position: [-10, 6, -12] as const },
	fx: { tilt: 0.85, tiltY: 0.5, tiltW: 0.3, vignette: 0.12, grain: 0.018 },
	incidentTint: [1.06, 0.93, 0.93] as const
};

const fullscreenVertex = `varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const blurFragment = `uniform sampler2D tDiffuse; uniform vec2 dir; varying vec2 vUv;
void main() {
	vec3 s = texture2D(tDiffuse, vUv).rgb * 0.227027;
	s += texture2D(tDiffuse, vUv + dir * 1.384615).rgb * 0.316216;
	s += texture2D(tDiffuse, vUv - dir * 1.384615).rgb * 0.316216;
	s += texture2D(tDiffuse, vUv + dir * 3.230769).rgb * 0.07027;
	s += texture2D(tDiffuse, vUv - dir * 3.230769).rgb * 0.07027;
	gl_FragColor = vec4(s, 1.0);
}`;

const compositeFragment = `uniform sampler2D tScene; uniform sampler2D tA; uniform sampler2D tB;
uniform float uTilt; uniform float uTiltY; uniform float uTiltW; uniform float uVig; uniform float uGrain;
uniform float uInc; uniform vec3 uIncTint; varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
	vec3 s = texture2D(tScene, vUv).rgb;
	vec3 a = texture2D(tA, vUv).rgb;
	vec3 b = texture2D(tB, vUv).rgb;
	float k = smoothstep(uTiltW, uTiltW + 0.3, abs(vUv.y - uTiltY)) * uTilt;
	vec3 c = mix(s, mix(a, b, k), k);
	float v = smoothstep(1.2, 0.3, length((vUv - 0.5) * vec2(1.3, 1.0)));
	c *= mix(1.0 - uVig, 1.0, v);
	c = mix(c, c * uIncTint, uInc * 0.55);
	c *= 1.0 + uGrain * (hash(gl_FragCoord.xy) - 0.5);
	gl_FragColor = vec4(c, 1.0);
	#include <colorspace_fragment>
}`;

/* Renders the scene off screen, blurs two smaller copies then composites them with the tilt-shift mask */
export class TiltShift {
	incident = 0;

	private scene: THREE.WebGLRenderTarget;
	private half = [new THREE.WebGLRenderTarget(4, 4), new THREE.WebGLRenderTarget(4, 4)];
	private quarter = [new THREE.WebGLRenderTarget(4, 4), new THREE.WebGLRenderTarget(4, 4)];
	private quad: THREE.Mesh;
	private quadScene = new THREE.Scene();
	private quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
	private blur: THREE.ShaderMaterial;
	private comp: THREE.ShaderMaterial;
	private size = { hw: 1, hh: 1, qw: 1, qh: 1 };

	constructor(
		private renderer: THREE.WebGLRenderer,
		lite: boolean
	) {
		this.scene = new THREE.WebGLRenderTarget(4, 4, {
			type: THREE.HalfFloatType,
			samples: lite ? 0 : 2
		});

		for (const target of [...this.half, ...this.quarter]) {
			target.texture.type = THREE.HalfFloatType;
		}

		this.blur = new THREE.ShaderMaterial({
			uniforms: { tDiffuse: { value: null }, dir: { value: new THREE.Vector2() } },
			vertexShader: fullscreenVertex,
			fragmentShader: blurFragment,
			depthTest: false,
			depthWrite: false
		});

		const effects = studio.fx;

		this.comp = new THREE.ShaderMaterial({
			uniforms: {
				tScene: { value: null },
				tA: { value: null },
				tB: { value: null },
				uTilt: { value: effects.tilt },
				uTiltY: { value: effects.tiltY },
				uTiltW: { value: effects.tiltW },
				uVig: { value: effects.vignette },
				uGrain: { value: effects.grain },
				uInc: { value: 0 },
				uIncTint: { value: new THREE.Vector3(...studio.incidentTint) }
			},
			vertexShader: fullscreenVertex,
			fragmentShader: compositeFragment,
			depthTest: false,
			depthWrite: false
		});

		this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.blur);
		this.quad.frustumCulled = false;
		this.quadScene.add(this.quad);
	}

	setSize(width: number, height: number, dpr: number): void {
		this.scene.setSize(Math.max(1, Math.round(width * dpr)), Math.max(1, Math.round(height * dpr)));
		const hw = Math.max(1, Math.round((width / 2) * Math.min(1, dpr)));
		const hh = Math.max(1, Math.round((height / 2) * Math.min(1, dpr)));
		const qw = Math.max(1, Math.round(hw / 2));
		const qh = Math.max(1, Math.round(hh / 2));

		for (const target of this.half) {
			target.setSize(hw, hh);
		}

		for (const target of this.quarter) {
			target.setSize(qw, qh);
		}

		this.size = { hw, hh, qw, qh };
	}

	private pass(mat: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null): void {
		this.quad.material = mat;
		this.renderer.setRenderTarget(target);
		this.renderer.render(this.quadScene, this.quadCam);
	}

	private blurInto(src: THREE.Texture, dst: THREE.WebGLRenderTarget, dx: number, dy: number): void {
		this.blur.uniforms.tDiffuse.value = src;
		this.blur.uniforms.dir.value.set(dx, dy);
		this.pass(this.blur, dst);
	}

	render(scene: THREE.Scene, camera: THREE.Camera): void {
		const renderer = this.renderer;
		const { hw, hh, qw, qh } = this.size;

		renderer.setRenderTarget(this.scene);
		renderer.clear();
		renderer.render(scene, camera);

		this.blurInto(this.scene.texture, this.half[0], 1 / hw, 0);
		this.blurInto(this.half[0].texture, this.half[1], 0, 1 / hh);
		this.blurInto(this.half[1].texture, this.quarter[0], 2 / qw, 0);
		this.blurInto(this.quarter[0].texture, this.quarter[1], 0, 2 / qh);

		const uniforms = this.comp.uniforms;
		uniforms.tScene.value = this.scene.texture;
		uniforms.tA.value = this.half[1].texture;
		uniforms.tB.value = this.quarter[1].texture;
		uniforms.uInc.value = this.incident;

		this.pass(this.comp, null);
	}

	dispose(): void {
		for (const target of [this.scene, ...this.half, ...this.quarter]) {
			target.dispose();
		}

		this.blur.dispose();
		this.comp.dispose();
		this.quad.geometry.dispose();
	}
}

export interface Look {
	key: THREE.DirectionalLight;
	shadows: boolean;
}

/* Lights, fog and shadows */
export function applyStudioLook(map: MapScene): Look {
	const { scene, renderer } = map;
	const look = studio;
	const shadows = !map.opts.lite;

	renderer.setClearColor(look.background, 1);
	renderer.toneMapping = THREE.NoToneMapping;
	scene.fog = new THREE.Fog(look.fog.color, look.fog.near, look.fog.far);
	scene.add(new THREE.AmbientLight(look.ambient.color, look.ambient.intensity));

	const key = new THREE.DirectionalLight(look.key.color, look.key.intensity);
	key.position.set(...look.key.position);
	scene.add(key, key.target);

	const rim = new THREE.DirectionalLight(look.rim.color, look.rim.intensity);
	rim.position.set(...look.rim.position);
	scene.add(rim);

	if (shadows) {
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFShadowMap;
		key.castShadow = true;
		key.shadow.mapSize.set(2048, 2048);

		const cam = key.shadow.camera;
		cam.left = cam.bottom = -33;
		cam.right = cam.top = 33;
		cam.near = 1;
		cam.far = 90;
		key.shadow.bias = -0.0005;
		key.shadow.normalBias = 0.03;
	}

	map.setFx(new TiltShift(renderer, Boolean(map.opts.lite)));
	map.qualitySteps = [
		() => {
			key.castShadow = false;
		},
		() => map.setPixelRatio(1),
		() => map.setFx(null)
	];

	return { key, shadows };
}
