import { decompress } from "https://deno.land/x/zip@v1.2.5/mod.ts";

const archiveUrl =
	"https://github.com/brijeshb42/monaco-themes/archive/master.zip";

const buffer = await (await fetch(archiveUrl)).arrayBuffer();
await Deno.writeFile(
	`${Deno.cwd()}\\monaco-themes.zip`,
	new Uint8Array(buffer)
);

await decompress(
	`${Deno.cwd()}\\monaco-themes.zip`,
	`${Deno.cwd()}\\monaco-themes`
);
// we won't use this any-more, so we'll delete it.
await Deno.remove(`${Deno.cwd()}\\monaco-themes.zip`);

console.log(
	"Decompression completed successfully! Now we'll enumerate through every theme in the themes folder."
);
for await (const entry of Deno.readDir(
	`${Deno.cwd()}\\monaco-themes\\monaco-themes-master\\themes`
)) {
	if (!entry.isFile || !entry.name.endsWith(".json")) continue;

	const path = `${Deno.cwd()}\\monaco-themes\\${entry.name}`;
	await Deno.mkdir(`${Deno.cwd()}\\themes`);
	await Deno.copyFile(path, `${Deno.cwd()}\\themes\\${entry.name}`);
}
console.info(`Archive file: ${Deno.cwd()}\\monaco-themes.zip`);
console.info(`de-compressed archive folder: ${Deno.cwd()}\\monaco-themes`);
