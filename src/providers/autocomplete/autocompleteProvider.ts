import * as monaco from "monaco-editor";
import { getModuleCompletions } from "./metadata";
import { processedDump } from "./dump";

// Tipler için interface'ler
interface Member {
    Name: string;
    MemberType: string;
    ValueType?: { Name: string };
    ReturnType?: { Name: string };
    Parameters?: Array<{ Name: string; Type: { Name: string } }>;
    Tags?: string[];
    Security?: { Read: string };
}

interface EnumItem {
    Name: string;
    Value: number;
    Tags?: string[];
}

interface EnumData {
    Items: EnumItem[];
}

interface ClassData {
    Name: string;
    Members: Member[];
    Tags?: string[];
}

interface ProcessedDump {
    Classes: { [key: string]: ClassData };
    Enums: { [key: string]: EnumData };
    ServiceList: Array<{ Name: string }>;
}

// Luau özel tipleri
export const LUA_BUILTIN_TYPES: string[] = [
    "nil", "boolean", "number", "string", "function", "table", "thread", "userdata"
];

// Roblox özel tipleri
export const ROBLOX_BUILTIN_TYPES: string[] = [
    "Vector3", "Vector2", "CFrame", "Color3", "UDim", "UDim2", 
    "Instance", "Enum", "Ray", "Random", "Region3", "TweenInfo",
    "NumberRange", "NumberSequence", "ColorSequence", "BrickColor",
    "RBXScriptSignal", "RBXScriptConnection", "RaycastResult",
    "Axes", "Faces", "BulkMoveTo", "CatalogSearchParams", "PathWaypoint",
    "PhysicalProperties", "Pose", "Region3int16", "Rect", "SharedTable",
    "table", "typeof"
];

// Roblox global değişkenleri
interface RobloxGlobal {
    name: string;
    type: string;
    description: string;
}

export const ROBLOX_GLOBALS: RobloxGlobal[] = [
    { name: "game", type: "DataModel", description: "Root of the Roblox game hierarchy" },
    { name: "workspace", type: "Workspace", description: "The 3D world containing all physical objects" },
    { name: "script", type: "LuaSourceContainer", description: "The current script instance" },
    { name: "shared", type: "table", description: "Shared table between scripts" },
    { name: "_G", type: "table", description: "Global environment table" },
    { name: "plugin", type: "Plugin", description: "Reference to the plugin if running as a plugin" },
    { name: "settings", type: "UserSettings", description: "User settings for the studio" },
];

// Exploit fonksiyonları - kategorilere ayrılmış
export const EXPLOIT_FUNCTIONS = {
    environment: ["getgenv", "getrenv", "getreg"],
    memory: ["getgc", "getinstances", "getnilinstances"],
    interaction: ["fireclickdetector", "fireproximityprompt", "firesignal"],
    hooks: ["hookfunction", "newcclosure", "islclosure", "checkcaller"],
    execution: ["loadstring", "dofile", "readfile", "writefile"],
    task: ["task", "task.wait", "task.spawn", "task.defer", "task.delay"],
    utility: ["dumpstring", "clonefunction", "getrawmetatable", "setrawmetatable"]
};

// Luau özel anahtar kelimeleri
export const LUA_KEYWORDS = [
    "and", "break", "do", "else", "elseif", "end", "false", "for", 
    "function", "if", "in", "local", "nil", "not", "or", "repeat", 
    "return", "then", "true", "until", "while"
];

// Luau 2.0 anahtar kelimeleri
export const LUA_2_KEYWORDS = [
    "continue", "type", "typeof", "import", "export"
];

// Snippet kütüphanesi
interface Snippet {
    label: string;
    insertText: string;
    documentation: string;
}

export const LUA_SNIPPETS: Snippet[] = [
    {
        label: "for i loop",
        insertText: "for ${1:i} = ${2:1}, ${3:10} do\n\t${4:-- code}\nend",
        documentation: "Numeric for loop"
    },
    {
        label: "for pairs loop",
        insertText: "for ${1:key}, ${2:value} in pairs(${3:table}) do\n\t${4:-- code}\nend",
        documentation: "Generic for loop with pairs"
    },
    {
        label: "function",
        insertText: "function ${1:name}(${2:args})\n\t${3:-- code}\nend",
        documentation: "Function definition"
    },
    {
        label: "if statement",
        insertText: "if ${1:condition} then\n\t${2:-- code}\nend",
        documentation: "If statement"
    },
    {
        label: "while loop",
        insertText: "while ${1:condition} do\n\t${2:-- code}\nend",
        documentation: "While loop"
    },
    {
        label: "local variable",
        insertText: "local ${1:variable} = ${2:value}",
        documentation: "Local variable declaration"
    }
];

// Roblox özel snippet'leri
export const ROBLOX_SNIPPETS: Snippet[] = [
    {
        label: "GetService",
        insertText: 'local ${1:service} = game:GetService("${2:ServiceName}")',
        documentation: "Get a Roblox service"
    },
    {
        label: "Instance.new",
        insertText: 'local ${1:instance} = Instance.new("${2:ClassName}"${3:, parent})',
        documentation: "Create new instance"
    },
    {
        label: "Connect event",
        insertText: '${1:event}:Connect(function(${2:args})\n\t${3:-- code}\nend)',
        documentation: "Connect to an event"
    },
    {
        label: "WaitForChild",
        insertText: 'local ${1:child} = ${2:parent}:WaitForChild("${3:ChildName}")',
        documentation: "Wait for a child instance"
    },
    {
        label: "FindFirstChild",
        insertText: 'local ${1:child} = ${2:parent}:FindFirstChild("${3:ChildName}")',
        documentation: "Find a child instance"
    },
    {
        label: "task.spawn",
        insertText: 'task.spawn(function()\n\t${1:-- code}\nend)',
        documentation: "Spawn a new thread"
    },
    {
        label: "task.wait",
        insertText: 'task.wait(${1:0})',
        documentation: "Yield current thread"
    },
    {
        label: "Vector3.new",
        insertText: 'Vector3.new(${1:x}, ${2:y}, ${3:z})',
        documentation: "Create Vector3"
    },
    {
        label: "CFrame.new",
        insertText: 'CFrame.new(${1:x}, ${2:y}, ${3:z})',
        documentation: "Create CFrame"
    },
    {
        label: "UDim2.new",
        insertText: 'UDim2.new(${1:xScale}, ${2:xOffset}, ${3:yScale}, ${4:yOffset})',
        documentation: "Create UDim2"
    }
];

// Tip çıkarımı için yardımcı fonksiyonlar
function inferTypeFromValue(value: string): string {
    if (value.includes('Vector3.new')) return 'Vector3';
    if (value.includes('CFrame.new')) return 'CFrame';
    if (value.includes('UDim2.new')) return 'UDim2';
    if (value.includes('Color3.new')) return 'Color3';
    if (value.includes('Instance.new')) return 'Instance';
    if (value.match(/^\d+$/)) return 'number';
    if (value.match(/^["'].*["']$/)) return 'string';
    if (value === 'true' || value === 'false') return 'boolean';
    if (value === 'nil') return 'nil';
    return 'unknown';
}

// Hiyerarşi parser - geliştirilmiş versiyon
function parseHierarchy(model: monaco.editor.ITextModel, position: monaco.Position): {
    hierarchy: string[];
    chainType: 'property' | 'method' | 'index';
} {
    const lineContent = model.getLineContent(position.lineNumber);
    const textBefore = lineContent.substring(0, position.column - 1);
    
    // Geriye doğru parse et
    const hierarchyMatch = textBefore.match(/([a-zA-Z_][a-zA-Z0-9_]*(?:[\.:\[][a-zA-Z_][a-zA-Z0-9_]*)*)$/);
    if (!hierarchyMatch) return { hierarchy: [], chainType: 'property' };
    
    const fullChain = hierarchyMatch[0];
    const lastChar = fullChain.slice(-1);
    
    let chainType: 'property' | 'method' | 'index' = 'property';
    if (lastChar === ':') chainType = 'method';
    else if (lastChar === '[') chainType = 'index';
    
    // Split by . : [ or ]
    const hierarchy = fullChain.split(/[\.:\[\]]/).filter(Boolean);
    
    // Remove string literals from brackets
    for (let i = 0; i < hierarchy.length; i++) {
        if (hierarchy[i].startsWith('"') || hierarchy[i].startsWith("'")) {
            hierarchy[i] = hierarchy[i].replace(/^["']|["']$/g, '');
        }
    }
    
    return { hierarchy, chainType };
}

// Bir class'ın member'larını getir - geliştirilmiş versiyon
function getClassMembers(className: string, range: monaco.Range, context: string = 'property'): monaco.languages.CompletionItem[] {
    const processedDumpTyped = processedDump as unknown as ProcessedDump;
    const classData = processedDumpTyped.Classes[className];
    if (!classData) return [];

    const suggestions: monaco.languages.CompletionItem[] = [];

    for (const member of classData.Members) {
        // Security check
        if (member.Security && member.Security.Read === 'None') continue;
        
        // Context filtering
        if (context === 'method' && !['Function', 'Method'].includes(member.MemberType)) {
            continue;
        }

        let kind: monaco.languages.CompletionItemKind;
        let insertText = member.Name;
        let detail = '';
        let documentation = member.Tags?.includes('Deprecated') ? '⚠️ **Deprecated**\n\n' : '';

        switch (member.MemberType) {
            case 'Property':
                kind = monaco.languages.CompletionItemKind.Property;
                detail = `Property: ${member.ValueType?.Name || 'unknown'}`;
                documentation += `Type: ${member.ValueType?.Name || 'unknown'}`;
                break;
            case 'Function':
            case 'Method':
                kind = monaco.languages.CompletionItemKind.Method;
                const params = member.Parameters?.map(p => `${p.Name}: ${p.Type.Name}`).join(', ') || '';
                const snippetParams = member.Parameters?.map((p, i) => `\${${i + 1}:${p.Name}}`).join(', ') || '';
                insertText = `${member.Name}(${snippetParams})`;
                detail = `Method(${params})`;
                documentation += `Parameters: ${params || 'none'}`;
                break;
            case 'Event':
                kind = monaco.languages.CompletionItemKind.Event;
                detail = 'Event';
                documentation += 'Roblox event';
                break;
            case 'Callback':
                kind = monaco.languages.CompletionItemKind.Function;
                detail = 'Callback';
                break;
            case 'YieldFunction':
                kind = monaco.languages.CompletionItemKind.Method;
                detail = 'Yield Function';
                documentation += 'This function yields';
                break;
            default:
                kind = monaco.languages.CompletionItemKind.Field;
        }

        suggestions.push({
            label: member.Name,
            kind,
            insertText,
            insertTextRules: insertText.includes('$') 
                ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet 
                : undefined,
            detail,
            documentation: {
                value: documentation || `Member of ${className}`,
                isTrusted: true
            },
            range
        });
    }

    return suggestions;
}

// Hierarchy-based completion - geliştirilmiş
function getHierarchyCompletions(hierarchy: string[], chainType: string, range: monaco.Range): monaco.languages.CompletionItem[] {
    if (hierarchy.length === 0) return [];

    const processedDumpTyped = processedDump as unknown as ProcessedDump;
    let currentClass: string | undefined;
    
    // İlk element'i bul
    const firstElement = hierarchy[0];
    const globalMapping: {[key: string]: string} = {
        'game': 'DataModel',
        'workspace': 'Workspace',
        'script': 'LuaSourceContainer',
        'players': 'Players',
        'lighting': 'Lighting',
        'replicatedstorage': 'ReplicatedStorage',
        'serverstorage': 'ServerStorage',
        'replicatedfirst': 'ReplicatedFirst',
        'startergui': 'StarterGui',
        'starterpack': 'StarterPack',
        'starterplayer': 'StarterPlayer',
        'testservice': 'TestService'
    };
    
    currentClass = globalMapping[firstElement.toLowerCase()] || firstElement;

    // Hierarchy'yi takip et
    for (let i = 1; i < hierarchy.length; i++) {
        if (!currentClass) return [];

        const memberName = hierarchy[i];
        const classData = processedDumpTyped.Classes[currentClass];
        if (!classData) return [];

        // Member'ı bul
        const member = classData.Members.find((m: Member) => 
            m.Name === memberName || 
            m.Name.toLowerCase() === memberName.toLowerCase()
        );
        
        if (!member) {
            // Belki bir child instance ismi?
            return [];
        }

        if (member.MemberType === 'Property' && member.ValueType?.Name) {
            currentClass = member.ValueType.Name;
        } else if (member.ReturnType?.Name) {
            currentClass = member.ReturnType.Name;
        } else {
            return [];
        }
    }

    if (!currentClass) return [];

    return getClassMembers(currentClass, range, chainType);
}

// Enum completion - geliştirilmiş
function getEnumCompletions(model: monaco.editor.ITextModel, position: monaco.Position): monaco.languages.CompletionItem[] {
    const lineContent = model.getLineContent(position.lineNumber);
    const textBefore = lineContent.substring(0, position.column - 1);

    // Enum.KeyCode. veya Enum.KeyCode: gibi pattern'ler
    const enumMatch = textBefore.match(/Enum\.([a-zA-Z_][a-zA-Z0-9_]*)[\.:]$/);
    if (!enumMatch) return [];

    const enumName = enumMatch[1];
    const processedDumpTyped = processedDump as unknown as ProcessedDump;
    const enumData = processedDumpTyped.Enums[enumName];
    if (!enumData) return [];

    return enumData.Items.map((item: EnumItem) => ({
        label: item.Name,
        kind: monaco.languages.CompletionItemKind.EnumMember,
        insertText: item.Name,
        detail: `Enum.${enumName}.${item.Name}`,
        documentation: {
            value: `Value: ${item.Value}\n${item.Tags?.includes('Deprecated') ? '⚠️ **Deprecated**' : ''}`,
            isTrusted: true
        },
        range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column)
    }));
}

// Local variable için tip
interface LocalVariableInfo {
    suggestions: monaco.languages.CompletionItem[];
    typeMap: Map<string, string>;
}

// Geliştirilmiş local variable detection
function getLocalCompletions(model: monaco.editor.ITextModel, position: monaco.Position): LocalVariableInfo {
    const text = model.getValue();
    const suggestions: monaco.languages.CompletionItem[] = [];
    const typeMap = new Map<string, string>();
    const distinctVars = new Set<string>();

    // Fonksiyon scope'larını tespit et
    const lines = text.split('\n');
    const currentLine = position.lineNumber - 1;
    let currentScope = 'global';
    const scopes: Array<{start: number, end: number, name: string}> = [];
    
    // Scope'ları bul
    let scopeLevel = 0;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Function başlangıcı
        const funcMatch = line.match(/\b(function|local\s+function)\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
        if (funcMatch) {
            scopes.push({start: i, end: -1, name: funcMatch[2]});
        }
        
        // Do block'ları
        if (line.includes('do') && !line.includes('end')) {
            scopeLevel++;
        }
        
        // End ifadeleri
        if (line.includes('end')) {
            for (let j = scopes.length - 1; j >= 0; j--) {
                if (scopes[j].end === -1) {
                    scopes[j].end = i;
                    break;
                }
            }
            scopeLevel = Math.max(0, scopeLevel - 1);
        }
    }

    // Mevcut scope'u bul
    for (const scope of scopes) {
        if (currentLine >= scope.start && (scope.end === -1 || currentLine <= scope.end)) {
            currentScope = scope.name;
            break;
        }
    }

    // Local değişkenler
    const varPattern = /\b(?:local)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?::\s*([a-zA-Z_][a-zA-Z0-9_]*))?\s*(?:=\s*(.*?))?(?:\s*--.*?)?$/gm;
    let match;
    
    while ((match = varPattern.exec(text)) !== null) {
        const varName = match[1];
        const varType = match[2] || inferTypeFromValue(match[3] || '');
        
        distinctVars.add(varName);
        typeMap.set(varName, varType);
    }

    // Function isimleri
    const funcPattern = /\b(?:function|local\s+function)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
    while ((match = funcPattern.exec(text)) !== null) {
        distinctVars.add(match[1]);
        typeMap.set(match[1], 'function');
    }

    // Function parametreleri
    const paramPattern = /function[^(]*\(([^)]+)\)/g;
    while ((match = paramPattern.exec(text)) !== null) {
        const params = match[1].split(',');
        params.forEach(param => {
            const paramMatch = param.trim().match(/^([a-zA-Z_][a-zA-Z0-9_]*)(?::\s*([a-zA-Z_][a-zA-Z0-9_]*))?/);
            if (paramMatch) {
                const paramName = paramMatch[1];
                const paramType = paramMatch[2] || 'any';
                distinctVars.add(paramName);
                typeMap.set(paramName, paramType);
            }
        });
    }

    distinctVars.forEach(varName => {
        const varType = typeMap.get(varName) || 'any';
        suggestions.push({
            label: varName,
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: varName,
            detail: `Local ${varType}`,
            documentation: `Type: ${varType}\nScope: ${currentScope}`,
            range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column)
        });
    });

    return { suggestions, typeMap };
}

// Global completions - geliştirilmiş
function getGlobalRobloxCompletions(range: monaco.Range): monaco.languages.CompletionItem[] {
    const suggestions: monaco.languages.CompletionItem[] = [];
    const processedDumpTyped = processedDump as unknown as ProcessedDump;

    // Roblox built-in tipleri
    ROBLOX_BUILTIN_TYPES.forEach(type => {
        const classData = processedDumpTyped.Classes[type];
        suggestions.push({
            label: type,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: type,
            documentation: {
                value: classData ? `**Roblox Class**: ${type}\n\n${classData.Tags?.join(', ') || 'No tags'}` : `Roblox built-in type: ${type}`,
                isTrusted: true
            },
            range
        });
    });

    // Global instances
    ROBLOX_GLOBALS.forEach(global => {
        suggestions.push({
            label: global.name,
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: global.name,
            detail: `Global ${global.type}`,
            documentation: global.description,
            range
        });
    });

    return suggestions;
}

// Instance.new completion - geliştirilmiş
function getInstanceNewCompletions(model: monaco.editor.ITextModel, position: monaco.Position): monaco.languages.CompletionItem[] {
    const lineContent = model.getLineContent(position.lineNumber);
    const textBefore = lineContent.substring(0, position.column - 1);

    const instanceNewMatch = textBefore.match(/Instance\.new\s*\(\s*["']$/);
    if (!instanceNewMatch) return [];

    const processedDumpTyped = processedDump as unknown as ProcessedDump;
    const classValues = Object.values(processedDumpTyped.Classes);
    const filteredClasses = classValues.filter(cls => !cls.Tags?.includes('NotCreatable') && !cls.Tags?.includes('Service'));
    
    return filteredClasses
        .sort((a, b) => a.Name.localeCompare(b.Name))
        .map(cls => ({
            label: cls.Name,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: cls.Name,
            detail: "Creatable Class",
            documentation: {
                value: `**${cls.Name}**\n\nTags: ${cls.Tags?.join(', ') || 'None'}\n\nClick to create new instance`,
                isTrusted: true
            },
            range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column)
        }));
}

// GetService completion - geliştirilmiş
function getGetServiceCompletions(model: monaco.editor.ITextModel, position: monaco.Position): monaco.languages.CompletionItem[] {
    const lineContent = model.getLineContent(position.lineNumber);
    const textBefore = lineContent.substring(0, position.column - 1);

    const getServiceMatch = textBefore.match(/(?:game|workspace|\w+)?:?GetService\s*\(\s*["']$/);
    if (!getServiceMatch) return [];

    const processedDumpTyped = processedDump as unknown as ProcessedDump;
    return processedDumpTyped.ServiceList
        .filter(service => service.Name)
        .sort((a, b) => a.Name.localeCompare(b.Name))
        .map(service => ({
            label: service.Name,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: service.Name,
            detail: "Service",
            documentation: `Roblox Service: ${service.Name}\n\nUse game:GetService("${service.Name}")`,
            range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column)
        }));
}

// Require path completion
function getRequireCompletions(model: monaco.editor.ITextModel, position: monaco.Position): monaco.languages.CompletionItem[] {
    const lineContent = model.getLineContent(position.lineNumber);
    const textBefore = lineContent.substring(0, position.column - 1);

    const requireMatch = textBefore.match(/require\s*\(\s*["']$/);
    if (!requireMatch) return [];

    // Common Roblox module paths
    const commonModules = [
        "ReplicatedStorage.Modules",
        "ServerStorage.Modules",
        "ReplicatedFirst.Modules",
        "StarterPlayer.StarterPlayerScripts",
        "StarterPlayer.StarterCharacterScripts"
    ];

    return commonModules.map(path => ({
        label: path,
        kind: monaco.languages.CompletionItemKind.File,
        insertText: path,
        detail: "Module Path",
        documentation: `Require path: ${path}`,
        range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column)
    }));
}

// Luau type annotations completion
function getTypeCompletions(model: monaco.editor.ITextModel, position: monaco.Position): monaco.languages.CompletionItem[] {
    const lineContent = model.getLineContent(position.lineNumber);
    const textBefore = lineContent.substring(0, position.column - 1);

    const typeMatch = textBefore.match(/:\s*$/);
    if (!typeMatch) return [];

    const allTypes = [...LUA_BUILTIN_TYPES, ...ROBLOX_BUILTIN_TYPES];
    
    return allTypes.map(type => ({
        label: type,
        kind: monaco.languages.CompletionItemKind.TypeParameter,
        insertText: type,
        detail: "Type",
        documentation: `Luau type annotation: ${type}`,
        range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column)
    }));
}

// Label string alma yardımcı fonksiyonu
function getLabelString(label: string | monaco.languages.CompletionItemLabel): string {
    if (typeof label === 'string') {
        return label;
    }
    return label.label;
}

// Geliştirilmiş ana provider
export const autoCompleteProvider: monaco.languages.CompletionItemProvider = {
    triggerCharacters: [".", ":", '"', "'", "(", "[", "{", " ", "\t", ","],
    
    provideCompletionItems(model, position, _context, _token) {
        const word = model.getWordUntilPosition(position);
        const range = new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);

        const lineContent = model.getLineContent(position.lineNumber);
        const textBefore = lineContent.substring(0, position.column - 1);
        
        // String içinde mi kontrolü
        const isInsideString = ((textBefore.match(/"/g) || []).length % 2 !== 0) || 
                              ((textBefore.match(/'/g) || []).length % 2 !== 0);

        const suggestions: monaco.languages.CompletionItem[] = [];

        // String içi completions
        if (isInsideString) {
            const stringSuggestions = [
                ...getGetServiceCompletions(model, position),
                ...getInstanceNewCompletions(model, position),
                ...getRequireCompletions(model, position)
            ];
            
            if (stringSuggestions.length > 0) {
                return { suggestions: stringSuggestions };
            }
        }

        // 1. Luau type annotations
        const typeSuggestions = getTypeCompletions(model, position);
        if (typeSuggestions.length > 0) {
            return { suggestions: typeSuggestions };
        }

        // 2. Enum completion
        const enumSuggestions = getEnumCompletions(model, position);
        if (enumSuggestions.length > 0) {
            return { suggestions: enumSuggestions };
        }

        // 3. Hierarchy-based completion
        const { hierarchy, chainType } = parseHierarchy(model, position);
        if (hierarchy.length > 0) {
            const hierarchySuggestions = getHierarchyCompletions(hierarchy, chainType, range);
            if (hierarchySuggestions.length > 0) {
                return { suggestions: hierarchySuggestions };
            }
        }

        // 4. Metadata (math, string, table vb.)
        const apiSuggestions = getModuleCompletions(range);
        if (apiSuggestions) {
            suggestions.push(...apiSuggestions);
        }

        // 5. Global Roblox tipleri
        suggestions.push(...getGlobalRobloxCompletions(range));

        // 6. Local değişkenler
        const { suggestions: localSuggestions } = getLocalCompletions(model, position);
        suggestions.push(...localSuggestions);

        // 7. Exploit functions (kategorilere ayrılmış)
        Object.entries(EXPLOIT_FUNCTIONS).forEach(([category, funcs]) => {
            funcs.forEach(func => {
                suggestions.push({
                    label: func,
                    kind: monaco.languages.CompletionItemKind.Function,
                    insertText: func,
                    detail: `Exploit • ${category}`,
                    documentation: `Category: ${category}\nExploit global function`,
                    range
                });
            });
        });

        // 8. Luau keywords
        LUA_KEYWORDS.forEach(keyword => {
            suggestions.push({
                label: keyword,
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: keyword,
                detail: "Luau Keyword",
                range
            });
        });

        // 9. Luau 2.0 keywords
        LUA_2_KEYWORDS.forEach(keyword => {
            suggestions.push({
                label: keyword,
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: keyword,
                detail: "Luau 2.0 Keyword",
                range
            });
        });

        // 10. Snippet'ler
        LUA_SNIPPETS.forEach(snippet => {
            suggestions.push({
                label: snippet.label,
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: snippet.insertText,
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                detail: "Snippet",
                documentation: snippet.documentation,
                range
            });
        });

        // 11. Roblox snippet'leri
        ROBLOX_SNIPPETS.forEach(snippet => {
            suggestions.push({
                label: snippet.label,
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: snippet.insertText,
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                detail: "Roblox Snippet",
                documentation: snippet.documentation,
                range
            });
        });

        // Benzersiz öneriler (alfabetik sıralı)
        const uniqueSuggestions = suggestions
            .reduce((acc, item) => {
                if (!acc.find(x => getLabelString(x.label) === getLabelString(item.label))) {
                    acc.push(item);
                }
                return acc;
            }, [] as monaco.languages.CompletionItem[])
            .sort((a, b) => getLabelString(a.label).localeCompare(getLabelString(b.label)));

        return { 
            suggestions: uniqueSuggestions,
            incomplete: false
        };
    },

    // Otomatik tamamlama öncesi özelleştirme
    resolveCompletionItem(item: monaco.languages.CompletionItem) {
        // Ekstra dokümantasyon ekleme
        if (item.documentation && typeof item.documentation === 'string') {
            item.documentation = {
                value: item.documentation,
                isTrusted: true
            };
        }
        
        // Preselect önemli öğeler
        if (['game', 'workspace', 'script', 'Vector3', 'CFrame'].includes(getLabelString(item.label))) {
            item.preselect = true;
        }
        
        return item;
    }
};

// Ek: Hover provider için tip bilgisi
export const createHoverProvider = (): monaco.languages.HoverProvider => ({
    provideHover(model, position) {
        const { hierarchy } = parseHierarchy(model, position);
        if (hierarchy.length === 0) return null;

        const processedDumpTyped = processedDump as unknown as ProcessedDump;
        const lastItem = hierarchy[hierarchy.length - 1];
        
        // Class bilgisi
        const classData = processedDumpTyped.Classes[lastItem];
        if (classData) {
            return {
                contents: [
                    { value: `**${classData.Name}**` },
                    { value: `*Roblox Class*` },
                    { value: `\nMembers: ${classData.Members.length}` },
                    { value: `Tags: ${classData.Tags?.join(', ') || 'None'}` }
                ]
            };
        }

        // Enum bilgisi
        const enumData = processedDumpTyped.Enums[lastItem];
        if (enumData) {
            return {
                contents: [
                    { value: `**Enum.${lastItem}**` },
                    { value: `*Roblox Enum*` },
                    { value: `\nItems: ${enumData.Items.length}` }
                ]
            };
        }

        return null;
    }
});
