import * as monaco from "monaco-editor";
import { getModuleCompletions } from "./metadata";

export const autoCompleteProvider: monaco.languages.CompletionItemProvider = {
	triggerCharacters: [".", ".:"],
	provideCompletionItems(model, pos, _ctx, _tok) {
		for (const sym of ["'", '"']) {
			const quotes = model.findMatches(
				`.*${sym}([^${sym}])*${sym}`,
				true,
				true,
				true,
				null,
				true
			);
			if (quotes.length > 0) {
				for (let quote of quotes) {
					if (
						pos.lineNumber ===
						quote.range.startLineNumber &&
						pos.column >= quote.range.startColumn &&
						pos.column <= quote.range.endColumn
					) {
						if (
							[`game:GetService(""`, `Instance.new(""`, `[""`].find(s =>
								quote.matches![0].endsWith(s)
							)
						)
							break;
						return;
					}
				}
			}
		}

		let closest_cb_str_ln = -1;
		let closest_cb_start_col = -1;
		let closest_cb_end_ln = -1;
		let closest_cb_end_col = -1;
		let cb_equal = "";
		for (const quote of model.findMatches(
			/--\[(=*)\[/.source,
			true,
			true,
			false,
			null,
			true
		)) {
			if (quote.range.startLineNumber <= pos.lineNumber) {
				closest_cb_str_ln = quote.range.startLineNumber;
				closest_cb_start_col = quote.range.startColumn;
				cb_equal = quote.matches![1];
			} else break;
		}

		for (const quote of model.findMatches(
			/](=*)]/.source,
			true,
			true,
			false,
			null,
			true
		)) {
			if (
				quote.range.startLineNumber >= pos.lineNumber &&
				quote.matches![1] === cb_equal
			) {
				closest_cb_end_ln = quote.range.startLineNumber;
				closest_cb_end_col = quote.range.startColumn;
				break;
			}
		}

		for (const quote of model.findMatches(
			/--(.*)/.source,
			true,
			true,
			false,
			null,
			true
		)) {
			if (quote.range.startLineNumber == pos.lineNumber)
				return;
		}

		if ([closest_cb_str_ln, closest_cb_start_col].indexOf(-1) === -1) {
			if (
				[closest_cb_end_ln, closest_cb_end_col].indexOf(-1) !==
				-1
			)
				return;

			if (closest_cb_end_ln !== pos.lineNumber) {
				return;
			}

			if (closest_cb_end_col >= pos.column) {
				return;
			}
		}
		// TODO: auto complete not implemented yet.
		const word = model.getWordUntilPosition(pos);
		return {
			suggestions: getModuleCompletions(new monaco.Range(
				pos.lineNumber, word.startColumn, pos.lineNumber, word.endColumn
			))!
		};
	}
};
