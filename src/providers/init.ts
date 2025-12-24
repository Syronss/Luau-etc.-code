// import { formatter, rangeFormatter } from "./format/handleFormat";
// the auto complete isn't implemented yet.
import {autoCompleteProvider} from "./autocomplete/autocompleteProvider";
import * as monaco from "monaco-editor";

export function initFormatter() {
	// monaco.languages.registerDocumentFormattingEditProvider("luau", formatter);
	// monaco.languages.registerDocumentRangeFormattingEditProvider(
	// 	"luau",
	// 	rangeFormatter
	// );
}

export function initAutocomplete() {
	monaco.languages.registerCompletionItemProvider("luau", autoCompleteProvider);
}

export default initAutocomplete;
