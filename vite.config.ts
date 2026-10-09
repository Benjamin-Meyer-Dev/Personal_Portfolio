import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';

// GitHub Pages serves this repository at /Personal_Portfolio. The deploy workflow sets BASE_PATH to
// that, so every page, script and image is built under it. Locally it isn't set: the site runs at /.
const base = (process.env.BASE_PATH ?? '') as '' | `/${string}`;

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			paths: { base },

			// Every page is prerendered to plain HTML in build/, which GitHub Pages serves as-is.
			adapter: adapter({ strict: true })
		})
	],
	test: {
		expect: { requireAssertions: true },
		css: { include: [/global\.css/] },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
