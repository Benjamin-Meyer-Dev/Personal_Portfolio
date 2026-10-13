<script lang="ts">
	import * as THREE from 'three';
	import { MapScene } from '#lib/engine/MapScene.ts';
	import type { FitPoint } from '#lib/engine/CameraRig.ts';
	import { hexColour } from '#lib/styles/tokens.ts';

	let canvas: HTMLCanvasElement;
	let ready = $state(false);

	$effect(() => {
		const map = new MapScene(canvas, { onReady: () => (ready = true) });

		const cube = new THREE.Mesh(
			new THREE.BoxGeometry(2, 2, 2),
			new THREE.MeshStandardMaterial({ color: hexColour('--cloud-accent') })
		);

		cube.position.y = 1;

		map.scene.add(cube);
		map.scene.add(new THREE.AmbientLight(hexColour('--white'), 1));

		const sun = new THREE.DirectionalLight(hexColour('--white'), 2);
		sun.position.set(-11, 19, 8);

		map.scene.add(sun);
		map.scene.add(
			new THREE.GridHelper(20, 20, hexColour('--grid-major'), hexColour('--grid-minor'))
		);

		const fitPoints: FitPoint[] = [];

		for (const x of [-1, 1]) {
			for (const y of [0, 2]) {
				for (const z of [-1, 1]) {
					fitPoints.push({ point: new THREE.Vector3(x, y, z) });
				}
			}
		}

		const overview = () =>
			map.rig.fit(
				fitPoints,
				map.width,
				map.height,
				{ top: 84, bottom: 108, side: 24 },
				{ tx: 0, tz: 0, el: 0.56 }
			);

		map.onResize = () => {
			if (!map.rig.dragged) {
				map.rig.flyTo(overview());
			}
		};

		map.rig.flyTo(overview());
		map.rig.snap();
		map.start();

		return () => map.dispose();
	});
</script>

<canvas
	bind:this={canvas}
	class:ready
	aria-label="A 3D model of my projects, set out as islands in a lake."
></canvas>

<style>
	canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
		touch-action: pan-y;
		opacity: 0;
		transition: opacity var(--duration-fade) var(--ease-standard);
	}

	canvas.ready {
		opacity: 1;
	}
</style>
