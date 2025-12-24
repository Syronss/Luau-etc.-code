// Yorum satırlarını kaldırdık:
import { formatter, rangeFormatter } from "./format/handleFormat"; 
import { autoCompleteProvider } from "./autocomplete/autocompleteProvider";
import * as monaco from "monaco-editor";

export function initFormatter() {
    // Aşağıdaki satırların başındaki // işaretlerini kaldırdık:
    monaco.languages.registerDocumentFormattingEditProvider("luau", formatter);
    monaco.languages.registerDocumentRangeFormattingEditProvider("luau", rangeFormatter);
}

export function initAutocomplete() {
    monaco.languages.registerCompletionItemProvider("luau", autoCompleteProvider);
}

// init fonksiyonunu dışarıdan çağırmak için birleştirici bir fonksiyon ekleyelim
export default function initProviders() {
    initFormatter();
    initAutocomplete();
}
