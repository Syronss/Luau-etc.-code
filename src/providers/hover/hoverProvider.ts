// src/providers/hover/hoverProvider.ts
import * as monaco from "monaco-editor";

// Basit bir Hover Provider tanımlaması
export const hoverProvider: monaco.languages.HoverProvider = {
    provideHover: (model, position) => {
        // Buraya hover mantığınızı ekleyebilirsiniz. Şimdilik boş dönüyoruz.
        return null;
    }
};

// Basit bir Signature Help Provider tanımlaması
export const signatureHelpProvider: monaco.languages.SignatureHelpProvider = {
    provideSignatureHelp: (model, position, token, context) => {
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
