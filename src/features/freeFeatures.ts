import * as vscode from 'vscode';

export class FreeFeatures {
    /**
     * Counts the number of characters in the active editor
     */
    public static getCharacterCount(): number {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return 0;
        }
        return editor.document.getText().length;
    }

    /**
     * Counts the number of words in the active editor
     */
    public static getWordCount(): number {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return 0;
        }
        const text = editor.document.getText();
        return text.split(/\s+/).filter(word => word.length > 0).length;
    }
}
