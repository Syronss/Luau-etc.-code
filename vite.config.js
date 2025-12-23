import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";

// https://stackoverflow.com/questions/72618944/get-error-to-build-my-project-in-vite-top-level-await-is-not-available-in-the
// seriously, screw your IE 11, why would we want to support it?
// oh, and your chrome 88 or something, don't care.
// if it's more than 8 or 10 years old, probably shouldn't be supported.
export default defineConfig({
	build: {
		target: "esnext", //browsers can handle the latest ES features
		sourcemap: "inline"
	},
	plugins: [
		wasm() // needed for StyLua (formatter), and probably later for full-moon (Luau parser)
	]
});
