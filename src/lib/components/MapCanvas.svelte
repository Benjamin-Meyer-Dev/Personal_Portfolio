<script lang="ts">
	import { projectList } from '#lib/data/index.ts';
	import { MapScene } from '#lib/engine/MapScene.ts';
	import { buildWorld } from '#lib/engine/world/index.ts';

	let canvas: HTMLCanvasElement;
	let ready = $state(false);

	$effect(() => {
		const map = new MapScene(canvas, { onReady: () => (ready = true) });
		const world = buildWorld(map, projectList());

		const overview = () =>
			map.rig.fit(
				world.fitPoints,
				map.width,
				map.height,
				{ top: 84, bottom: 108, side: 24 },
				{
					tx: 1,
					tz: 3.5,
					el: 0.56
				}
			);

		map.onResize = () => {
			if (!map.rig.dragged) {
				map.rig.flyTo(overview());
			}
		};

		map.rig.minR = 22;
		map.rig.flyTo(overview());
		map.rig.snap();

		if (import.meta.env.DEV || location.search.includes('debug')) {
			(window as unknown as { debugWorld: typeof world }).debugWorld = world;
		}

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
