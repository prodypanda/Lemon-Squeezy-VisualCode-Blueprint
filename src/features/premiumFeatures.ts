// src/features/premiumFeatures.ts
import * as vscode from 'vscode';

export class PremiumFeatures {
    private static async applyTextTransformation(transform: (text: string) => string): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const document = editor.document;
        const text = document.getText();
        const range = new vscode.Range(document.positionAt(0), document.positionAt(text.length));

        await editor.edit(editBuilder => {
            editBuilder.replace(range, transform(text));
        });
    }

    public static async convertToUpperCase(): Promise<void> {
        await this.applyTextTransformation(text => text.toUpperCase());
    }

    public static async convertToLowerCase(): Promise<void> {
        await this.applyTextTransformation(text => text.toLowerCase());
    }

    public static async base64Encode(): Promise<void> {
        await this.applyTextTransformation(text => Buffer.from(text).toString('base64'));
    }

    public static async base64Decode(): Promise<void> {
        try {
            await this.applyTextTransformation(text => Buffer.from(text, 'base64').toString('utf-8'));
        } catch (error) {
            vscode.window.showErrorMessage('Invalid base64 string');
        }
    }
}