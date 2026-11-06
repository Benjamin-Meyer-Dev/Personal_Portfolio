<script lang="ts">
	import { projectList } from '#lib/data/index.ts';
	import { MapController } from '#lib/engine/MapController.ts';
	import { MapScene } from '#lib/engine/MapScene.ts';
	import { buildWorld } from '#lib/engine/world/index.ts';

	let canvas: HTMLCanvasElement;
	let ready = $state(false);
	let hint = $state<string | null>(null);

	$effect(() => {
		const map = new MapScene(canvas, { onReady: () => (ready = true) });
		const frame = { top: 84, bottom: 108, side: 24 };
		const world = buildWorld(map, projectList(), { fitTop: frame.top });

		const overview = () =>
			map.rig.fit(world.fitPoints, map.width, map.height, frame, { tx: 1, tz: 3.5, el: 0.56 });

		map.onResize = () => {
			if (!map.rig.dragged) {
				map.rig.flyTo(overview());
			}
		};

		map.add(
			new MapController(map, world, {
				onHover: (text) => (hint = text),
				onSelect: (id) => console.log('selected', id)
			})
		);

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

{#if hint}
	<p class="hover-text">{hint}</p>
{/if}

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

	.hover-text {
		position: absolute;
		left: 50%;
		bottom: var(--space-24);
		transform: translateX(-50%);
		margin: 0;
		padding: var(--space-8) var(--space-14);
		border-radius: var(--radius-pill);
		background: var(--glass-90);
		font-family: var(--mono);
		font-size: var(--text-xs);
		pointer-events: none;
	}
</style>
