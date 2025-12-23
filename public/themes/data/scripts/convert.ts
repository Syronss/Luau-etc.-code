/// <reference lib="deno.ns" />
const checkJsonFile = async (file: string) => {
	const data = JSON.parse(await Deno.readTextFile(file));

	if (
		!("$schema" in data) ||
		("$schema" in data &&
			data["$schema"] !== "./data/schemas/Theme.schema.json")
	) {
		data["$schema"] = "./data/schemas/Theme.schema.json";
	}

	await Deno.writeTextFile(file, JSON.stringify(data, null, 4));
};

for await (const file of Deno.readDir(".")) {
	if (!file.isFile) continue;
	if (file.name.endsWith(".json")) {
		await checkJsonFile(file.name);
	}
}

console.log("Done!");

export {};
