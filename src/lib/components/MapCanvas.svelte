<script lang="ts">
	import * as THREE from 'three';
	import { MapScene } from '#lib/engine/MapScene.ts';
	import { hexColour } from '#lib/styles/tokens.ts';

	let canvas: HTMLCanvasElement;
	let ready = $state(false);

	$effect(() => {
		const map = new MapScene(canvas, { onReady: () => (ready = true) });

		const cube = new THREE.Mesh(
			new THREE.BoxGeometry(2, 2, 2),
			new THREE.MeshStandardMaterial({ color: hexColour('--cloud-accent') })
		);

		map.scene.add(cube);
		map.scene.add(new THREE.AmbientLight(hexColour('--white'), 1));

		const sun = new THREE.DirectionalLight(hexColour('--white'), 2);
		sun.position.set(-11, 19, 8);

		map.scene.add(sun);
		map.add({
			update: (dt) => {
				cube.rotation.y += dt * 0.6;
			}
		});

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
