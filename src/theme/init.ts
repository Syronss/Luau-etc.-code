import initThemes from "./register";
import setupThemes from "./themeSetup";

export default async function init() {
	await initThemes();
	await setupThemes();
}
