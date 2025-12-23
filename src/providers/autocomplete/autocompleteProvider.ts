import * as monaco from "monaco-editor";
import { getModuleCompletions } from "./metadata";

// Exploitlere özel fonksiyonları buraya ekleyebilirsin veya dinamik olarak doldurabilirsin.
export const customExploitFunctions: string[] = [
    "getgenv", "getrenv", "getreg", "getgc", "getinstances", "getnilinstances",
    "fireclickdetector", "fireproximityprompt", "hookfunction", "newcclosure",
    "loadstring", "checkcaller", "islclosure", "dumpstring"
];

// Basit bir regex ile text modelden değişkenleri toplama fonksiyonu
function getLocalCompletions(model: monaco.editor.ITextModel, position: monaco.Position): monaco.languages.CompletionItem[] {
    const text = model.getValue();
    const suggestions: monaco.languages.CompletionItem[] = [];
    const varPattern = /\b(?:local|function)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
    
    let match;
    const distinctVars = new Set<string>();

    while ((match = varPattern.exec(text)) !== null) {
        const varName = match[1];
        // İmleç konumundaki kelimeyi önermek istemeyebiliriz veya duplicate engelleriz
        if (!distinctVars.has(varName)) {
            distinctVars.add(varName);
            suggestions.push({
                label: varName,
                kind: monaco.languages.CompletionItemKind.Variable,
                insertText: varName,
                documentation: "Local variable or function defined in script",
                range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column)
            });
        }
    }
    return suggestions;
}

function getExploitCompletions(range: monaco.Range): monaco.languages.CompletionItem[] {
    return customExploitFunctions.map(func => ({
        label: func,
        kind: monaco.languages.CompletionItemKind.Function,
        insertText: func,
        detail: "Exploit Global",
        documentation: "Custom exploit environment function.",
        range: range
    }));
}

export const autoCompleteProvider: monaco.languages.CompletionItemProvider = {
    triggerCharacters: [".", ":", '"', "'"],
    provideCompletionItems(model, pos, _ctx, _tok) {
        const word = model.getWordUntilPosition(pos);
        const range = new monaco.Range(pos.lineNumber, word.startColumn, pos.lineNumber, word.endColumn);

        // 1. String içinde miyiz kontrolü (Mevcut koddan korundu)
        const lineContent = model.getLineContent(pos.lineNumber);
        const textBefore = lineContent.substring(0, pos.column - 1);
        
        // Basit string kontrolü (tek ve çift tırnak sayısına göre)
        const doubleQuotes = (textBefore.match(/"/g) || []).length;
        const singleQuotes = (textBefore.match(/'/g) || []).length;
        
        // Eğer tek sayıdaysa string içindeyizdir, öneri yapma (path önerisi vb. hariç)
        if (doubleQuotes % 2 !== 0 || singleQuotes % 2 !== 0) {
            // İleride buraya 'game:GetService("...")' gibi yerler için string içi öneri eklenebilir.
            return { suggestions: [] };
        }

        // 2. Önerileri topla
        const suggestions: monaco.languages.CompletionItem[] = [];

        // A) Roblox API Dump (Metadata'dan)
        const apiSuggestions = getModuleCompletions(range);
        if (apiSuggestions) {
            suggestions.push(...apiSuggestions);
        }

        // B) Lokal Değişkenler (Context Awareness - Basic)
        suggestions.push(...getLocalCompletions(model, pos));

        // C) Exploit Fonksiyonları
        suggestions.push(...getExploitCompletions(range));

        // D) Temel Luau Keywordleri (Monaco basic provider genelde halleder ama buraya ekleyebilirsin)
        
        return {
            suggestions: suggestions
        };
    }
};
