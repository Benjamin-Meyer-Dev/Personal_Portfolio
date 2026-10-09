<script lang="ts">
	import Header from '#lib/components/Header.svelte';
	import MapCanvas from '#lib/components/MapCanvas.svelte';
</script>

<svelte:head>
	<title>Benjamin Meyer</title>
</svelte:head>

<Header />

<main>
	<section id="top" class="map" aria-label="Interactive 3D map of my work">
		<h1 class="visually-hidden">Benjamin Meyer, Python, AWS and Data Systems</h1>
		<MapCanvas />
	</section>

	<section id="systems" aria-labelledby="systems-h">
		<p class="eyebrow">01 / Systems</p>
		<h2 id="systems-h">Everything I've built, grouped by type.</h2>
	</section>

	<section id="experience" aria-labelledby="experience-h">
		<p class="eyebrow">02 / Experience</p>
		<h2 id="experience-h">Release notes.</h2>
	</section>

	<section id="contact" aria-labelledby="contact-h">
		<p class="eyebrow">03 / Contact</p>
		<h2 id="contact-h">Want to talk systems, cloud, or a role on your team?</h2>
	</section>
</main>

<style>
	section {
		max-width: var(--page-width);
		margin: 0 auto;
		padding: 110px var(--space-32);
		border-bottom: 1px solid var(--line);
	}

	.map {
		position: relative;
		max-width: none;
		height: clamp(600px, 100vh, 1080px);
		padding: 0;
		overflow: hidden;
		background: var(--map-bg);
	}

	h2 {
		margin: var(--space-16) 0 0;
		font-size: var(--text-8xl);
		line-height: var(--leading-sm);
		letter-spacing: var(--tracking-tight-lg);
		font-weight: var(--weight-semibold);
	}

	@media (max-width: 767px) {
		section {
			padding: var(--space-64) var(--space-20);
		}

		.map {
			height: 392px;
			margin-top: 60px;
		}

		h2 {
			font-size: var(--text-6xl);
		}
	}
</style>
