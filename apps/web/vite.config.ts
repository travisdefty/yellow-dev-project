import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			adapter: adapter()
		})
	],
	ssr: {
		// Source-only workspace package (exports .ts). Bundle it and zod so the Node adapter
		// does not try to resolve them from node_modules at prerender or runtime.
		noExternal: ['@yellow/domain', 'zod']
	}
});
