import * as vscode from 'vscode';
import { SidebarProvider } from './webview/sidebarProvider';
import { LicenseService } from './services/licenseService';

export function activate(context: vscode.ExtensionContext) {
	// Initialize services
	const licenseService = new LicenseService(context);

	// Initialize sidebar provider
	const sidebarProvider = new SidebarProvider(context.extensionUri, licenseService);

	// Register the sidebar webview
	const sidebarView = vscode.window.registerWebviewViewProvider(
		"textToolsProSidebar",
		sidebarProvider
	);

	// Start license service and online checking
	licenseService.initialize();

	// Register the show toolbar command
	const showToolbarCommand = vscode.commands.registerCommand('textToolsPro.showToolbar', () => {
		vscode.commands.executeCommand('workbench.view.extension.text-tools-pro');
	});

	// Add to subscriptions
	context.subscriptions.push(
		sidebarView,
		showToolbarCommand,
		licenseService
	);

	// Show welcome message
	//vscode.window.showInformationMessage('Text Tools Pro is now active!');
}

export function deactivate() {
	// Cleanup if needed
}
