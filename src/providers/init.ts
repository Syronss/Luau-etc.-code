// src/providers/init.ts
import { autoCompleteProvider } from "./autocomplete/autocompleteProvider";
// DİKKAT: hoverProvider.ts dosyasını düzelttikten sonra bu importlar çalışacaktır.
import { hoverProvider, signatureHelpProvider } from "./hover/hoverProvider";
// HATA DÜZELTİLDİ: Dosya adı "snippet" (tekil) olduğu için yol düzeltildi.
import { registerSnippets } from "./autocomplete/snippet"; 
import * as monaco from "monaco-editor";

// export function initFormatter() { ... } // Kullanmıyorsanız yorum satırı kalabilir

export function initAutocomplete() {
    monaco.languages.registerCompletionItemProvider("luau", autoCompleteProvider);
}

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
    initSnippets();
    initHover();
    initSignatureHelp();
    // initFormatter();
}
