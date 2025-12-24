import * as monaco from "monaco-editor";

// Basit bir Hover Provider tanımlaması
export const hoverProvider: monaco.languages.HoverProvider = {
    // HATA DÜZELTME: Kullanılmayan parametrelerin başına _ eklendi.
    provideHover: (_model, _position) => {
        // Buraya hover mantığınızı ekleyebilirsiniz. Şimdilik null dönüyoruz.
        return null;
    }
};

// Basit bir Signature Help Provider tanımlaması
export const signatureHelpProvider: monaco.languages.SignatureHelpProvider = {
    // HATA DÜZELTME: Kullanılmayan parametrelerin başına _ eklendi.
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
