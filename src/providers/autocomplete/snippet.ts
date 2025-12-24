import * as monaco from "monaco-editor";

export interface Snippet {
	label: string;
	prefix: string;
	body: string;
	description: string;
	category: 'basic' | 'loops' | 'functions' | 'roblox' | 'exploit';
}

export const snippets: Snippet[] = [
	// Basic
	{
		label: "local variable",
		prefix: "local",
		body: "local ${1:variableName} = ${2:value}",
		description: "Create a local variable",
		category: 'basic'
	},
	{
		label: "print statement",
		prefix: "print",
		body: "print(${1:message})",
		description: "Print to console",
		category: 'basic'
	},
	{
		label: "warn statement",
		prefix: "warn",
		body: "warn(${1:message})",
		description: "Warn to console",
		category: 'basic'
	},
	
	// Loops
	{
		label: "for loop numeric",
		prefix: "forn",
		body: "for ${1:i} = ${2:1}, ${3:10} do\n\t${4:-- code}\nend",
		description: "Numeric for loop",
		category: 'loops'
	},
	{
		label: "for loop pairs",
		prefix: "forp",
		body: "for ${1:key}, ${2:value} in pairs(${3:table}) do\n\t${4:-- code}\nend",
		description: "Pairs iteration",
		category: 'loops'
	},
	{
		label: "for loop ipairs",
		prefix: "fori",
		body: "for ${1:index}, ${2:value} in ipairs(${3:array}) do\n\t${4:-- code}\nend",
		description: "Ipairs iteration",
		category: 'loops'
	},
	{
		label: "while loop",
		prefix: "while",
		body: "while ${1:condition} do\n\t${2:-- code}\nend",
		description: "While loop",
		category: 'loops'
	},
	{
		label: "repeat until",
		prefix: "repeat",
		body: "repeat\n\t${1:-- code}\nuntil ${2:condition}",
		description: "Repeat until loop",
		category: 'loops'
	},
	
	// Functions
	{
		label: "function declaration",
		prefix: "func",
		body: "function ${1:functionName}(${2:params})\n\t${3:-- code}\nend",
		description: "Function declaration",
		category: 'functions'
	},
	{
		label: "local function",
		prefix: "lfunc",
		body: "local function ${1:functionName}(${2:params})\n\t${3:-- code}\nend",
		description: "Local function declaration",
		category: 'functions'
	},
	{
		label: "anonymous function",
		prefix: "afunc",
		body: "function(${1:params})\n\t${2:-- code}\nend",
		description: "Anonymous function",
		category: 'functions'
	},
	
	// Roblox
	{
		label: "Instance.new",
		prefix: "new",
		body: 'local ${1:instance} = Instance.new("${2:Part}")',
		description: "Create new instance",
		category: 'roblox'
	},
	{
		label: "GetService",
		prefix: "service",
		body: 'local ${1:ServiceName} = game:GetService("${1:ServiceName}")',
		description: "Get Roblox service",
		category: 'roblox'
	},
	{
		label: "Connect event",
		prefix: "connect",
		body: "${1:event}:Connect(function(${2:params})\n\t${3:-- code}\nend)",
		description: "Connect to event",
		category: 'roblox'
	},
	{
		label: "Wait for child",
		prefix: "wfc",
		body: "local ${1:child} = ${2:parent}:WaitForChild(\"${3:ChildName}\")",
		description: "Wait for child",
		category: 'roblox'
	},
	{
		label: "Find first child",
		prefix: "ffc",
		body: "local ${1:child} = ${2:parent}:FindFirstChild(\"${3:ChildName}\")",
		description: "Find first child",
		category: 'roblox'
	},
	{
		label: "task.wait",
		prefix: "wait",
		body: "task.wait(${1:0})",
		description: "Wait for duration",
		category: 'roblox'
	},
	{
		label: "task.spawn",
		prefix: "spawn",
		body: "task.spawn(function()\n\t${1:-- code}\nend)",
		description: "Spawn new thread",
		category: 'roblox'
	},
	{
		label: "Remote Event Client",
		prefix: "remoteclient",
		body: "local ${1:RemoteEvent} = game:GetService(\"ReplicatedStorage\"):WaitForChild(\"${2:RemoteEventName}\")\n\n${1:RemoteEvent}:FireServer(${3:args})",
		description: "Fire remote event from client",
		category: 'roblox'
	},
	{
		label: "Remote Event Server",
		prefix: "remoteserver",
		body: "local ${1:RemoteEvent} = game:GetService(\"ReplicatedStorage\"):WaitForChild(\"${2:RemoteEventName}\")\n\n${1:RemoteEvent}.OnServerEvent:Connect(function(player, ${3:args})\n\t${4:-- code}\nend)",
		description: "Handle remote event on server",
		category: 'roblox'
	},
	
	// Exploit
	{
		label: "loadstring",
		prefix: "loadstring",
		body: "loadstring(${1:code})()",
		description: "Load and execute string",
		category: 'exploit'
	},
	{
		label: "hookfunction",
		prefix: "hookfunc",
		body: "local old${1:FunctionName} = hookfunction(${2:originalFunction}, function(${3:args})\n\t${4:-- code}\n\treturn old${1:FunctionName}(${3:args})\nend)",
		description: "Hook a function",
		category: 'exploit'
	},
	{
		label: "getgenv table",
		prefix: "getgenv",
		body: "getgenv().${1:variableName} = ${2:value}",
		description: "Set global environment variable",
		category: 'exploit'
	},
	{
		label: "firesignal",
		prefix: "firesignal",
		body: "firesignal(${1:signal}, ${2:args})",
		description: "Fire a signal",
		category: 'exploit'
	},
	{
		label: "fireclickdetector",
		prefix: "fireclick",
		body: "fireclickdetector(${1:clickDetector})",
		description: "Fire click detector",
		category: 'exploit'
	}
];

// Monaco'ya snippet'leri ekle
export function registerSnippets() {
	monaco.languages.registerCompletionItemProvider('luau', {
		provideCompletionItems: (model, position) => {
			const word = model.getWordUntilPosition(position);
			const range = new monaco.Range(
				position.lineNumber,
				word.startColumn,
				position.lineNumber,
				word.endColumn
			);

			return {
				suggestions: snippets.map(snippet => ({
					label: snippet.label,
					kind: monaco.languages.CompletionItemKind.Snippet,
					insertText: snippet.body,
					insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
					documentation: snippet.description,
					detail: `[${snippet.category}] ${snippet.prefix}`,
					range: range,
					sortText: `9_${snippet.label}` // Snippets en altta görünsün
				}))
			};
		}
	});
}

// Kullanım: main.ts'de registerSnippets() çağır
