// Run: deno run --allow-read --allow-write data/scripts/create-themes-json.ts
const themes = [];
for await (const file of Deno.readDir("./")) {
	if (!file.isFile || (file.isFile && !file.name.endsWith(".json"))) continue;

	themes.push(file.name);
}

await Deno.writeTextFile("./data/themes.json", JSON.stringify(themes, null, 2));

console.log("Done!");

export {};
