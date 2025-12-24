import * as monaco from "monaco-editor";
import { processedDump } from "../autocomplete/dump";
import { customExploitFunctions } from "../autocomplete/autocompleteProvider";

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
        spawn: "Takes a function or thread and calls it immediately through the engine’s scheduler.",
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

// Yardımcı Fonksiyon: Markdown formatında kod bloğu oluşturur
function createCodeBlock(lang: string, code: string): string {
    return `\`\`\`${lang}\n${code}\n\`\`\``;
}

// Yardımcı Fonksiyon: Roblox parametrelerini string'e çevirir
function formatParameters(params: any[]): string {
    if (!params) return "";
    return params.map((p: any) => `${p.Name}: ${p.Type.Name}`).join(", ");
}

export const hoverProvider: monaco.languages.HoverProvider = {
    provideHover: (model, position) => {
        const wordInfo = model.getWordAtPosition(position);
        if (!wordInfo) return null;

        const word = wordInfo.word;
        const lineContent = model.getLineContent(position.lineNumber);
        const textBefore = lineContent.substring(0, wordInfo.startColumn - 1);
        const range = new monaco.Range(
            position.lineNumber,
            wordInfo.startColumn,
            position.lineNumber,
            wordInfo.endColumn
        );

        const contents: monaco.IMarkdownString[] = [];

        // 1. STANDART KÜTÜPHANE KONTROLÜ (math.abs gibi)
        // Önceki kelimeyi bul (noktadan önceki)
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
                return { contents, range };
            }
        }

        // 2. ROBLOX CLASS / GLOBAL KONTROLÜ (Part, Instance, Vector3)
        // processedDump.Classes üzerinde arama yap
        if ((processedDump.Classes as any)[word]) {
            const classData = (processedDump.Classes as any)[word];
            contents.push({ value: `**${classData.Name}** (Class)` });
            
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

        // 3. EXPLOIT FONKSİYONLARI
        if (customExploitFunctions.includes(word)) {
            contents.push({ value: `**${word}** (Exploit Function)` });
            contents.push({ value: "Custom global function provided by the execution environment." });
            contents.push({ value: createCodeBlock("lua", `${word}(...)`) });
            return { contents, range };
        }

        // 4. ROBLOX ENUMS (Enum.KeyCode.E)
        if (textBefore.includes("Enum.")) {
            // Enum adını bulmaya çalış (Enum.KeyCode.E -> KeyCode enum'ında E'yi ara)
            const enumMatch = textBefore.match(/Enum\.([a-zA-Z0-9_]+)\.$/);
            if (enumMatch) {
                const enumName = enumMatch[1];
                const enumData = (processedDump.Enums as any)[enumName];
                if (enumData) {
                    const enumItem = enumData.Items.find((i: any) => i.Name === word);
                    if (enumItem) {
                        contents.push({ value: `**Enum.${enumName}.${word}**` });
                        contents.push({ value: `Value: \`${enumItem.Value}\`` });
                        return { contents, range };
                    }
                }
            }
        }

        // 5. MEMBER KONTROLÜ (Properties, Functions, Events)
        // Bu kelime herhangi bir class'ın üyesi mi?
        
        let foundMember: any = null;
        let foundClassName: string = "";

        for (const className in processedDump.Classes) {
            const cls = (processedDump.Classes as any)[className];
            const member = cls.Members.find((m: any) => m.Name === word);
            if (member) {
                // Önceliklendirme: Eğer kelime "Instance" veya "BasePart" gibi temel sınıflardaysa onu tercih et
                if (!foundMember || (className === "Instance" || className === "BasePart" || className === "Part")) {
                    foundMember = member;
                    foundClassName = className;
                    // Temel sınıflarda bulduysak aramayı durdur, bu daha geneldir
                    if (className === "Instance" || className === "BasePart") break;
                }
            }
        }

        if (foundMember) {
            const typeEmoji = foundMember.MemberType === "Property" ? "🔧" : 
                              foundMember.MemberType === "Function" ? "🟦" : 
                              foundMember.MemberType === "Event" ? "⚡" : "🔹";
            
            // HATA DÜZELTİLDİ: typeEmoji değişkeni artık kullanılıyor
            contents.push({ value: `**${typeEmoji} ${foundMember.Name}**` });
            
            let signature = "";
            if (foundMember.MemberType === "Property") {
                 signature = `(Property) ${foundClassName}.${foundMember.Name}: ${foundMember.ValueType.Name}`;
            } else if (foundMember.MemberType === "Function") {
                const params = formatParameters(foundMember.Parameters);
                const ret = foundMember.ReturnType ? foundMember.ReturnType.Name : "void";
                signature = `(Method) ${foundClassName}:${foundMember.Name}(${params}): ${ret}`;
            } else if (foundMember.MemberType === "Event") {
                const params = formatParameters(foundMember.Parameters);
                signature = `(Event) ${foundClassName}.${foundMember.Name}(${params})`;
            }

            contents.push({ value: createCodeBlock("typescript", signature) });

            if (foundMember.Tags && foundMember.Tags.length > 0) {
                 contents.push({ value: `*Tags: ${foundMember.Tags.join(", ")}*` });
            }

            if (foundMember.Security) {
                let read = typeof foundMember.Security === 'string' ? foundMember.Security : foundMember.Security.Read;
                let write = typeof foundMember.Security === 'object' ? foundMember.Security.Write : "";
                
                if (read && read !== "None") contents.push({ value: `🔒 Read: ${read}` });
                if (write && write !== "None") contents.push({ value: `🔒 Write: ${write}` });
            }

            return { contents, range };
        }

        return null;
    }
};

export const signatureHelpProvider: monaco.languages.SignatureHelpProvider = {
    provideSignatureHelp: (_model, _position, _token, _context) => {
        return {
            value: {
                activeSignature: 0,
                activeParameter: 0,
                signatures: []
            },
            dispose: () => {}
        };
    }
};
