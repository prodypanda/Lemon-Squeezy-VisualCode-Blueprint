// src/extension.ts
import * as vscode from 'vscode';
import { SidebarProvider } from './webview/sidebarProvider';
import { LicenseService } from './services/licenseService';

export function activate(context: vscode.ExtensionContext) {
	const licenseService = new LicenseService(context);
	licenseService.initialize();

	const sidebarProvider = new SidebarProvider(context.extensionUri, licenseService);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider("textToolsProSidebar", sidebarProvider),
		vscode.commands.registerCommand('textToolsPro.showToolbar', () => {
			vscode.commands.executeCommand('workbench.view.extension.text-tools-pro');
		}),
		licenseService // Important: Keep licenseService in subscriptions for disposal
	);
}

export function deactivate() { }