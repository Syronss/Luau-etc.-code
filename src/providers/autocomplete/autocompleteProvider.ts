import * as monaco from "monaco-editor";
import { getModuleCompletions } from "./metadata";
import { processedDump } from "./dump";

export const customExploitFunctions: string[] = [
    "getgenv", "getrenv", "getreg", "getgc", "getinstances", "getnilinstances",
    "fireclickdetector", "fireproximityprompt", "hookfunction", "newcclosure",
    "loadstring", "checkcaller", "islclosure", "dumpstring", "task"
];

// Basit tipler — sadece gerekli alanlar
type DumpClass = {
    Name: string;
    Members?: Array<any>;
    Tags?: string[];
};

// Model başına cache yapılandırması
const modelCache = new WeakMap<monaco.editor.ITextModel, { localVars?: Set<string> }>();

// Helper: position'dan önceki kodu (aynı satır) al
function getTextBeforePosition(model: monaco.editor.ITextModel, position: monaco.Position): string {
    return model.getLineContent(position.lineNumber).substring(0, position.column - 1);
}

// Daha sağlam hiyerarşi ayrıştırıcı: satır içi veya zincirleme referansları (game.Workspace.Part:FindFirstChild) destekler
function parseHierarchy(model: monaco.editor.ITextModel, position: monaco.Position): string[] {
    // Geriye doğru bir pencere (maks 200 karakter) al — performans için sınır
    const line = model.getLineContent(position.lineNumber);
    const before = line.substring(0, position.column - 1);

    // Eğer '.' veya ':' tetiklemesi olmadan çağrıldıysa boş dönüş
    const chainMatch = before.match(/([a-zA-Z_][a-zA-Z0-9_]*(?:[\.\:][a-zA-Z_][a-zA-Z0-9_]*)*)$/);
    if (!chainMatch) return [];

    const raw = chainMatch[1];
    // Split hem '.' hem ':' ile
    return raw.split(/[\.\:]/).filter(Boolean);
}

// Fonksiyon parametrelerinden snippet metni üret
function makeFunctionSnippet(name: string, params: any[] | undefined) {
    if (!params || params.length === 0) return `${name}($1)`;
    const placeholders = params.map((p: any, i: number) => `\${${i + 1}:${p.Name || p.Type?.Name || "arg"}}`).join(', ');
    return `${name}(${placeholders})`;
}

// Class member'larını getirir (daha iyi tiplendirme, snippet ve doküman desteği)
function getClassMembers(className: string, range: monaco.Range): monaco.languages.CompletionItem[] {
    const classData = (processedDump.Classes as Record<string, DumpClass> | undefined)?.[className];
    if (!classData) return [];

    const members = classData.Members || [];
    const suggestions: monaco.languages.CompletionItem[] = [];

    for (const member of members) {
        // Güvenlik/erişim kontrolü
        if (member.Security && typeof member.Security === 'object' && member.Security.Read === 'None') continue;
        if (member.Tags && member.Tags.includes('Hidden')) continue;

        let kind = monaco.languages.CompletionItemKind.Field;
        let insertText: string = member.Name;
        let insertAsSnippet = false;
        let detail = '';

        const memberType = (member.MemberType || member.Type || '').toString();

        if (/property/i.test(memberType)) {
            kind = monaco.languages.CompletionItemKind.Property;
            detail = `Property: ${member.ValueType?.Name || member.ReturnType?.Name || 'unknown'}`;
        } else if (/function|method/i.test(memberType)) {
            kind = monaco.languages.CompletionItemKind.Method;
            insertText = makeFunctionSnippet(member.Name, member.Parameters);
            insertAsSnippet = true;
            const params = (member.Parameters || []).map((p: any) => `${p.Name}: ${p.Type?.Name || 'any'}`).join(', ');
            detail = `(${params})${member.ReturnType?.Name ? ` -> ${member.ReturnType.Name}` : ''}`;
        } else if (/event/i.test(memberType)) {
            kind = monaco.languages.CompletionItemKind.Event;
            detail = 'Event';
        } else if (/callback/i.test(memberType)) {
            kind = monaco.languages.CompletionItemKind.Function;
            insertText = makeFunctionSnippet(member.Name, member.Parameters);
            insertAsSnippet = true;
            detail = 'Callback';
        } else if (/enum/i.test(memberType)) {
            kind = monaco.languages.CompletionItemKind.EnumMember;
            detail = 'Enum member';
        } else {
            kind = monaco.languages.CompletionItemKind.Field;
        }

        suggestions.push({
            label: member.Name,
            kind,
            insertText,
            insertTextRules: insertAsSnippet ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet : undefined,
            detail,
            documentation: member.Tags?.includes('Deprecated') ? '⚠️ Deprecated' : member.Documentation || undefined,
            range
        });
    }

    return suggestions;
}

// Hierarchy-based completion: zincirleme takip eder ve türleri çözmeye çalışır
function getHierarchyCompletions(hierarchy: string[], range: monaco.Range): monaco.languages.CompletionItem[] {
    if (hierarchy.length === 0) return [];

    // Başlangıç türü
    let currentClass: string | undefined;
    const root = hierarchy[0];
    if (root === 'game') currentClass = 'DataModel';
    else if (root === 'workspace') currentClass = 'Workspace';
    else if (root === 'script') currentClass = 'Script';
    else if (root === 'plugin') currentClass = 'Plugin';
    else currentClass = undefined; // Bilinmeyen

    if (!currentClass) return [];

    // Her segment için class'ı çöz
    for (let i = 1; i < hierarchy.length; i++) {
        const name = hierarchy[i];
        const classData = (processedDump.Classes as Record<string, DumpClass> | undefined)?.[currentClass];
        if (!classData) return [];

        // Eğer son eleman değilsek, bu üyenin tipini bulup currentClass'i güncelle
        if (i < hierarchy.length - 1) {
            const member = (classData.Members || []).find(m => m.Name === name);
            if (!member) return [];

            if (member.ValueType?.Name) currentClass = member.ValueType.Name;
            else if (member.ReturnType?.Name) currentClass = member.ReturnType.Name;
            else return [];
        } else {
            // Son segmente geldik — o segmente ait üyeleri döndür (yani parent = currentClass)
            return getClassMembers(currentClass, range);
        }
    }

    return [];
}

// Enum tamamlama: artık Enum.<Name>. şeklini daha güvenilir tespit eder
function getEnumCompletions(model: monaco.editor.ITextModel, position: monaco.Position): monaco.languages.CompletionItem[] {
    const before = getTextBeforePosition(model, position);
    const enumMatch = before.match(/Enum\.([a-zA-Z_][a-zA-Z0-9_]*)\.$/);
    if (!enumMatch) return [];

    const enumName = enumMatch[1];
    const enumData = (processedDump.Enums as any)?.[enumName];
    if (!enumData || !Array.isArray(enumData.Items)) return [];

    return enumData.Items.map((item: any, idx: number) => ({
        label: item.Name,
        kind: monaco.languages.CompletionItemKind.EnumMember,
        insertText: item.Name,
        detail: `Enum.${enumName}.${item.Name} = ${item.Value ?? idx}`,
        documentation: item.Tags?.includes('Deprecated') ? '⚠️ Deprecated' : undefined,
        sortText: `a_${enumName}_${item.Name}`,
        range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column)
    }));
}

// Local değişkenleri daha iyi tespit et (model önbellekleme ile)
function getLocalCompletions(model: monaco.editor.ITextModel, position: monaco.Position): monaco.languages.CompletionItem[] {
    // Önbellekle yoksa oluştur
    if (!modelCache.has(model)) {
        modelCache.set(model, {});
    }
    const cache = modelCache.get(model)!;

    // Kısa içerik taraması (performans): model boyutu büyükse sadece ilk 200KB'ı tara
    const text = model.getValue();
    const maxLen = 200 * 1024;
    const scanText = text.length > maxLen ? text.slice(0, maxLen) : text;

    const distinctVars = new Set<string>();

    // local variable'lar
    const varPattern = /\blocal\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let m;
    while ((m = varPattern.exec(scanText)) !== null) distinctVars.add(m[1]);

    // function declaration'ları (named functions)
    const funcPattern = /\bfunction\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
    while ((m = funcPattern.exec(scanText)) !== null) distinctVars.add(m[1]);

    // function parametreleri
    const paramPattern = /function[^(]*\(([^)]*)\)/g;
    while ((m = paramPattern.exec(scanText)) !== null) {
        if (!m[1]) continue;
        const params = m[1].split(',').map(p => p.trim());
        for (const p of params) {
            const name = p.split(/[:=]/)[0].trim();
            if (name && /^[a-zA-Z_]/.test(name)) distinctVars.add(name);
        }
    }

    cache.localVars = distinctVars;

    const suggestions: monaco.languages.CompletionItem[] = [];
    distinctVars.forEach(varName => suggestions.push({
        label: varName,
        kind: monaco.languages.CompletionItemKind.Variable,
        insertText: varName,
        detail: 'Local',
        sortText: `z_local_${varName}`,
        range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column)
    }));

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
        const classData = (processedDump.Classes as Record<string, DumpClass> | undefined)?.[type];
        suggestions.push({
            label: type,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: type,
            detail: `Roblox built-in type: ${type}`,
            documentation: classData ? `Roblox built-in type: ${type}` : undefined,
            sortText: `b_type_${type}`,
            range
        });
    });

    ['game', 'workspace', 'script', 'plugin', 'shared'].forEach(global => {
        suggestions.push({
            label: global,
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: global,
            detail: 'Global',
            sortText: `c_global_${global}`,
            range
        });
    });

    return suggestions;
}

// Instance.new() için class listesi
function getInstanceNewCompletions(model: monaco.editor.ITextModel, position: monaco.Position): monaco.languages.CompletionItem[] {
    const before = getTextBeforePosition(model, position);
    // Instance.new("   veya Instance.new('   gibi durumlar
    if (!/Instance\.new\s*\(\s*["']?$/.test(before)) return [];

    return Object.values(processedDump.Classes as Record<string, DumpClass>)
        .filter(cls => !cls.Tags?.includes('NotCreatable') && !cls.Tags?.includes('Service'))
        .map(cls => ({
            label: cls.Name,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: cls.Name,
            detail: 'Roblox Class',
            documentation: `Creates a new ${cls.Name}`,
            sortText: `d_inst_${cls.Name}`,
            range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column)
        }));
}

// :GetService(" için autocomplete
function getGetServiceCompletions(model: monaco.editor.ITextModel, position: monaco.Position): monaco.languages.CompletionItem[] {
    const before = getTextBeforePosition(model, position);
    if (!/:GetService\s*\(\s*["']?$/.test(before)) return [];

    const list = (processedDump.ServiceList || []) as any[];
    return list.map(service => ({
        label: service.Name,
        kind: monaco.languages.CompletionItemKind.Class,
        insertText: service.Name,
        detail: 'Service',
        documentation: `Roblox Service: ${service.Name}`,
        sortText: `e_service_${service.Name}`,
        range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column)
    }));
}

// Ana provider
export const autoCompleteProvider: monaco.languages.CompletionItemProvider = {
    triggerCharacters: [".", ":", '"', "'", "(", ","],

    provideCompletionItems(model, pos, _ctx, _tok) {
        const word = model.getWordUntilPosition(pos);
        const range = new monaco.Range(pos.lineNumber, word.startColumn, pos.lineNumber, word.endColumn);

        const before = getTextBeforePosition(model, pos);

        // Basit string içinde olma tespiti (satır içi) — çok satırlı string'lere kolayca genişletilebilir
        const isInsideString = ((before.match(/\"/g) || []).length % 2 !== 0) || ((before.match(/\'/g) || []).length % 2 !== 0);

        if (isInsideString) {
            return {
                suggestions: [
                    ...getGetServiceCompletions(model, pos),
                    ...getInstanceNewCompletions(model, pos)
                ]
            };
        }

        // Öncelikler: Enum, Hiyerarşi, Metadata, Global, Local, Exploit, Snippet
        const suggestions: monaco.languages.CompletionItem[] = [];

        // 1) Enum
        const enumSuggestions = getEnumCompletions(model, pos);
        if (enumSuggestions.length) return { suggestions: enumSuggestions };

        // 2) Hiyerarşi (örnek: workspace.Part.Position)
        const hierarchy = parseHierarchy(model, pos);
        if (hierarchy.length > 0) {
            const hierarchySuggestions = getHierarchyCompletions(hierarchy, range);
            if (hierarchySuggestions.length) return { suggestions: hierarchySuggestions };
        }

        // 3) Metadata (math, string, table vb.)
        try {
            const apiSuggestions = getModuleCompletions(range) || [];
            suggestions.push(...apiSuggestions);
        } catch (e) {
            // metadata hatası yutulur — öneriler yine devam eder
            // console.warn('Metadata completion error', e);
        }

        // 4) Global Roblox
        suggestions.push(...getGlobalRobloxCompletions(range));

        // 5) Local değişkenler
        suggestions.push(...getLocalCompletions(model, pos));

        // 6) Exploit functions
        suggestions.push(...customExploitFunctions.map(func => ({
            label: func,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: func,
            detail: 'Exploit Global',
            sortText: `y_exploit_${func}`,
            range
        })));

        // 7) Snippet'ler
        suggestions.push(
            {
                label: "task.wait",
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: "task.wait(${1:0})",
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                detail: "Snippet",
                sortText: 'z_snippet_taskwait',
                range
            },
            {
                label: "game:GetService",
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'game:GetService("${1:ServiceName}")',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                detail: "Snippet",
                sortText: 'z_snippet_getservice',
                range
            }
        );

        // Unique etme
        const unique = new Map<string, monaco.languages.CompletionItem>();
        for (const s of suggestions) {
            if (!unique.has(s.label)) unique.set(s.label, s);
        }

        // Convert map back to array
        const out = Array.from(unique.values());

        return { suggestions: out };
    }
};
