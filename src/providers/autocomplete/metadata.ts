import { CompletionItemExtended, makeEmptyChildrenField } from "../../misc";
import { autoCompleteMetadata } from "./dump";
import * as monaco from "monaco-editor";

export function getModuleCompletions(range: monaco.Range) {
	if (!autoCompleteMetadata) return;
	const modules = [];
	const convertTagToLuauType = {
		bool: "boolean",
		RobloxScriptConnection: "RBXScriptConnection"
	};
	const libraries = autoCompleteMetadata.querySelectorAll("LuaLibrary");
	for (const library of libraries) {
		const module: CompletionItemExtended = {
			label: library.getAttribute("name")!,
			insertText: library.getAttribute("name")!,
			kind: monaco.languages.CompletionItemKind.Module,
			documentation: library.getAttribute("description")!,
			range,
			__children__: makeEmptyChildrenField([
				"Function", "Field"
			])
		};
		// functions
		for (const fn of library.querySelectorAll("Function")) {
			let sig = `function ${fn.getAttribute("name")}(`;
			let insertText = `${fn.getAttribute("name")}(`;
			const params = fn.querySelector("parameters");
			if (params) {
				const paramCount = params.children.length;
				let i = 1;
				let i2 = 1;
				for (
					const parameter of params
						.children
				) {
					sig = `${sig}${parameter.getAttribute("name")}: ${
						convertTagToLuauType[parameter.tagName as "bool"] ??
							parameter.tagName
					}${parameter.getAttribute("optional") ? "?" : ""}${
						i < paramCount ? ", " : ""
					}`;
					i += 1;
					insertText = i2 < paramCount
						? `${insertText}\${${i}:${
							parameter.getAttribute("name")
						}}, `
						: `${insertText}\${${i}:${
							parameter.getAttribute("name")
						}}`;
					i2 += 1;
				}
			}
			insertText = `${insertText})`;
			sig = `${sig})`;
			const thing = [];
			const rets = fn.querySelector("returns");
			if (rets) {
				for (const returned of rets.children) {
					thing.push(
						returned.getAttribute("name") === "..."
							? "..."
							//@ts-expect-error
							: convertTagToLuauType[returned.tagName] ??
								returned.tagName,
					);
				}
			}
			if (thing.length >= 1) sig = `${sig}: ${thing.join(", ")}`;
			//@ts-expect-error
			module.__children__.Function[fn.getAttribute("name")!] = {
				insertText: insertText,
				documentation: {
					value: [
						"```lua",
						`${sig}`,
						"```",
						"",
						fn
							.querySelector("description")!
							.textContent!.split("\n")
							.map((line) => line.trimStart())
							.join("\n"),
					].join("\n"),
				},
			};
			// Properties
			if (library.querySelector("Properties")) {
				for (
					const property of library.querySelector("Properties")!
						.children
				) {
					//@ts-expect-error
					module.__children__.Field[property.getAttribute("name")!] =
						{
							documentation: {
								value: [
									property.textContent!
										.split("\n")
										.map((line) => line.trimStart())
										.join("\n"),
								].join("\n"),
							},
							detail: property.tagName,
						};
				}
			}
		}
		modules.push(module);
	}
	console.log(modules);
	return modules;
}

