import "./style.css";
import "./ui/styles.css"; // Yeni UI stilleri
import * as monaco from "monaco-editor";
import { initEnv } from "./monacoEnv";
import { init } from "./languages/luau/init";
import initProviders from "./providers/init";
import initThemes from "./theme/register";
import initMisc from "./misc";
import EditorStore from "./store/EditorStore";
import { FileTree, TabBar, StatusBar, CommandPalette } from "./ui/components";

//#region Initialize Language, MonacoEnvironment, and Themes
init();
initEnv();
initProviders();
await initThemes();
//#endregion

//#region Enhanced Themes
monaco.editor.defineTheme("krnlLight", {
	base: "vs",
	inherit: true,
	rules: [
		{ token: "", foreground: "#444850" },
		{ token: "variable.language.self", foreground: "#F7768E" },
		{ token: "variable.parameter.variadic", foreground: "#F7768E" },
		{ token: "variable.parameter.function", foreground: "#E0AF68" },
		{ token: "variable.other.constant", foreground: "#FF9E64" },
		{ token: "variable.property", foreground: "#7DCFFF" },
		{ token: "variable.object.property", foreground: "#73DACA" },
		{ token: "keyword", foreground: "#8067ab" },
		{ token: "keyword.local", foreground: "#997BD6", fontStyle: "italic" },
		{ token: "keyword.operator", foreground: "#89DDFF" },
		{ token: "keyword.operator.type.annotation", foreground: "#9ABDF5" },
		{ token: "keyword.operator.typedef.annotation", foreground: "#89DDFF" },
		{ token: "keyword.control.export", foreground: "#997BD6", fontStyle: "italic" },
		{ token: "operator", foreground: "#89DDFF" },
		{ token: "operator.type", foreground: "#BB9AF7" },
		{ token: "operator.special", foreground: "#BB9AF7" },
		{ token: "entity.name.type.alias", foreground: "#5ab6d6" },
		{ token: "entity.name.function", foreground: "#7AA2F7" },
		{ token: "global", foreground: "#7AA2F7" },
		{ token: "storage.type", foreground: "#BB9AF7" },
		{ token: "comment", foreground: "#505050", fontStyle: "italic" },
		{ token: "delimiter.longstring", foreground: "#89DDFF" },
		{ token: "delimiter.bracket", foreground: "#a6afbd" },
		{ token: "string", foreground: "#8ba86d" },
		{ token: "number", foreground: "#FF9E64" },
		{ token: "constants", foreground: "#FF9E64" },
		{ token: "support.function", foreground: "#0f7688" },
		{ token: "support.type", foreground: "#5ab6d6" }
	],
	colors: {
		"editor.background": "#ffffff",
		"editorLineNumber.foreground": "#7A7A7A",
		"editorIndentGuide.background": "#858484",
		"editorSuggestWidget.background": "#ffffff",
		"editorSuggestWidget.border": "#000000",
		"editorSuggestWidget.selectedBackground": "#b9b1b1",
	}
});

monaco.editor.defineTheme("krnlDark", {
	base: "vs-dark",
	inherit: true,
	rules: [
		{ token: "", foreground: "#c0caf5", background: "#1a1b26" },
		{ token: "variable.language.self", foreground: "#f7768e", fontStyle: "italic" },
		{ token: "variable.parameter", foreground: "#e0af68" },
		{ token: "variable.other.constant", foreground: "#ff9e64" },
		{ token: "keyword", foreground: "#bb9af7", fontStyle: "bold" },
		{ token: "keyword.local", foreground: "#9d7cd8", fontStyle: "italic" },
		{ token: "operator", foreground: "#89ddff" },
		{ token: "entity.name.function", foreground: "#7aa2f7", fontStyle: "bold" },
		{ token: "comment", foreground: "#565f89", fontStyle: "italic" },
		{ token: "string", foreground: "#9ece6a" },
		{ token: "number", foreground: "#ff9e64" },
		{ token: "constant.language", foreground: "#ff9e64" },
		{ token: "support.function", foreground: "#0db9d7" },
		{ token: "support.type", foreground: "#2ac3de" },
		{ token: "delimiter", foreground: "#89ddff" }
	],
	colors: {
		"editor.background": "#0f0f13",
		"editor.foreground": "#c0caf5",
		"editorLineNumber.foreground": "#565f89",
		"editorLineNumber.activeForeground": "#e0af68",
		"editor.selectionBackground": "#33467C",
		"editor.lineHighlightBackground": "#292e42",
		"editorCursor.foreground": "#c0caf5",
		"editorWhitespace.foreground": "#3b4261",
		"editorIndentGuide.background": "#292e42",
		"editorSuggestWidget.background": "#16161e",
		"editorSuggestWidget.border": "#1a1b26",
		"editorSuggestWidget.selectedBackground": "#364a82",
		"editorWidget.background": "#16161e"
	}
});
//#endregion

//#region Initialize Store & UI
// Proje yoksa yeni oluştur
let project = EditorStore.getCurrentProject();
if (!project) {
	project = EditorStore.createNewProject("My First Project");
}

// Editor'ı oluştur
const editor = monaco.editor.create(document.querySelector("#monaco")!, {
	value: project.activeFileId ? 
		EditorStore.getFile(project.activeFileId)?.content || "" : 
		"-- Welcome to MonaLuau Enhanced!\nprint('Hello, World!')",
	language: "luau",
	theme: project.settings.theme,
	fontSize: project.settings.fontSize,
	fontFamily: project.settings.fontFamily,
	folding: true,
	dragAndDrop: true,
	minimap: {
		enabled: project.settings.minimap,
		renderCharacters: false,
		scale: 75
	},
	showFoldingControls: "always",
	smoothScrolling: true,
	cursorBlinking: "smooth",
	cursorSmoothCaretAnimation: "on",
	foldingHighlight: false,
	fontLigatures: true,
	formatOnPaste: true,
	showDeprecated: true,
	automaticLayout: true,
	padding: {
		top: 16,
		bottom: 16
	},
	// Yeni özellikler
	bracketPairColorization: {
		enabled: true
	},
	guides: {
		bracketPairs: true,
		indentation: true
	},
	stickyScroll: {
		enabled: true
	},
	inlayHints: {
		enabled: "on"
	},
	quickSuggestions: {
		other: true,
		comments: false,
		strings: true
	},
	suggestOnTriggerCharacters: true,
	acceptSuggestionOnCommitCharacter: true,
	snippetSuggestions: "top"
});

// Editor'ı store'a kaydet
EditorStore.setEditor(editor);

// UI Bileşenlerini başlat
const fileTree = new FileTree('file-tree-container');
const tabBar = new TabBar('tab-bar-container');
const statusBar = new StatusBar('status-bar-container');
const commandPalette = new CommandPalette();

// Editor değişikliklerini izle
editor.onDidChangeModelContent(() => {
	const activeFile = EditorStore.getActiveFile();
	if (activeFile) {
		EditorStore.updateFileContent(activeFile.id, editor.getValue());
	}
});

// Auto-save her 5 saniyede
setInterval(() => {
	EditorStore.saveProject();
}, 5000);

// Klavye kısayolları
document.addEventListener('keydown', (e) => {
	// Ctrl+S - Save
	if (e.ctrlKey && e.key === 's') {
		e.preventDefault();
		EditorStore.saveProject();
		showNotification('Project saved!');
	}
	
	// Ctrl+N - New File
	if (e.ctrlKey && e.key === 'n') {
		e.preventDefault();
		const name = prompt('File name:', 'new-file.luau');
		if (name) {
			const file = EditorStore.createNewFile(name);
			EditorStore.addFile(file);
			EditorStore.setActiveFile(file.id);
		}
	}
	
	// Ctrl+W - Close File
	if (e.ctrlKey && e.key === 'w') {
		e.preventDefault();
		const activeFile = EditorStore.getActiveFile();
		if (activeFile) {
			if (activeFile.isDirty) {
				if (confirm(`${activeFile.name} has unsaved changes. Close anyway?`)) {
					EditorStore.deleteFile(activeFile.id);
				}
			} else {
				EditorStore.deleteFile(activeFile.id);
			}
		}
	}
	
	// Ctrl+Tab - Next File
	if (e.ctrlKey && e.key === 'Tab') {
		e.preventDefault();
		const project = EditorStore.getCurrentProject();
		if (project && project.files.length > 0) {
			const currentIndex = project.files.findIndex(f => f.id === project.activeFileId);
			const nextIndex = (currentIndex + 1) % project.files.length;
			EditorStore.setActiveFile(project.files[nextIndex].id);
			editor.setValue(project.files[nextIndex].content);
		}
	}
});

// Bildirim sistemi
function showNotification(message: string, duration: number = 2000) {
	const notification = document.createElement('div');
	notification.className = 'notification';
	notification.textContent = message;
	document.body.appendChild(notification);
	
	setTimeout(() => notification.classList.add('show'), 10);
	
	setTimeout(() => {
		notification.classList.remove('show');
		setTimeout(() => document.body.removeChild(notification), 300);
	}, duration);
}

// Dosya sürükle-bırak
document.addEventListener('dragover', (e) => {
	e.preventDefault();
	e.stopPropagation();
});

document.addEventListener('drop', async (e) => {
	e.preventDefault();
	e.stopPropagation();
	
	const files = Array.from(e.dataTransfer?.files || []);
	for (const file of files) {
		if (file.name.match(/\.(lua|luau|txt|js|ts|json)$/i)) {
			const content = await file.text();
			const newFile = EditorStore.createNewFile(file.name, content);
			EditorStore.addFile(newFile);
			showNotification(`Loaded ${file.name}`);
		}
	}
});

//#endregion

initMisc(editor);

console.log('🚀 MonaLuau Enhanced initialized!');
