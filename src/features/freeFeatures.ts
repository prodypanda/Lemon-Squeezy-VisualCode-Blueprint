// src/features/freeFeatures.ts
import * as vscode from 'vscode';

export class FreeFeatures {
    public static getCharacterCount(): number {
        const editor = vscode.window.activeTextEditor;
        return editor ? editor.document.getText().length : 0;
    }

    public static getWordCount(): number {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return 0;
        const text = editor.document.getText();
        return text.split(/\s+/).filter(word => word.length > 0).length;
    }
}