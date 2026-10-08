<script lang="ts">
	import Header from '#lib/components/Header.svelte';
</script>

<svelte:head>
	<title>Benjamin Meyer</title>
</svelte:head>

<Header />

<main>
	<section id="top" class="hero" aria-label="Introduction">
		<p class="eyebrow">Portfolio</p>
		<h1>Benjamin Meyer</h1>
		<p class="lead">Python, AWS and data systems. A new portfolio is on its way.</p>
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

	.hero {
		padding-top: calc(var(--header-h) + 80px);
	}

	h1 {
		margin: var(--space-8) 0 var(--space-16);
		font-size: var(--text-9xl);
		line-height: var(--leading-2xs);
		letter-spacing: var(--tracking-tight-xl);
		font-weight: var(--weight-semibold);
	}

	h2 {
		margin: var(--space-16) 0 0;
		font-size: var(--text-8xl);
		line-height: var(--leading-sm);
		letter-spacing: var(--tracking-tight-lg);
		font-weight: var(--weight-semibold);
	}

	.lead {
		font-size: var(--text-2xl);
		line-height: var(--leading-2xl);
		color: var(--ink-3);
	}

	@media (max-width: 767px) {
		section {
			padding: var(--space-64) var(--space-20);
		}

		.hero {
			padding-top: 120px;
		}

		h1 {
			font-size: var(--text-7xl);
		}

		h2 {
			font-size: var(--text-6xl);
		}
	}
</style>
