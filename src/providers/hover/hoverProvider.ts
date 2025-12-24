// import { formatter, rangeFormatter } from "./format/handleFormat";
import { autoCompleteProvider } from "./autocomplete/autocompleteProvider";
import { hoverProvider, signatureHelpProvider } from "./hover/hoverProvider";
import * as monaco from "monaco-editor";

export function initFormatter() {
	// Formatter'ı etkinleştirmek için uncomment et
	// monaco.languages.registerDocumentFormattingEditProvider("luau", formatter);
	// monaco.languages.registerDocumentRangeFormattingEditProvider(
	// 	"luau",
	// 	rangeFormatter
	// );
}

export function initAutocomplete() {
	monaco.languages.registerCompletionItemProvider("luau", autoCompleteProvider);
}

export function initHover() {
	monaco.languages.registerHoverProvider("luau", hoverProvider);
}

export function initSignatureHelp() {
	monaco.languages.registerSignatureHelpProvider("luau", signatureHelpProvider);
}

export default function initProviders() {
	initAutocomplete();
	initHover();
	initSignatureHelp();
	// initFormatter(); // İstersenaçabilirsiniz
}