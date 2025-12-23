import {
	CallParenType,
	CollapseSimpleStatement,
	Config,
	formatCode,
	IndentType,
	OutputVerification,
	QuoteStyle,
	SortRequiresConfig,
	Range
} from "@johnnymorganz/stylua";
import positionToByteOffset from "./byteOffset";
import * as monaco from "monaco-editor";

export const formatter: monaco.languages.DocumentFormattingEditProvider = {
	displayName: "StyLua",
	provideDocumentFormattingEdits(
		model: monaco.editor.ITextModel,
		options: monaco.languages.FormattingOptions
	) {
		const text = model.getValue();
		const sortRequiresConfig = new SortRequiresConfig();
		sortRequiresConfig.enabled = true;
		const config = new Config();
		config.indent_type = options.insertSpaces
			? IndentType.Spaces
			: IndentType.Tabs;
		config.indent_width = options.tabSize;
		config.quote_style = QuoteStyle.AutoPreferDouble;
		config.call_parentheses = CallParenType.Always;
		config.collapse_simple_statement = CollapseSimpleStatement.Always;
		config.no_call_parentheses = false;
		config.sort_requires = sortRequiresConfig;
		config.column_width = 120;
		config.line_endings = 0;
		const formatted = formatCode(
			text,
			config,
			undefined,
			OutputVerification.None
		);

		return [
			{
				range: model.getFullModelRange(),
				text: formatted
			}
		];
	}
};

export const rangeFormatter: monaco.languages.DocumentRangeFormattingEditProvider =
	{
		displayName: "StyLua",
		provideDocumentRangeFormattingEdits(
			model: monaco.editor.ITextModel,
			range: monaco.Range,
			options: monaco.languages.FormattingOptions
		) {
			const text = model.getValue();
			const sortRequiresConfig = new SortRequiresConfig();
			sortRequiresConfig.enabled = true;
			const config = new Config();
			config.indent_type = options.insertSpaces
				? IndentType.Spaces
				: IndentType.Tabs;
			config.indent_width = options.tabSize;
			config.quote_style = QuoteStyle.AutoPreferDouble;
			config.call_parentheses = CallParenType.Always;
			config.collapse_simple_statement = CollapseSimpleStatement.Always;
			config.no_call_parentheses = false;
			config.sort_requires = sortRequiresConfig;
			config.column_width = 120;
			config.line_endings = 0;
			const styluaRange = new Range(); // note: this is StyLua range, not DOM Range.
			styluaRange.start = positionToByteOffset(
				model,
				range.getStartPosition()
			);
			styluaRange.end = positionToByteOffset(
				model,
				range.getEndPosition()
			);
			const formatted = formatCode(
				text,
				config,
				styluaRange,
				OutputVerification.None
			);

			return [
				{
					range: model.getFullModelRange(),
					text: formatted
				}
			];
		}
	};

export default formatter;
