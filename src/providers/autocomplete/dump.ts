import { Class, Enum, Root } from "./dumpTypes";

// we need this to parse XML.
const parser = new DOMParser();

let dump: Root =
	localStorage.getItem("APIDump") !== null
		? JSON.parse(localStorage.getItem("APIDump")!)
		: { Classes: [], Enums: [], Version: 1 };

interface ProcessedDump {
	Classes: { [clazz: string]: Class };
	ClassList: Class[],
	Services: { [service: string]: Class },
	ServiceList: Class[],
	Enums: { [enum_: string]: Enum },
	EnumsList: Enum[]
}

export let processedDump: ProcessedDump = {
	Classes: {},
	ClassList: [],
	Services: {},
	ServiceList: [],
	Enums: {},
	EnumsList: []
};


function processDump() {
	processedDump.ClassList = dump.Classes;
	dump.Classes.forEach(clazz => {
		processedDump.Classes[clazz.Name] = clazz;
		if (clazz.Tags && clazz.Tags.indexOf("Service") !== -1) {
			processedDump.Services[clazz.Name] = clazz;
			processedDump.ServiceList.push(clazz);
		}
	});
	dump.Enums.forEach(Enum => {
		processedDump.Enums[Enum.Name] = Enum;
	});
	processedDump.EnumsList = dump.Enums;
}
processDump();

export let docs = {};
export let autoCompleteMetadata =
	localStorage.getItem("BackupAutocompleteMetadata") !== null
		? parser.parseFromString(
			localStorage.getItem("BackupAutocompleteMetadata")!,
			"application/xml"
		)
		: null;
try {
	const response = await fetch(
		"https://raw.githubusercontent.com/MaximumADHD/Roblox-Client-Tracker/roblox/API-Dump.json"
	);
	const dumpText = await response.text();
	dump = JSON.parse(dumpText);
	localStorage.setItem("APIDump", dumpText);
} catch (err) {
	// restore mechanism #1: locally stored API dump
	if (localStorage.getItem("APIDump"))
		console.warn(
			"Failed to fetch due to error:",
			err,
			"Falling back to locally-stored latest stored dump of API (found in working directory)."
		);
	else {
		// restore mechanism #2: locally stored API dump found in working directory
		console.warn(
			"No API dump backup found, falling back to locally-stored latest dump of API in working dir! Error:",
			err
		);
		try {
			const response = await fetch("/backup/API-Dump.json", {
				headers: {
					Accept: "application/json"
				}
			});
			dump = await response.json();
			console.info("Last API dump backup method succeeded!");
		} catch (err) {
			// we failed 😔.
			console.error(
				"Last API dump backup failed to load. THINGS MIGHT BREAK!"
			);
		}
	}
	// NOTE: it's already set, check the initial declaration.
}
processDump();
try {
	const response = await (
		await fetch(
			"https://raw.githubusercontent.com/MaximumADHD/Roblox-Client-Tracker/roblox/AutocompleteMetadata.xml"
		)
	).text();
	try {
		localStorage.setItem("BackupAutocompleteMetadata", response);
	} catch (err) {
		console.warn("Failed saving auto complete metadata. Error:", err);
	}
	autoCompleteMetadata = parser.parseFromString(
		response,
		"application/xml"
	);
} catch (err) {
	// restore mechanism #1: locally stored auto complete metadata
	if (localStorage.getItem("BackupAutocompleteMetadata"))
		console.warn(
			"Failed to fetch due to error:",
			err,
			"Falling back to locally-stored latest stored dump of API."
		);
	else {
		// restore mechanism #2: locally stored autocomplete metadata found in working directory
		console.warn(
			[
				"No auto complete metadata backup found!",
				"falling back to locally-stored auto complete metadata in CKM's root dir"
			].join("\n")
		);
		try {
			const response = await fetch(
				"/backups/autoCompleteMetadata.xml"
			);
			autoCompleteMetadata = parser.parseFromString(
				await response.text(),
				"application/xml"
			);
			console.info(
				"Last auto complete metadata backup method succeeded!"
			);
		} catch (err) {
			// we failed (this shouldn't happen normally) 😔.
			console.error(
				"Last Auto complete metadata backup failed to load. THINGS MIGHT BREAK! Error",
				err
			);
		}
	}
}
try {
	const response = await fetch(
		"https://raw.githubusercontent.com/MaximumADHD/Roblox-Client-Tracker/roblox/api-docs/mini/en-us.json"
	);
	docs = await response.json();
	try {
		localStorage.setItem("APIDocs", JSON.stringify(docs));
	} catch (err) {
		console.warn("Failed saving API Docs:", err);
	}
} catch (err) {
	// restore mechanism #1: locally stored API docs
	const fixable = localStorage.getItem("APIDocs") !== null;
	if (fixable)
		console.warn(
			"Failed to fetch due to error:",
			err,
			". Falling back to locally-stored latest dump of API Documentation"
		);
	else
		console.warn(
			"No API Documentation dump backup (in localStorage), trying last method! Error:",
			err
		);
	if (fixable) docs = JSON.parse(localStorage.getItem("APIDocs")!);
	// restore mechanism #2: locally stored API docs in working directory
	try {
		const response = await fetch("/backups/docs.json");
		docs = await response.json();
		console.info("Last API documentation backup method succeeded!");
	} catch (err) {
		console.error(
			"Last API documentation backup method failed, THINGS MAY BREAK! Error:",
			err
		);
	}
}
