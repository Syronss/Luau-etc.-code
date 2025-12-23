import * as monaco from "monaco-editor";

export function positionToByteOffset(
	model: monaco.editor.ITextModel,
	position: monaco.IPosition
): number {
	const before = model.getValueInRange({
		startLineNumber: 1,
		startColumn: 1,
		endLineNumber: position.lineNumber,
		endColumn: position.column
	});
	return new TextEncoder().encode(before).length;
}
export default positionToByteOffset;
