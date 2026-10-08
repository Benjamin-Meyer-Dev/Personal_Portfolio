<script lang="ts">
	import '@fontsource/instrument-sans/latin-400.css';
	import '@fontsource/instrument-sans/latin-500.css';
	import '@fontsource/instrument-sans/latin-600.css';
	import '@fontsource/instrument-sans/latin-700.css';
	import '@fontsource/geist-mono/latin-400.css';
	import '@fontsource/geist-mono/latin-500.css';
	import '@fontsource/geist-mono/latin-600.css';
	import '#lib/styles/global.css';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
