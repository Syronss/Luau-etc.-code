// import { formatter, rangeFormatter } from "./format/handleFormat";
import { autoCompleteProvider } from "./autocomplete/autocompleteProvider";
import { hoverProvider, signatureHelpProvider } from "./hover/hoverProvider";
import { registerSnippets } from "./autocomplete/snippets"; // <--- 1. Yeni importu ekle
import * as monaco from "monaco-editor";

export function initFormatter() {
    // ... (eski kodlar)
}

export function initAutocomplete() {
    monaco.languages.registerCompletionItemProvider("luau", autoCompleteProvider);
}

// 2. Snippet başlatıcı fonksiyonu (Opsiyonel ama düzenli durur)
export function initSnippets() {
    registerSnippets();
}

export function initHover() {
    monaco.languages.registerHoverProvider("luau", hoverProvider);
}

export function initSignatureHelp() {
    monaco.languages.registerSignatureHelpProvider("luau", signatureHelpProvider);
}

export default function initProviders() {
    initAutocomplete();
    initSnippets(); // <--- 3. Burada çağır
    initHover();
    initSignatureHelp();
    // initFormatter();
}
