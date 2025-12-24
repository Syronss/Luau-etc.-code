import * as monaco from "monaco-editor";

export async function initThemes() {
    // ID ile doğru elementi seçelim
	const select = document.querySelector("#theme-selector") as HTMLSelectElement;
    if (!select) {
        console.error("Theme selector not found!");
        return;
    }

	const bundledGroup = select.querySelector(
		"optgroup#themes-bundled-group"
	)!;

	/**
	 * @param {string[]} themes A list of theme file names.
	 * @returns {Promise<void>}
	 */
	const registerThemes = async (themes: string[]): Promise<void> => {
		for (const themeFileName of themes) {
			const name = themeFileName.replace(".json", "");
			const modifiedName = name
				.toLowerCase()
				.replace(/[^a-z0-9-]+/g, "-");
			
            const option = document.createElement("option");
			option.textContent = name;
			option.value = modifiedName;
            
            // DÜZELTME: Dosya yolunu 'themes/data' olarak güncelledik (büyük/küçük harfe dikkat)
			option.dataset.filePath = `/themes/data/${themeFileName}`;
			option.dataset.defined = JSON.stringify(false);
			bundledGroup.appendChild(option);
		}
	};

    // Listeyi yükle
	const res = await fetch("/themes/data/themes.json");
	if (res.ok) await registerThemes(await res.json());

    // YENİ EKLENTİ: Tema değiştirme olayını dinle
    select.addEventListener("change", async () => {
        const value = select.value;
        const selectedOption = select.options[select.selectedIndex];

        // Özel aksiyonlar (find-in-files vb.) için kontrol
        if (value === "find-in-files") return;

        // Varsayılan temalar (dosya yolu olmayanlar) için direkt geçiş yap
        if (!selectedOption.dataset.filePath) {
            monaco.editor.setTheme(value);
            return;
        }

        // Tema daha önce tanımlanmamışsa yükle
        const isDefined = JSON.parse(selectedOption.dataset.defined || "false");
        
        if (!isDefined) {
            try {
                const filePath = selectedOption.dataset.filePath!;
                const themeRes = await fetch(filePath);
                
                if (!themeRes.ok) {
                    console.error(`Theme file not found: ${filePath}`);
                    return;
                }

                const themeData = await themeRes.json();
                
                // Temayı Monaco'ya tanımla
                monaco.editor.defineTheme(value, themeData);
                
                // Tanımlandı olarak işaretle
                selectedOption.dataset.defined = "true";
                
                // Temayı uygula
                monaco.editor.setTheme(value);
            } catch (e) {
                console.error("Error loading theme:", e);
            }
        } else {
            // Zaten yüklüyse direkt uygula
            monaco.editor.setTheme(value);
        }
    });
}

export default initThemes;
