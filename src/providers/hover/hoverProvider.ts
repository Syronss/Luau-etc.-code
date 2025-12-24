import * as monaco from "monaco-editor";
import { processedDump } from "../autocomplete/dump";
import { EXPLOIT_FUNCTIONS, ROBLOX_GLOBALS, ROBLOX_BUILTIN_TYPES, LUA_KEYWORDS, LUA_2_KEYWORDS } from "../autocomplete/autocompleteProvider";

// Tüm exploit fonksiyonlarını bir array'de topla
const allExploitFunctions: string[] = (() => {
    const functions: string[] = [];
    Object.values(EXPLOIT_FUNCTIONS).forEach(categoryFunctions => {
        functions.push(...categoryFunctions);
    });
    return functions;
})();

// Tipler için interface'ler
interface ProcessedDump {
    Classes: { [key: string]: ClassData };
    Enums: { [key: string]: EnumData };
    ServiceList: Array<{ Name: string }>;
}

interface ClassData {
    Name: string;
    Members: Member[];
    Tags?: string[];
    Superclass?: string;
}

interface Member {
    Name: string;
    MemberType: string;
    ValueType?: { Name: string };
    ReturnType?: { Name: string };
    Parameters?: Array<{ Name: string; Type: { Name: string } }>;
    Tags?: string[];
    Security?: { Read: string } | string | { Read: string; Write: string };
}

interface EnumData {
    Items: Array<{ Name: string; Value: number; Tags?: string[] }>;
}

// Standart Luau Kütüphaneleri için Dokümantasyon Verisi
const luauDocs: Record<string, Record<string, string>> = {
    math: {
        abs: "Returns the absolute value of x.",
        acos: "Returns the arc cosine of x (in radians).",
        asin: "Returns the arc sine of x (in radians).",
        atan: "Returns the arc tangent of x (in radians).",
        atan2: "Returns the arc tangent of y/x (in radians), but uses the signs of both parameters to find the quadrant of the result.",
        ceil: "Returns the smallest integer larger than or equal to x.",
        cos: "Returns the cosine of x (assumed to be in radians).",
        cosh: "Returns the hyperbolic cosine of x.",
        deg: "Converts the angle x from radians to degrees.",
        exp: "Returns the value e^x.",
        floor: "Returns the largest integer smaller than or equal to x.",
        fmod: "Returns the remainder of the division of x by y that rounds the quotient towards zero.",
        frexp: "Returns m and e such that x = m2^e, e is an integer and the absolute value of m is in the range [0.5, 1) (or zero when x is zero).",
        huge: "The value HUGE_VAL, a value larger than or equal to any other numerical value.",
        ldexp: "Returns m2^e (e should be an integer).",
        log: "Returns the natural logarithm of x.",
        log10: "Returns the base-10 logarithm of x.",
        max: "Returns the maximum value among its arguments.",
        min: "Returns the minimum value among its arguments.",
        modf: "Returns two numbers, the integral part of x and the fractional part of x.",
        pi: "The value of pi.",
        pow: "Returns x^y.",
        rad: "Converts the angle x from degrees to radians.",
        random: "Returns a pseudo-random number.",
        randomseed: "Sets x as the \"seed\" for the pseudo-random generator.",
        sin: "Returns the sine of x (assumed to be in radians).",
        sinh: "Returns the hyperbolic sine of x.",
        sqrt: "Returns the square root of x.",
        tan: "Returns the tangent of x (assumed to be in radians).",
        tanh: "Returns the hyperbolic tangent of x.",
        clamp: "Returns a number between min and max, inclusive."
    },
    table: {
        concat: "Given an array where all elements are strings or numbers, returns string table[i]..sep..table[i+1] ... sep..table[j].",
        insert: "Inserts element value at position pos in table.",
        maxn: "Returns the largest positive numerical index of the given table, or zero if the table has no positive numerical indices.",
        remove: "Removes from table the element at position pos, shifting down other elements to close the space.",
        sort: "Sorts table elements in a given order, in-place, from table[1] to table[n].",
        create: "Creates a table with the specified size and initial value.",
        find: "Returns the numeric index of the first occurrence of the value in the table, or nil if not found.",
        pack: "Returns a new table with all parameters stored into keys 1, 2, etc. and the \"n\" field with the total number of parameters.",
        unpack: "Returns the elements from the given table."
    },
    string: {
        byte: "Returns the internal numerical codes of the characters s[i], s[i+1], ..., s[j].",
        char: "Receives zero or more integers. Returns a string with length equal to the number of arguments.",
        dump: "Returns a string containing a binary representation of the given function.",
        find: "Looks for the first match of pattern in the string s.",
        format: "Returns a formatted version of its variable number of arguments following the description given in its first argument.",
        gmatch: "Returns an iterator function that, each time it is called, returns the next captures from pattern over string s.",
        gsub: "Returns a copy of s in which all (or the first n, if given) occurrences of the pattern have been replaced by a replacement string specified by repl.",
        len: "Returns the length of the string.",
        lower: "Returns a copy of this string with all uppercase letters changed to lowercase.",
        match: "Looks for the first match of pattern in the string s.",
        rep: "Returns a string that is the concatenation of n copies of the string s.",
        reverse: "Returns a string that is the string s reversed.",
        sub: "Returns the substring of s that starts at i and continues until j.",
        upper: "Returns a copy of this string with all lowercase letters changed to uppercase.",
        split: "Splits a string into a table of substrings based on a separator."
    },
    task: {
        spawn: "Takes a function or thread and calls it immediately through the engine's scheduler.",
        defer: "Takes a function or thread and schedules it to run at the end of the current resumption cycle.",
        delay: "Schedules a function or thread to be executed after the given duration (in seconds).",
        wait: "Yields the current thread until the next resumption cycle, or for at least the given duration.",
        cancel: "Cancels a thread that was scheduled via task.spawn, task.defer, or task.delay."
    },
    os: {
        clock: "Returns an approximation of the amount in seconds of CPU time used by the program.",
        date: "Returns a string or a table containing date and time, formatted according to the given string format.",
        difftime: "Returns the number of seconds from time t1 to time t2.",
        time: "Returns the current time when called without arguments, or a time representing the date and time specified by the given table."
    }
};

// Luau anahtar kelimeleri için açıklamalar
const keywordDocs: Record<string, string> = {
    "and": "Logical AND operator. Returns true if both operands are true.",
    "or": "Logical OR operator. Returns true if at least one operand is true.",
    "not": "Logical NOT operator. Returns the boolean negation of its operand.",
    "if": "Conditional statement. Executes a block of code if a condition is true.",
    "else": "Alternative branch for an if statement.",
    "elseif": "Additional condition for an if statement.",
    "then": "Keyword used to start the block of code in an if statement.",
    "end": "Keyword used to end a block of code (if, for, function, etc.).",
    "for": "Loop statement. Iterates over a range or table.",
    "while": "Loop statement. Executes a block of code while a condition is true.",
    "repeat": "Loop statement. Executes a block of code until a condition becomes true.",
    "until": "Keyword used to specify the condition for a repeat loop.",
    "do": "Keyword used to start a block of code (loop, function, etc.).",
    "break": "Statement used to exit a loop.",
    "continue": "Statement used to skip to the next iteration of a loop. (Luau 2.0)",
    "function": "Keyword used to define a function.",
    "local": "Keyword used to declare a local variable.",
    "return": "Statement used to return a value from a function.",
    "in": "Keyword used in for loops to iterate over table elements.",
    "type": "Function that returns the type of a value as a string. (Luau 2.0)",
    "typeof": "Function that returns the type of a value as a string, including custom types. (Luau 2.0)",
    "import": "Keyword used to import modules. (Luau 2.0)",
    "export": "Keyword used to export values from a module. (Luau 2.0)",
};

// Exploit fonksiyonları için detaylı açıklamalar
const exploitFunctionDocs: Record<string, string> = {
    "getgenv": "Returns the global environment table. Used to access global variables in the execution environment.",
    "getrenv": "Returns the script's environment table. Useful for hooking functions.",
    "getreg": "Returns the registry table. Contains various internal Lua/engine data.",
    "getgc": "Returns all active garbage collectable objects. Useful for finding and manipulating instances.",
    "getinstances": "Returns all instances in the game. Can be performance intensive.",
    "getnilinstances": "Returns all instances with a parent of nil (usually destroyed or not in workspace).",
    "fireclickdetector": "Fires a ClickDetector without user interaction.",
    "fireproximityprompt": "Fires a ProximityPrompt without user interaction.",
    "firesignal": "Fires a RBXScriptSignal directly.",
    "hookfunction": "Hooks a function to intercept or modify its behavior.",
    "newcclosure": "Creates a new C closure. Used to bypass certain security checks.",
    "islclosure": "Checks if a function is a Lua closure.",
    "checkcaller": "Checks if the current calling context matches certain criteria.",
    "loadstring": "Loads and executes a string as Lua code.",
    "dofile": "Executes a Lua file.",
    "readfile": "Reads a file from the filesystem.",
    "writefile": "Writes data to a file.",
    "task": "Task scheduler library. Provides coroutine-like functionality.",
    "task.wait": "Yields the current thread for the specified duration.",
    "task.spawn": "Spawns a new thread to execute a function.",
    "task.defer": "Schedules a function to run at the end of the current cycle.",
    "task.delay": "Schedules a function to run after a delay.",
    "dumpstring": "Returns a binary representation of a string.",
    "clonefunction": "Creates a deep copy of a function.",
    "getrawmetatable": "Gets the raw metatable of an object, bypassing security.",
    "setrawmetatable": "Sets the raw metatable of an object, bypassing security."
};

// Yardımcı Fonksiyon: Markdown formatında kod bloğu oluşturur
function createCodeBlock(lang: string, code: string): string {
    return `\`\`\`${lang}\n${code}\n\`\`\``;
}

// Yardımcı Fonksiyon: Roblox parametrelerini string'e çevirir
function formatParameters(params: Array<{ Name: string; Type: { Name: string } }>): string {
    if (!params || params.length === 0) return "";
    return params.map(p => `${p.Name}: ${p.Type.Name}`).join(", ");
}

// Yardımcı Fonksiyon: Global Roblox değişkenleri için açıklama getir
function getRobloxGlobalDoc(name: string): string | undefined {
    const global = ROBLOX_GLOBALS.find(g => g.name === name);
    if (global) {
        return `**${global.name}** (${global.type})\n\n${global.description}`;
    }
    return undefined;
}

// Yardımcı Fonksiyon: Exploit fonksiyonu kategorisini bul
function getExploitFunctionCategory(funcName: string): string | undefined {
    for (const [category, funcs] of Object.entries(EXPLOIT_FUNCTIONS)) {
        if ((funcs as string[]).includes(funcName)) {
            return category;
        }
    }
    return undefined;
}

// Yardımcı Fonksiyon: Hiyerarşik yol analizi
function parseContextFromLine(lineContent: string, column: number): {
    hierarchy: string[];
    context: 'property' | 'method' | 'enum' | 'global';
} {
    const textBefore = lineContent.substring(0, column - 1);
    
    // Enum kontrolü
    if (textBefore.includes('Enum.')) {
        return { hierarchy: textBefore.split(/[\.:]/), context: 'enum' };
    }
    
    // Nokta veya iki nokta üst üste ile bölünmüş hiyerarşi
    const dotMatch = textBefore.match(/([a-zA-Z_][a-zA-Z0-9_]*(?:[\.:][a-zA-Z_][a-zA-Z0-9_]*)*)$/);
    if (dotMatch) {
        const hierarchy = dotMatch[0].split(/[\.:]/).filter(Boolean);
        const lastChar = dotMatch[0].slice(-1);
        const context = lastChar === ':' ? 'method' : 'property';
        return { hierarchy, context };
    }
    
    return { hierarchy: [], context: 'global' };
}

export const hoverProvider: monaco.languages.HoverProvider = {
    provideHover: (model, position) => {
        const wordInfo = model.getWordAtPosition(position);
        if (!wordInfo) return null;

        const word = wordInfo.word;
        const lineContent = model.getLineContent(position.lineNumber);
        const range = new monaco.Range(
            position.lineNumber,
            wordInfo.startColumn,
            position.lineNumber,
            wordInfo.endColumn
        );

        const contents: monaco.IMarkdownString[] = [];
        const processedDumpTyped = processedDump as unknown as ProcessedDump;

        // 1. LUAU ANAHTAR KELİMELERİ
        if (LUA_KEYWORDS.includes(word) || LUA_2_KEYWORDS.includes(word)) {
            const doc = keywordDocs[word];
            contents.push({
                value: `**${word}** (Luau Keyword)`
            });
            if (doc) {
                contents.push({ value: doc });
            }
            if (LUA_2_KEYWORDS.includes(word)) {
                contents.push({ value: "*Luau 2.0 keyword*" });
            }
            return { contents, range };
        }

        // 2. LUAU YERLEŞİK TİPLERİ
        if (word === "nil" || word === "boolean" || word === "number" || 
            word === "string" || word === "function" || word === "table" || 
            word === "thread" || word === "userdata") {
            contents.push({ value: `**${word}** (Luau Type)` });
            contents.push({ value: `Built-in Luau type.` });
            return { contents, range };
        }

        // 3. STANDART KÜTÜPHANE KONTROLÜ (math.abs gibi)
        const textBefore = lineContent.substring(0, wordInfo.startColumn - 1);
        const libMatch = textBefore.match(/([a-zA-Z0-9_]+)\.$/);
        if (libMatch) {
            const libName = libMatch[1];
            if (luauDocs[libName] && luauDocs[libName][word]) {
                contents.push({
                    value: `**${libName}.${word}**`
                });
                contents.push({
                    value: luauDocs[libName][word]
                });
                contents.push({
                    value: createCodeBlock("lua", `${libName}.${word}(...)`)
                });
                return { contents, range };
            }
        }

        // 4. ROBLOX GLOBAL DEĞİŞKENLERİ (game, workspace, script)
        const globalDoc = getRobloxGlobalDoc(word);
        if (globalDoc) {
            contents.push({ value: globalDoc });
            return { contents, range };
        }

        // 5. ROBLOX BUILT-IN TİPLERİ (Vector3, CFrame, Color3)
        if (ROBLOX_BUILTIN_TYPES.includes(word)) {
            const classData = processedDumpTyped.Classes[word];
            if (classData) {
                contents.push({ value: `**${classData.Name}** (Roblox Type)` });
                if (classData.Tags && classData.Tags.length > 0) {
                    contents.push({ value: `Tags: [${classData.Tags.join(", ")}]` });
                }
                // Constructor örneği
                if (!classData.Tags?.includes("NotCreatable") && !classData.Tags?.includes("Service")) {
                    contents.push({ value: createCodeBlock("lua", `local instance = Instance.new("${word}")`) });
                } else if (word === "Enum") {
                    contents.push({ value: createCodeBlock("lua", `Enum.KeyCode -- Access enums` ) });
                }
            } else {
                contents.push({ value: `**${word}** (Roblox Built-in Type)` });
            }
            return { contents, range };
        }

        // 6. ROBLOX CLASS KONTROLÜ (Part, Instance, Workspace)
        if (processedDumpTyped.Classes[word]) {
            const classData = processedDumpTyped.Classes[word];
            contents.push({ value: `**${classData.Name}** (Roblox Class)` });
            
            if (classData.Superclass) {
                contents.push({ value: `Inherits from: *${classData.Superclass}*` });
            }
            if (classData.Tags && classData.Tags.length > 0) {
                contents.push({ value: `Tags: [${classData.Tags.join(", ")}]` });
            }
            
            // Constructor örneği
            if (!classData.Tags?.includes("NotCreatable") && !classData.Tags?.includes("Service")) {
                contents.push({ value: createCodeBlock("lua", `local ${word.toLowerCase()} = Instance.new("${word}")`) });
            }
            
            return { contents, range };
        }

        // 7. EXPLOIT FONKSİYONLARI
        if (allExploitFunctions.includes(word)) {
            const category = getExploitFunctionCategory(word);
            const doc = exploitFunctionDocs[word] || "Custom global function provided by the execution environment.";
            
            contents.push({ value: `**${word}** (Exploit Function${category ? ` • ${category}` : ''})` });
            contents.push({ value: doc });
            contents.push({ value: createCodeBlock("lua", `${word}(...)`) });
            return { contents, range };
        }

        // 8. ROBLOX ENUMS (Enum.KeyCode.E)
        if (textBefore.includes("Enum.")) {
            const enumMatch = textBefore.match(/Enum\.([a-zA-Z0-9_]+)\.$/);
            if (enumMatch) {
                const enumName = enumMatch[1];
                const enumData = processedDumpTyped.Enums[enumName];
                if (enumData) {
                    const enumItem = enumData.Items.find(i => i.Name === word);
                    if (enumItem) {
                        contents.push({ value: `**Enum.${enumName}.${word}**` });
                        contents.push({ value: `Value: \`${enumItem.Value}\`` });
                        if (enumItem.Tags?.includes('Deprecated')) {
                            contents.push({ value: `⚠️ **Deprecated**` });
                        }
                        return { contents, range };
                    }
                }
            }
        }

        // 9. MEMBER KONTROLÜ (Properties, Functions, Events)
        let foundMember: Member | undefined = undefined;
        let foundClassName: string = "";

        for (const className in processedDumpTyped.Classes) {
            const cls = processedDumpTyped.Classes[className];
            const member = cls.Members.find(m => m.Name === word);
            if (member) {
                if (!foundMember || (className === "Instance" || className === "BasePart" || className === "Part")) {
                    foundMember = member;
                    foundClassName = className;
                    if (className === "Instance" || className === "BasePart") break;
                }
            }
        }

        if (foundMember) {
            const typeEmoji = foundMember.MemberType === "Property" ? "🔧" : 
                              foundMember.MemberType === "Function" ? "🟦" : 
                              foundMember.MemberType === "Event" ? "⚡" : "🔹";
            
            contents.push({ value: `**${typeEmoji} ${foundMember.Name}** (${foundMember.MemberType})` });
            
            let signature = "";
            if (foundMember.MemberType === "Property") {
                 signature = `${foundClassName}.${foundMember.Name}: ${foundMember.ValueType?.Name || 'unknown'}`;
            } else if (foundMember.MemberType === "Function") {
                const params = formatParameters(foundMember.Parameters || []);
                const ret = foundMember.ReturnType ? foundMember.ReturnType.Name : "void";
                signature = `${foundClassName}:${foundMember.Name}(${params}): ${ret}`;
            } else if (foundMember.MemberType === "Event") {
                const params = formatParameters(foundMember.Parameters || []);
                signature = `${foundClassName}.${foundMember.Name}(${params})`;
            }

            if (signature) {
                contents.push({ value: createCodeBlock("lua", signature) });
            }

            if (foundMember.Tags && foundMember.Tags.length > 0) {
                 contents.push({ value: `*Tags: ${foundMember.Tags.join(", ")}*` });
            }

            if (foundMember.Security) {
                let read: string | undefined;
                let write: string | undefined;
                
                if (typeof foundMember.Security === 'string') {
                    read = foundMember.Security;
                } else if (foundMember.Security && typeof foundMember.Security === 'object' && 'Read' in foundMember.Security) {
                    read = foundMember.Security.Read;
                    write = (foundMember.Security as any).Write;
                }
                
                if (read && read !== "None") contents.push({ value: `🔒 Read: ${read}` });
                if (write && write !== "None") contents.push({ value: `🔒 Write: ${write}` });
            }

            return { contents, range };
        }

        // 10. ROBLOX SERVİSLERİ
        const serviceList = processedDumpTyped.ServiceList || [];
        const service = serviceList.find(s => s.Name === word);
        if (service) {
            contents.push({ value: `**${word}** (Roblox Service)` });
            contents.push({ value: `Use \`game:GetService("${word}")\` to get this service.` });
            return { contents, range };
        }

        return null;
    }
};

export const signatureHelpProvider: monaco.languages.SignatureHelpProvider = {
    signatureHelpTriggerCharacters: ["(", ","],
    signatureHelpRetriggerCharacters: [")"],

    provideSignatureHelp: (model, position, _token, _context) => {
        const lineContent = model.getLineContent(position.lineNumber);
        const textBefore = lineContent.substring(0, position.column - 1);
        
        // Fonksiyon adını bul
        let functionName = "";
        let isMethod = false;
        
        // Method call: obj:method(
        const methodMatch = textBefore.match(/([a-zA-Z0-9_]+):([a-zA-Z0-9_]+)\($/);
        if (methodMatch) {
            functionName = methodMatch[2];
            isMethod = true;
        } 
        // Function call: function(
        else {
            const funcMatch = textBefore.match(/([a-zA-Z0-9_]+)\($/);
            if (funcMatch) {
                functionName = funcMatch[1];
            }
        }

        if (!functionName) return null;

        const signatures = [];

        // Built-in Luau fonksiyonları
        if (functionName === "wait") {
            signatures.push({
                label: 'wait(seconds: number?): nil',
                documentation: 'Yields the current thread for the specified duration. Deprecated in favor of task.wait().',
                parameters: [
                    {
                        label: 'seconds',
                        documentation: 'Duration to wait in seconds (optional, defaults to minimum yield time)'
                    }
                ]
            });
        }

        // task fonksiyonları
        if (functionName.startsWith("task.")) {
            const taskFunc = functionName.substring(5);
            if (taskFunc === "wait") {
                signatures.push({
                    label: 'task.wait(duration: number?): nil',
                    documentation: 'Yields the current thread for the specified duration.',
                    parameters: [
                        {
                            label: 'duration',
                            documentation: 'Duration to wait in seconds (optional, defaults to next resumption cycle)'
                        }
                    ]
                });
            } else if (taskFunc === "spawn") {
                signatures.push({
                    label: 'task.spawn(callback: function, ...): thread',
                    documentation: 'Spawns a new thread to execute the callback function.',
                    parameters: [
                        {
                            label: 'callback',
                            documentation: 'Function to execute in a new thread'
                        },
                        {
                            label: '...',
                            documentation: 'Arguments to pass to the callback function'
                        }
                    ]
                });
            } else if (taskFunc === "delay") {
                signatures.push({
                    label: 'task.delay(delayTime: number, callback: function, ...): thread',
                    documentation: 'Schedules a function to run after a delay.',
                    parameters: [
                        {
                            label: 'delayTime',
                            documentation: 'Delay in seconds before executing the callback'
                        },
                        {
                            label: 'callback',
                            documentation: 'Function to execute after the delay'
                        },
                        {
                            label: '...',
                            documentation: 'Arguments to pass to the callback function'
                        }
                    ]
                });
            }
        }

        // Roblox built-in tipleri
        if (functionName === "new" && textBefore.includes("Instance.")) {
            signatures.push({
                label: 'Instance.new(className: string, parent: Instance?): Instance',
                documentation: 'Creates a new instance of the specified class.',
                parameters: [
                    {
                        label: 'className',
                        documentation: 'Name of the class to instantiate (e.g., "Part", "Script")'
                    },
                    {
                        label: 'parent',
                        documentation: 'Optional parent instance (can be set later)'
                    }
                ]
            });
        }

        // Vector3.new
        if (functionName === "new" && textBefore.includes("Vector3.")) {
            signatures.push({
                label: 'Vector3.new(x: number, y: number, z: number): Vector3',
                documentation: 'Creates a new Vector3 with the given coordinates.',
                parameters: [
                    {
                        label: 'x',
                        documentation: 'X coordinate'
                    },
                    {
                        label: 'y',
                        documentation: 'Y coordinate'
                    },
                    {
                        label: 'z',
                        documentation: 'Z coordinate'
                    }
                ]
            });
        }

        // GetService
        if (functionName === "GetService") {
            signatures.push({
                label: 'game:GetService(serviceName: string): Instance',
                documentation: 'Gets a service by name. Services are singletons that provide specific functionality.',
                parameters: [
                    {
                        label: 'serviceName',
                        documentation: 'Name of the service to retrieve (e.g., "Workspace", "Players")'
                    }
                ]
            });
        }

        // FindFirstChild
        if (functionName === "FindFirstChild") {
            signatures.push({
                label: 'instance:FindFirstChild(name: string, recursive: boolean?): Instance?',
                documentation: 'Finds the first child with the given name.',
                parameters: [
                    {
                        label: 'name',
                        documentation: 'Name of the child to find'
                    },
                    {
                        label: 'recursive',
                        documentation: 'Whether to search recursively (optional, defaults to false)'
                    }
                ]
            });
        }

        if (signatures.length === 0) return null;

        return {
            value: {
                activeSignature: 0,
                activeParameter: 0,
                signatures: signatures.map(sig => ({
                    label: sig.label,
                    documentation: typeof sig.documentation === 'string' ? 
                        { value: sig.documentation } : sig.documentation,
                    parameters: sig.parameters.map(param => ({
                        label: param.label,
                        documentation: typeof param.documentation === 'string' ? 
                            { value: param.documentation } : param.documentation
                    }))
                }))
            },
            dispose: () => {}
        };
    }
};
