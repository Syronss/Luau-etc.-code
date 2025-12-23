type externalThemes = [{ name: string; fileContents: string }];

export default async function setupThemes() {
	const externalThemes: externalThemes = JSON.parse(
		localStorage.getItem("externalThemes") || "[]",
	);
	// Seçiciyi daha spesifik hale getirdik (ID ile)
	const select = document.querySelector("#theme-selector") as HTMLSelectElement; 
	
	if (!select) {
		console.error("Theme selector not found!");
		return;
	}

	const importedGroup = select.querySelector(
		"optgroup#themes-imported-group",
	)!;
	
	for (const externalTheme of externalThemes) {
		const option = document.createElement("option");
		const { name } = externalTheme;
		const modifiedName = `external-${
			name.toLowerCase().replace(/[^a-z0-9-]+/g, "-")
		}`;
		option.textContent = `(External) ${name}`;
		option.value = modifiedName;
		option.dataset.defined = JSON.stringify(false);
		importedGroup.appendChild(option);
	}
}
