import * as vscode from 'vscode';

export class PremiumFeatures {
    /**
     * Converts text to uppercase
     */
    public static convertToUpperCase(): void {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        const document = editor.document;
        const text = document.getText();

        editor.edit(editBuilder => {
            const range = new vscode.Range(
                document.positionAt(0),
                document.positionAt(text.length)
            );
            editBuilder.replace(range, text.toUpperCase());
        });
    }

    /**
     * Converts text to lowercase
     */
    public static convertToLowerCase(): void {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        const document = editor.document;
        const text = document.getText();

        editor.edit(editBuilder => {
            const range = new vscode.Range(
                document.positionAt(0),
                document.positionAt(text.length)
            );
            editBuilder.replace(range, text.toLowerCase());
        });
    }

    /**
     * Encodes text to base64
     */
    public static base64Encode(): void {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        const document = editor.document;
        const text = document.getText();

        editor.edit(editBuilder => {
            const range = new vscode.Range(
                document.positionAt(0),
                document.positionAt(text.length)
            );
            editBuilder.replace(range, Buffer.from(text).toString('base64'));
        });
    }

    /**
     * Decodes text from base64
     */
    public static base64Decode(): void {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        const document = editor.document;
        const text = document.getText();

        try {
            const decoded = Buffer.from(text, 'base64').toString('utf-8');
            editor.edit(editBuilder => {
                const range = new vscode.Range(
                    document.positionAt(0),
                    document.positionAt(text.length)
                );
                editBuilder.replace(range, decoded);
            });
        } catch (error) {
            vscode.window.showErrorMessage('Invalid base64 string');
        }
    }
}
