import * as monaco from "monaco-editor";
import { getModuleCompletions } from "./metadata";
import { processedDump } from "./dump"; // API Dump verisini buradan çekiyoruz

// Exploit fonksiyonları (İsteğe bağlı kalabilir, Studio modu için engel değil)
export const customExploitFunctions: string[] = [
    "getgenv", "getrenv", "getreg", "getgc", "getinstances", "getnilinstances",
    "fireclickdetector", "fireproximityprompt", "hookfunction", "newcclosure",
    "loadstring", "checkcaller", "islclosure", "dumpstring", "task" // task kütüphanesi eklendi
];

// 1. Global Roblox Tipleri (CFrame, Vector3 vb.) ve Enumlar
function getGlobalRobloxCompletions(range: monaco.Range): monaco.languages.CompletionItem[] {
    const suggestions: monaco.languages.CompletionItem[] = [];

    // Global Roblox Sınıfları (Örn: Instance, Vector3, CFrame)
    // Bu liste API Dump'tan da çekilebilir ama temel tipler genelde sabittir.
    const globalTypes = ["Vector3", "Vector2", "CFrame", "Color3", "UDim", "UDim2", "Instance", "Enum", "Ray", "Random", "Region3"];
    
    globalTypes.forEach(type => {
        suggestions.push({
            label: type,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: type,
            documentation: `Roblox built-in type: ${type}`,
            range: range
        });
    });

    // Enumların tamamlanması (Örn: Enum.KeyCode.E)
    // Sadece "Enum" yazıldığında çıkması için basit bir ekleme, 
    // detaylı Enum property'leri için "." tetikleyicisi kontrol edilmeli.
    suggestions.push({
        label: "Enum",
        kind: monaco.languages.CompletionItemKind.Module,
        insertText: "Enum",
        documentation: "Roblox Enums",
        range: range
    });

    return suggestions;
}

// 2. Instance.new("...") için String İçi Tamamlama
function getInstanceNewCompletions(model: monaco.editor.ITextModel, position: monaco.Position): monaco.languages.CompletionItem[] {
    const lineContent = model.getLineContent(position.lineNumber);
    const textBefore = lineContent.substring(0, position.column - 1);

    // Regex: Instance.new( Tırnak açılmış mı?
    // Örnek yakalama: Instance.new(" veya Instance.new('
    if (textBefore.match(/Instance\.new\s*\(\s*["']$/)) {
        // Tüm Class isimlerini öner (API Dump'tan)
        return Object.keys(processedDump.Classes).map(className => ({
            label: className,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: className,
            detail: "Roblox Class",
            documentation: `Creates a new ${className}`,
            range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column)
        }));
    }
    return [];
}

// 3. game:GetService("...") için Servis Tamamlama
function getGetServiceCompletions(model: monaco.editor.ITextModel, position: monaco.Position): monaco.languages.CompletionItem[] {
    const lineContent = model.getLineContent(position.lineNumber);
    const textBefore = lineContent.substring(0, position.column - 1);

    // Regex: :GetService( Tırnak açılmış mı?
    if (textBefore.match(/:GetService\s*\(\s*["']$/)) {
        // Sadece Servis olan classları öner
        return processedDump.ServiceList.map(service => ({
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

function getLocalCompletions(model: monaco.editor.ITextModel, position: monaco.Position): monaco.languages.CompletionItem[] {
    const text = model.getValue();
    const suggestions: monaco.languages.CompletionItem[] = [];
    // Regex'i biraz geliştirdim, parametreleri de yakalaması için
    const varPattern = /\b(?:local|function)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
    
    let match;
    const distinctVars = new Set<string>();

    while ((match = varPattern.exec(text)) !== null) {
        const varName = match[1];
        if (!distinctVars.has(varName)) {
            distinctVars.add(varName);
            suggestions.push({
                label: varName,
                kind: monaco.languages.CompletionItemKind.Variable,
                insertText: varName,
                documentation: "Local variable or function",
                range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column)
            });
        }
    }
    return suggestions;
}

export const autoCompleteProvider: monaco.languages.CompletionItemProvider = {
    triggerCharacters: [".", ":", '"', "'", "("], // Tetikleyicilere parantez de eklendi
    provideCompletionItems(model, pos, _ctx, _tok) {
        const word = model.getWordUntilPosition(pos);
        const range = new monaco.Range(pos.lineNumber, word.startColumn, pos.lineNumber, word.endColumn);

        // String içi kontrolü (Mevcut koddan biraz daha gelişmiş)
        const lineContent = model.getLineContent(pos.lineNumber);
        const textBefore = lineContent.substring(0, pos.column - 1);
        const doubleQuotes = (textBefore.match(/"/g) || []).length;
        const singleQuotes = (textBefore.match(/'/g) || []).length;
        const isInsideString = (doubleQuotes % 2 !== 0) || (singleQuotes % 2 !== 0);

        // Eğer string içindeysek SADECE özel durumlar (Instance.new, GetService) için öneri yap
        if (isInsideString) {
            const serviceSuggestions = getGetServiceCompletions(model, pos);
            const instanceSuggestions = getInstanceNewCompletions(model, pos);
            
            return {
                suggestions: [...serviceSuggestions, ...instanceSuggestions]
            };
        }

        const suggestions: monaco.languages.CompletionItem[] = [];

        // 1. Roblox API Dump (Metadata XML - Math, Table vb.)
        const apiSuggestions = getModuleCompletions(range);
        if (apiSuggestions) {
            suggestions.push(...apiSuggestions);
        }

        // 2. Global Roblox Tipleri (Vector3, CFrame, Instance vb.)
        suggestions.push(...getGlobalRobloxCompletions(range));

        // 3. Lokal Değişkenler
        suggestions.push(...getLocalCompletions(model, pos));

        // 4. Exploit Fonksiyonları (İstersen bir ayarla kapatılabilir yapabilirsin)
        suggestions.push(...customExploitFunctions.map(func => ({
            label: func,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: func,
            detail: "Global",
            range: range
        })));

        // 5. Snippet Önerileri (Bonus: Studio/Exploit ortak kullanımı)
        suggestions.push({
            label: "task.wait",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "task.wait(${1:0})",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: "Snippet",
            range: range
        });
        
         suggestions.push({
            label: "game:GetService",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'game:GetService("${1:ServiceName}")',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: "Snippet",
            range: range
        });

        return {
            suggestions: suggestions
        };
    }
};
