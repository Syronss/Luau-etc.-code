import * as monaco from "monaco-editor";

export async function initThemes() {
    // 1. Seçiciyi (Dropdown) doğru şekilde bul
    const select = document.querySelector("#theme-selector") as HTMLSelectElement;
    if (!select) {
        console.error("Theme selector not found!");
        return;
    }

    const bundledGroup = select.querySelector("optgroup#themes-bundled-group");
    if (!bundledGroup) {
        console.error("Bundled themes group not found!");
        return;
    }

    // 2. Temaları listeye ekleyen fonksiyon
    const registerThemes = async (themes: string[]): Promise<void> => {
        for (const themeFileName of themes) {
            // Dosya isminden .json uzantısını kaldırıp görünen ismi oluştur
            const name = themeFileName.replace(".json", "");
            // Monaco için güvenli bir ID oluştur (boşlukları tire yap, küçült)
            const modifiedName = name.toLowerCase().replace(/[^a-z0-9-]+/g, "-");

            const option = document.createElement("option");
            option.textContent = name;
            option.value = modifiedName;
            
            // ÖNEMLİ: Dosya yolu küçük harfle 'themes' olmalı
            option.dataset.filePath = `/themes/data/${themeFileName}`;
            option.dataset.defined = "false"; // Henüz yüklenmedi
            
            bundledGroup.appendChild(option);
        }
    };

    // 3. themes.json dosyasını çek ve listeyi doldur
    try {
        const res = await fetch("/themes/data/themes.json");
        if (res.ok) {
            const themeList = await res.json();
            await registerThemes(themeList);
        } else {
            console.error("themes.json bulunamadı! Lütfen dosya yolunu kontrol edin: /public/themes/data/themes.json");
        }
    } catch (error) {
        console.error("Tema listesi yüklenirken hata oluştu:", error);
    }

    // 4. SEÇİM OLAYI (Bu kısım eksikti, o yüzden çalışmıyordu)
    select.addEventListener("change", async () => {
        const value = select.value;
        const selectedOption = select.options[select.selectedIndex];

        // "Dosyada ara" gibi özel seçenekleri yoksay
        if (value === "find-in-files") return;

        // Dosya yolu olmayan (varsayılan) temalar için direkt geçiş yap
        if (!selectedOption.dataset.filePath) {
            monaco.editor.setTheme(value);
            return;
        }

        // Tema daha önce yüklenmemişse, fetch ile indirip tanımla
        const isDefined = JSON.parse(selectedOption.dataset.defined || "false");
        
        if (!isDefined) {
            try {
                const filePath = selectedOption.dataset.filePath!;
                // Temayı indir
                const themeRes = await fetch(filePath);
                
                if (!themeRes.ok) {
                    console.error(`Tema dosyası bulunamadı: ${filePath}`);
                    alert(`Tema dosyası yüklenemedi: ${filePath}`);
                    return;
                }

                const themeData = await themeRes.json();
                
                // Monaco Editor'e temayı tanıt
                monaco.editor.defineTheme(value, themeData);
                
                // Artık yüklendi olarak işaretle, bir dahakine tekrar indirmesin
                selectedOption.dataset.defined = "true";
                
                // Temayı uygula
                monaco.editor.setTheme(value);
                
            } catch (e) {
                console.error("Tema yüklenirken hata:", e);
                alert("Tema yüklenirken bir hata oluştu. Konsolu (F12) kontrol edin.");
            }
        } else {
            // Zaten yüklüyse direkt uygula
            monaco.editor.setTheme(value);
        }
    });
}

export default initThemes;
