import { CompletionItemExtended, makeEmptyChildrenField } from "../../misc";
import { autoCompleteMetadata } from "./dump";
import * as monaco from "monaco-editor";

const convertTagToLuauType: Record<string, string> = {
	bool: "boolean",
	RobloxScriptConnection: "RBXScriptConnection",
	string: "string",
	number: "number",
	table: "table",
	function: "function",
	nil: "nil",
	variant: "any",
	value: "any"
};

// LuaLibrary parse (math, string, table vb.)
function parseLuaLibraries(range: monaco.Range): CompletionItemExtended[] {
	if (!autoCompleteMetadata) return [];
	
	const modules: CompletionItemExtended[] = [];
	const libraries = autoCompleteMetadata.querySelectorAll("LuaLibrary");
	
	for (const library of libraries) {
		const module: CompletionItemExtended = {
			label: library.getAttribute("name")!,
			insertText: library.getAttribute("name")!,
			kind: monaco.languages.CompletionItemKind.Module,
			documentation: library.getAttribute("description") || undefined,
			range,
			__children__: makeEmptyChildrenField(["Function", "Field"])
		};
		
		// Functions
		for (const fn of library.querySelectorAll("Function")) {
			const funcName = fn.getAttribute("name")!;
			let sig = `function ${funcName}(`;
			let insertText = `${funcName}(`;
			
			const params = fn.querySelector("parameters");
			if (params) {
				const paramCount = params.children.length;
				let snippetIndex = 1;
				
				for (let i = 0; i < params.children.length; i++) {
					const parameter = params.children[i];
					const paramName = parameter.getAttribute("name")!;
					const paramType = convertTagToLuauType[parameter.tagName] || parameter.tagName;
					const isOptional = parameter.getAttribute("optional") === "true";
					
					sig += `${paramName}: ${paramType}${isOptional ? '?' : ''}`;
					if (i < paramCount - 1) sig += ', ';
					
					insertText += `\${${snippetIndex}:${paramName}}`;
					if (i < paramCount - 1) insertText += ', ';
					snippetIndex++;
				}
			}
			
			insertText += ')';
			sig += ')';
			
			// Return types
			const returns = fn.querySelector("returns");
			const returnTypes: string[] = [];
			if (returns) {
				for (const returned of returns.children) {
					const returnName = returned.getAttribute("name");
					if (returnName === "...") {
						returnTypes.push("...");
					} else {
						returnTypes.push(convertTagToLuauType[returned.tagName] || returned.tagName);
					}
				}
			}
			
			if (returnTypes.length > 0) {
				sig += `: ${returnTypes.join(', ')}`;
			}
			
			const description = fn.querySelector("description")?.textContent
				?.split("\n")
				.map(line => line.trimStart())
				.join("\n") || '';
			
			module.__children__!.Function!.push({
				label: funcName,
				kind: monaco.languages.CompletionItemKind.Function,
				insertText: insertText,
				insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
				documentation: {
					value: ['```lua', sig, '```', '', description].join('\n')
				},
				range
			});
		}
		
		// Properties
		const propsElement = library.querySelector("Properties");
		if (propsElement) {
			for (const property of propsElement.children) {
				const propName = property.getAttribute("name")!;
				const propType = convertTagToLuauType[property.tagName] || property.tagName;
				const description = property.textContent
					?.split("\n")
					.map(line => line.trimStart())
					.join("\n") || '';
				
				module.__children__!.Field!.push({
					label: propName,
					kind: monaco.languages.CompletionItemKind.Field,
					insertText: propName,
					detail: propType,
					documentation: description,
					range
				});
			}
		}
		
		modules.push(module);
	}
	
	return modules;
}

// ItemStruct parse (Vector3, CFrame, Color3 vb.)
function parseItemStructs(range: monaco.Range): CompletionItemExtended[] {
	if (!autoCompleteMetadata) return [];
	
	const structs: CompletionItemExtended[] = [];
	const itemStructs = autoCompleteMetadata.querySelectorAll("ItemStruct");
	
	for (const struct of itemStructs) {
		const structName = struct.getAttribute("name")!;
		
		const item: CompletionItemExtended = {
			label: structName,
			insertText: structName,
			kind: monaco.languages.CompletionItemKind.Struct,
			documentation: `Roblox data type: ${structName}`,
			range,
			__children__: makeEmptyChildrenField(["Function", "Property", "Constructor"])
		};
		
		// Constructors (new)
		for (const ctor of struct.querySelectorAll("Function[static='true']")) {
			const funcName = ctor.getAttribute("name")!;
			if (funcName !== 'new') continue; // Sadece constructor'ları al
			
			let sig = `${structName}.new(`;
			let insertText = `${structName}.new(`;
			
			const params = ctor.querySelector("parameters");
			if (params) {
				const paramList: string[] = [];
				const snippetList: string[] = [];
				let snippetIndex = 1;
				
				for (const parameter of params.children) {
					const paramName = parameter.getAttribute("name")!;
					const paramType = convertTagToLuauType[parameter.tagName] || parameter.tagName;
					const isOptional = parameter.getAttribute("optional") === "true";
					
					paramList.push(`${paramName}: ${paramType}${isOptional ? '?' : ''}`);
					snippetList.push(`\${${snippetIndex}:${paramName}}`);
					snippetIndex++;
				}
				
				sig += paramList.join(', ');
				insertText += snippetList.join(', ');
			}
			
			insertText += ')';
			sig += ')';
			
			const returns = ctor.querySelector("returns");
			if (returns?.children[0]) {
				sig += `: ${returns.children[0].tagName}`;
			}
			
			const description = ctor.querySelector("description")?.textContent
				?.split("\n")
				.map(line => line.trimStart())
				.join("\n") || '';
			
			item.__children__!.Constructor!.push({
				label: `${structName}.new`,
				kind: monaco.languages.CompletionItemKind.Constructor,
				insertText: insertText,
				insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
				documentation: {
					value: ['```lua', sig, '```', '', description].join('\n')
				},
				range
			});
		}
		
		// Methods
		for (const method of struct.querySelectorAll("Function:not([static='true'])")) {
			const methodName = method.getAttribute("name")!;
			let sig = `${structName}:${methodName}(`;
			let insertText = `${methodName}(`;
			
			const params = method.querySelector("parameters");
			if (params) {
				const paramList: string[] = [];
				const snippetList: string[] = [];
				let snippetIndex = 1;
				
				for (const parameter of params.children) {
					const paramName = parameter.getAttribute("name")!;
					const paramType = convertTagToLuauType[parameter.tagName] || parameter.tagName;
					
					paramList.push(`${paramName}: ${paramType}`);
					snippetList.push(`\${${snippetIndex}:${paramName}}`);
					snippetIndex++;
				}
				
				sig += paramList.join(', ');
				insertText += snippetList.join(', ');
			}
			
			insertText += ')';
			sig += ')';
			
			const returns = method.querySelector("returns");
			const returnTypes: string[] = [];
			if (returns) {
				for (const returned of returns.children) {
					returnTypes.push(convertTagToLuauType[returned.tagName] || returned.tagName);
				}
			}
			if (returnTypes.length > 0) {
				sig += `: ${returnTypes.join(', ')}`;
			}
			
			const description = method.querySelector("description")?.textContent
				?.split("\n")
				.map(line => line.trimStart())
				.join("\n") || '';
			
			item.__children__!.Function!.push({
				label: methodName,
				kind: monaco.languages.CompletionItemKind.Method,
				insertText: insertText,
				insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
				documentation: {
					value: ['```lua', sig, '```', '', description].join('\n')
				},
				range
			});
		}
		
		// Properties
		const propsElement = struct.querySelector("Properties");
		if (propsElement) {
			for (const property of propsElement.children) {
				const propName = property.getAttribute("name")!;
				const propType = convertTagToLuauType[property.tagName] || property.tagName;
				const description = property.textContent
					?.split("\n")
					.map(line => line.trimStart())
					.join("\n") || '';
				
				item.__children__!.Property!.push({
					label: propName,
					kind: monaco.languages.CompletionItemKind.Property,
					insertText: propName,
					detail: propType,
					documentation: description,
					range
				});
			}
		}
		
		structs.push(item);
	}
	
	return structs;
}

export function getModuleCompletions(range: monaco.Range): CompletionItemExtended[] {
	if (!autoCompleteMetadata) return [];
	
	return [
		...parseLuaLibraries(range),
		...parseItemStructs(range)
	];
}
