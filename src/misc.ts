import * as monaco from "monaco-editor";

type CompletionItemKindName = keyof typeof monaco.languages.CompletionItemKind;
export type ChildrenField = {
	[key in CompletionItemKindName]?: monaco.languages.CompletionItem[];
};

export type CompletionItemExtended = monaco.languages.CompletionItem & {
	__children__?: ChildrenField;
};

export function makeEmptyChildrenField(whitelist: CompletionItemKindName[] = []): ChildrenField {
	const keys = Object.keys(monaco.languages.CompletionItemKind)
		.filter(a => whitelist.includes(a as CompletionItemKindName));
	return Object.fromEntries(keys.map((v, i) => [v, []]));
}

export default function initMisc(editor: monaco.editor.IStandaloneCodeEditor) {
	addFileActions(editor); // file actions
	overrideKeys(editor); // override CTRL + O / CTRL + S
}

/**
 * Adds open file and save file actions to the editor.
 * NOTE: save file requires showSaveFilePicker,
 * which is mostly only implemented in Chromium / Chrome.
 * @param editor The editor.
 */
export function addFileActions(editor: monaco.editor.IStandaloneCodeEditor) {
	//#region File actions
	//#region Open File
	editor.addAction({
		id: "file.open",
		label: "Open File",
		async run(e) {
			const input = document.createElement("input");
			input.type = "file";
			input.accept = ".luau,.lua,.rlua,.rbx,.rbxs";
			document.body.appendChild(input);
			input.click();
			document.body.removeChild(input);

			input.addEventListener("change", async (ev) => {
				//@ts-expect-error: the target should be a file <input/>
				const file = (ev.target!.files as File[])[0];

				const content = await file.text();

				e.setValue(content);
			});
		},
	});
	//#endregion
	//#region Save File
	const saveOptions = {
		types: [
			{
				description: "Script Files",
				accept: {
					"text/luau": [".luau", ".lua", ".rlua", ".rbx"],
				},
			},
		],
	};

	editor.addAction({
		id: "file.save",
		label: "Save File",
		async run() {
			// Get the text from the text box
			const text = editor.getValue();

			// Save the file.
			/**
			 * A handle to the file.
			 * @type {FileSystemFileHandle}
			 */
			let handle: FileSystemFileHandle;

			try {
				//@ts-expect-error: it does exist, only in Chromium though as Firefox won't implement it.
				// https://developer.mozilla.org/en-US/docs/Web/API/Window/showSaveFilePicker
				// https://developer.chrome.com/docs/capabilities/web-apis/file-system-access
				handle = await showSaveFilePicker(saveOptions);
			} catch (e) {
				if ((e as Error | ReferenceError).name === "ReferenceError") {
					return alert(
						"Your browser doesn't support showSaveFilePicker()",
					);
				}
				console.warn("[SAVE FILE ACTION] Wasn't able to handle", e);
				throw e;
			}

			const writable = await handle.createWritable();

			//@ts-expect-error: Chromium thing
			if (handle.createWriter) {
				//@ts-expect-error
				const writer = await handle.createWriter();
				await writer.write(0, text);
				await writer.close();
				return;
			}

			await writable.write(text);
			await writable.close();
		},
	});
	//#endregion
	//#endregion
}
/**
 * Overrides the CTRL + O / CTRL + S keys to call the editor actions.
 * @param editor The editor, must have file.open or file.save action.
 */
export function overrideKeys(editor: monaco.editor.IStandaloneCodeEditor) {
	//#region Overriding Keys
	//#region CTRL + O (open file)
	document.addEventListener("keydown", async (e) => {
		if (!e.ctrlKey || e.key !== "o") return;
		e.preventDefault();

		await editor.getAction("file.open")!.run(monaco.editor);
	});
	//#endregion
	//#region CTRL + S (save file)
	document.addEventListener("keydown", async (e) => {
		if (!e.ctrlKey) return;
		if (e.key !== "s") return;
		// Prevent the Save dialog to open
		e.preventDefault();

		await editor.getAction("file.save")!.run(monaco.editor);
	});
	//#endregion
	//#endregion
}
