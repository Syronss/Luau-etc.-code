// src/providers/autocomplete/autocompleteProvider.ts
import * as monaco from "monaco-editor";
import { getModuleCompletions } from "./metadata";
import { processedDump } from "./dump";

export const customExploitFunctions: string[] = [
    "getgenv", "getrenv", "getreg", "getgc", "getinstances", "getnilinstances",
    "fireclickdetector", "fireproximityprompt", "hookfunction", "newcclosure",
    "loadstring", "checkcaller", "islclosure", "dumpstring", "task"
];

// Hierarchy parser - Zincirleme completion için
function parseHierarchy(model: monaco.editor.ITextModel, position: monaco.Position): string[] {
    const lineContent = model.getLineContent(position.lineNumber);
    const textBefore = lineContent.substring(0, position.column - 1);
    
    // Geriye doğru parse et: workspace.Part.Position -> ["workspace", "Part", "Position"]
    const hierarchyMatch = textBefore.match(/([a-zA-Z_][a-zA-Z0-9_]*(?:[\.:])[a-zA-Z_][a-zA-Z0-9_]*)+$/);
    if (!hierarchyMatch) return [];
    
    return hierarchyMatch[0].split(/[\.:]/).filter(Boolean);
}

// Bir class'ın member'larını getir
function getClassMembers(className: string, range: monaco.Range): monaco.languages.CompletionItem[] {
    // Tip güvenliği için 'any' kullanımı (API dump yapısı tam bilinmediğinden)
    const classData = (processedDump.Classes as any)[className];
    if (!classData) return [];

    const suggestions: monaco.languages.CompletionItem[] = [];

    // classData.Members üzerinde döngü
    for (const member of (classData.Members as any[])) {
        // Security check
        if (member.Security && typeof member.Security === 'object' && member.Security.Read === 'None') continue;

        let kind: monaco.languages.CompletionItemKind;
        let insertText = member.Name;
        let detail = '';

        switch (member.MemberType) {
            case 'Property':
                kind = monaco.languages.CompletionItemKind.Property;
                detail = `Property: ${member.ValueType?.Name || 'unknown'}`;
                break;
            case 'Function':
            case 'Method':
                kind = monaco.languages.CompletionItemKind.Method;
                const params = member.Parameters?.map((p: any) => `${p.Name}: ${p.Type.Name}`).join(', ') || '';
                insertText = `${member.Name}($1)`;
                detail = `(${params})`;
                break;
            case 'Event':
                kind = monaco.languages.CompletionItemKind.Event;
                detail = 'Event';
                break;
            case 'Callback':
                kind = monaco.languages.CompletionItemKind.Function;
                detail = 'Callback';
                break;
            default:
                kind = monaco.languages.CompletionItemKind.Field;
        }

        suggestions.push({
            label: member.Name,
            kind: kind,
            insertText: insertText,
            insertTextRules: insertText.includes('$') 
                ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet 
                : undefined,
            detail: detail,
            documentation: member.Tags?.includes('Deprecated') ? '⚠️ Deprecated' : undefined,
            range: range
        });
    }

    return suggestions;
}

// Hierarchy-based completion
function getHierarchyCompletions(hierarchy: string[], range: monaco.Range): monaco.languages.CompletionItem[] {
    if (hierarchy.length === 0) return [];

    // İlk element'i bul (game, workspace, script vb.)
    let currentClass: string | undefined;
    
    if (hierarchy[0] === 'game') {
        currentClass = 'DataModel';
    } else if (hierarchy[0] === 'workspace') {
        currentClass = 'Workspace';
    } else if (hierarchy[0] === 'script') {
        currentClass = 'Script';
    } else {
        // Local variable veya bilinmeyen - type inference gerekir (gelecekte)
        return [];
    }

    // Hierarchy'yi takip et
    for (let i = 1; i < hierarchy.length - 1; i++) {
        // Hata önleyici kontrol
        if (!currentClass) return [];

        const memberName = hierarchy[i];
        const classData = (processedDump.Classes as any)[currentClass];
        if (!classData) return [];

        // Bu member'ın tipini bul
        const member = classData.Members.find((m: any) => m.Name === memberName);
        if (!member) return [];

        if (member.MemberType === 'Property' && member.ValueType?.Name) {
            currentClass = member.ValueType.Name;
        } else if (member.ReturnType?.Name) {
            currentClass = member.ReturnType.Name;
        } else {
            return [];
        }
    }

    // Son class'ın member'larını döndür
    // Eğer currentClass undefined ise hata vermemesi için kontrol
    if (!currentClass) return [];

    return getClassMembers(currentClass, range);
}

// Enum completion
function getEnumCompletions(model: monaco.editor.ITextModel, position: monaco.Position): monaco.languages.CompletionItem[] {
    const lineContent = model.getLineContent(position.lineNumber);
    const textBefore = lineContent.substring(0, position.column - 1);

    // Enum.KeyCode. gibi bir pattern ara
    const enumMatch = textBefore.match(/Enum\.([a-zA-Z_][a-zA-Z0-9_]*)\.$/);
    if (!enumMatch) return [];

    const enumName = enumMatch[1];
    const enumData = (processedDump.Enums as any)[enumName];
    if (!enumData) return [];

    return enumData.Items.map((item: any) => ({
        label: item.Name,
        kind: monaco.languages.CompletionItemKind.EnumMember,
        insertText: item.Name,
        detail: `Enum.${enumName}.${item.Name} = ${item.Value}`,
        documentation: item.Tags?.includes('Deprecated') ? '⚠️ Deprecated' : undefined,
        range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column)
    }));
}

// Geliştirilmiş local variable detection
function getLocalCompletions(model: monaco.editor.ITextModel, position: monaco.Position): monaco.languages.CompletionItem[] {
    const text = model.getValue();
    const suggestions: monaco.languages.CompletionItem[] = [];
    const distinctVars = new Set<string>();

    // Local değişkenler
    const varPattern = /\b(?:local)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let match;
    while ((match = varPattern.exec(text)) !== null) {
        distinctVars.add(match[1]);
    }

    // Function isimleri
    const funcPattern = /\b(?:function)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
    while ((match = funcPattern.exec(text)) !== null) {
        distinctVars.add(match[1]);
    }

    // Function parametreleri - GELİŞTİRİLDİ
    const paramPattern = /function[^(]*\(([^)]+)\)/g;
    while ((match = paramPattern.exec(text)) !== null) {
        const params = match[1].split(',');
        params.forEach(param => {
            const paramName = param.trim().split(/[\s:]/)[0];
            if (paramName && /^[a-zA-Z_]/.test(paramName)) {
                distinctVars.add(paramName);
            }
        });
    }

    distinctVars.forEach(varName => {
        suggestions.push({
            label: varName,
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: varName,
            documentation: "Local variable or function",
            range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column)
        });
    });

    return suggestions;
}

// Global Roblox tipleri
function getGlobalRobloxCompletions(range: monaco.Range): monaco.languages.CompletionItem[] {
    const suggestions: monaco.languages.CompletionItem[] = [];

    const globalTypes = [
        "Vector3", "Vector2", "CFrame", "Color3", "UDim", "UDim2", 
        "Instance", "Enum", "Ray", "Random", "Region3", "TweenInfo",
        "NumberRange", "NumberSequence", "ColorSequence", "BrickColor"
    ];
    
    globalTypes.forEach(type => {
        const classData = (processedDump.Classes as any)[type];
        suggestions.push({
            label: type,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: type,
            documentation: classData ? `Roblox built-in type: ${type}` : undefined,
            range: range
        });
    });

    // Global instances
    ['game', 'workspace', 'script', 'plugin', 'shared'].forEach(global => {
        suggestions.push({
            label: global,
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: global,
            detail: 'Global',
            range: range
        });
    });

    return suggestions;
}

// Instance.new completion
function getInstanceNewCompletions(model: monaco.editor.ITextModel, position: monaco.Position): monaco.languages.CompletionItem[] {
    const lineContent = model.getLineContent(position.lineNumber);
    const textBefore = lineContent.substring(0, position.column - 1);

    if (textBefore.match(/Instance\.new\s*\(\s*["']$/)) {
        return Object.values(processedDump.Classes as any)
            .filter((cls: any) => !cls.Tags?.includes('NotCreatable') && !cls.Tags?.includes('Service'))
            .map((cls: any) => ({
                label: cls.Name,
                kind: monaco.languages.CompletionItemKind.Class,
                insertText: cls.Name,
                detail: "Roblox Class",
                documentation: `Creates a new ${cls.Name}`,
                range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column)
            }));
    }
    return [];
}

// GetService completion
function getGetServiceCompletions(model: monaco.editor.ITextModel, position: monaco.Position): monaco.languages.CompletionItem[] {
    const lineContent = model.getLineContent(position.lineNumber);
    const textBefore = lineContent.substring(0, position.column - 1);

    if (textBefore.match(/:GetService\s*\(\s*["']$/)) {
        return processedDump.ServiceList.map((service: any) => ({
            label: service.Name,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: service.Name,
            detail: "Service",
            documentation: `Roblox Service: ${service.Name}`,
            range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column)
        }));
    }
    return [];
}

// Ana provider
export const autoCompleteProvider: monaco.languages.CompletionItemProvider = {
    triggerCharacters: [".", ":", '"', "'", "("],
    
    provideCompletionItems(model, pos, _ctx, _tok) {
        const word = model.getWordUntilPosition(pos);
        const range = new monaco.Range(pos.lineNumber, word.startColumn, pos.lineNumber, word.endColumn);

        const lineContent = model.getLineContent(pos.lineNumber);
        const textBefore = lineContent.substring(0, pos.column - 1);
        const isInsideString = ((textBefore.match(/"/g) || []).length % 2 !== 0) || 
                              ((textBefore.match(/'/g) || []).length % 2 !== 0);

        // String içi
        if (isInsideString) {
            return {
                suggestions: [
                    ...getGetServiceCompletions(model, pos),
                    ...getInstanceNewCompletions(model, pos)
                ]
            };
        }

        const suggestions: monaco.languages.CompletionItem[] = [];

        // 1. Enum completion (Enum.KeyCode.)
        const enumSuggestions = getEnumCompletions(model, pos);
        if (enumSuggestions.length > 0) {
            return { suggestions: enumSuggestions };
        }

        // 2. Hierarchy-based completion (workspace.Part.)
        const hierarchy = parseHierarchy(model, pos);
        if (hierarchy.length > 0) {
            const hierarchySuggestions = getHierarchyCompletions(hierarchy, range);
            if (hierarchySuggestions.length > 0) {
                return { suggestions: hierarchySuggestions };
            }
        }

        // 3. Metadata (math, string, table vb.)
        const apiSuggestions = getModuleCompletions(range);
        if (apiSuggestions) {
            suggestions.push(...apiSuggestions);
        }

        // 4. Global Roblox tipleri
        suggestions.push(...getGlobalRobloxCompletions(range));

        // 5. Local değişkenler
        suggestions.push(...getLocalCompletions(model, pos));

        // 6. Exploit functions
        suggestions.push(...customExploitFunctions.map(func => ({
            label: func,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: func,
            detail: "Exploit Global",
            range: range
        })));

        // 7. Snippet'ler
        suggestions.push(
            {
                label: "task.wait",
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: "task.wait(${1:0})",
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                detail: "Snippet",
                range: range
            },
            {
                label: "game:GetService",
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'game:GetService("${1:ServiceName}")',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                detail: "Snippet",
                range: range
            }
        );

        // Dedupe - aynı label'a sahip item'ları birleştir
        const uniqueSuggestions = suggestions.reduce((acc, item) => {
            if (!acc.find(x => x.label === item.label)) {
                acc.push(item);
            }
            return acc;
        }, [] as monaco.languages.CompletionItem[]);

        return { suggestions: uniqueSuggestions };
    }
};
