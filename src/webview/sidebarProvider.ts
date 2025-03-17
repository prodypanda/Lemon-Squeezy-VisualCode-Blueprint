// src/webview/sidebarProvider.ts
import * as vscode from 'vscode';
import { LicenseService } from '../services/licenseService';
import { FeatureManager } from '../features/featureManager';
import { LicenseInfo } from './../types/index';
import { Validators } from '../utils/validators';


export class SidebarProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private licenseService: LicenseService
    ) {
        this.licenseService.onOnlineStatusChange((isOnline, licenseInfo) => {
            this._view?.webview.postMessage({
                type: 'onlineStatus',
                value: isOnline,
                licenseInfo: licenseInfo,
            });
        });
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'activateLicense':
                    await this.handleActivateLicense(data.value);
                    break;
                case 'deactivateLicense':
                    await this.handleDeactivateLicense();
                    break;
                case 'executeFeature':
                    await this.handleExecuteFeature(data.feature);
                    break;
            }
        });
    }

    private async handleActivateLicense(licenseKey: string) {
        if (!Validators.isValidLicenseKey(licenseKey)) {
            this.postWebviewMessage('error', 'Invalid license key format.');
            return;
        }

        try {
            const licenseInfo = await this.licenseService.activateLicense(licenseKey);
            this.postWebviewMessage('licenseStatus', licenseInfo);
        } catch (error) {
            this.postWebviewMessage('error', error instanceof Error ? error.message : 'An unknown error occurred.');
        }
    }

    private async handleDeactivateLicense() {
        try {
            await this.licenseService.deactivateLicense();
            this.postWebviewMessage('licenseStatus', { valid: false }); // Immediately reflect deactivation
        } catch (error) {
            this.postWebviewMessage('error', error instanceof Error ? error.message : 'An unknown error occurred.');
        }
    }

    private async handleExecuteFeature(feature: string) {
        try {
            const isPremiumEnabled = await this.licenseService.isPremiumEnabled();
            const result = await FeatureManager.executeFeature(feature, isPremiumEnabled);
            this.postWebviewMessage(result.success ? 'featureResult' : 'featureError', result.message, feature);
        } catch (error) {
            this.postWebviewMessage('error', error instanceof Error ? error.message : 'An unknown error occurred.');
        }
    }

    private postWebviewMessage(type: string, value: any, feature?: string) {
        this._view?.webview.postMessage({ type, value, feature });
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        // The HTML content remains largely the same, but benefits from the cleaner message handling
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Lemon Squeezy Blueprint for VS Code</title>
                 <style>
                    body { padding: 5px 15px 15px 15px; }
                    .feature-button {
                        width: 100%;
                        margin: 5px 0;
                        padding: 8px;
                    }
                    .feature-section {
                        margin: 20px 0;
                        padding: 10px;
                        border: 1px solid #ccc;
                    }
                    .license-section {
                    margin-top: 0px;
                        margin-bottom: 20px;
                    }
                    .license-section>h3 {
                        margin-top: 0px;
                        margin-bottom: 5px;
                    }
                    .status-section {
                        position: sticky;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        padding: 10px;
                        margin-top: 0;
                        background: var(--vscode-editor-background);
                        border-top: 1px solid var(--vscode-widget-border);
                    }
                    .loading { opacity: 0.5; pointer-events: none; }
                    .license-info { margin: 10px 0; padding: 10px; background: var(--vscode-editor-background); }
                    .license-info>h4 { margin: 0px 0px; }
                    .error { color: var(--vscode-errorForeground); margin: 5px 0; }
                    .offline-warning, .expired-warning {
                        background: var(--vscode-errorBackground);
                        color: var(--vscode-errorForeground);
                        padding: 8px;
                        margin-bottom: 16px;
                        border-radius: 4px;
                        text-align: center;
                    }
                    div#licenseDetails>p {
                        margin: 5px 0px;
                    }
                    button#deactivateBtn {
                        padding: 5px;
                        margin-top: 10px;
                    }
                   .freefh,.premiumfh {
                        margin: 5px;
                    }
                </style>
            </head>
            <body>
                 <div id="offlineWarning" class="offline-warning" style="display: none">
                    Premium features are temporarily disabled due to offline duration limit.
                </div>
                <!-- NEW: Expired Warning -->
                <div id="expiredWarning" class="expired-warning" style="display: none">
                    Your license has expired. Please renew to continue using premium features.
                </div>

                <div class="license-section" id="licenseSection">
                    <h3>License Management</h3>
                    <div id="licenseForm">
                        <input type="text" id="licenseKey" placeholder="Enter license key">
                        <button onclick="activateLicense()" id="activateBtn">Activate License</button>
                        <div class="error" id="licenseError"></div>
                    </div>
                    <div id="licenseInfo" class="license-info" style="display: none">
                        <h4>License Information</h4>
                        <div id="licenseDetails"></div>
                        <button onclick="deactivateLicense()" id="deactivateBtn">Deactivate License</button>
                    </div>
                    <a href="https://yourstore.lemonsqueezy.com/checkout">Buy License</a>
                </div>

                <div class="feature-section">
                    <h3 class="freefh">Free Features</h3>
                    <button class="feature-button" onclick="executeFeature('characterCount')">
                        Character Count
                    </button>
                    <button class="feature-button" onclick="executeFeature('wordCount')">
                        Word Count
                    </button>
                </div>

                <div class="feature-section">
                    <h3 class="premiumfh">Premium Features</h3>
                    <button class="feature-button premium" onclick="executeFeature('toUpperCase')">
                        Convert to Uppercase
                    </button>
                    <button class="feature-button premium" onclick="executeFeature('toLowerCase')">
                        Convert to Lowercase
                    </button>
                    <button class="feature-button premium" onclick="executeFeature('base64Encode')">
                        Base64 Encode
                    </button>
                    <button class="feature-button premium" onclick="executeFeature('base64Decode')">
                        Base64 Decode
                    </button>
                </div>

                <div class="status-section">
                    <div id="connectionStatus">Online Status: Checking...</div>
                    <div id="licenseStatus">License Status: Checking...</div>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    let licenseState = { valid: false, temporarilyDisabled: false, expired: false };
                    let isOnline = false;

                    const premiumFeatures = [
                        'toUpperCase',
                        'toLowerCase',
                        'base64Encode',
                        'base64Decode'
                    ];
                    function isValidLicenseKey(key) {
                        const pattern = /^[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}$/i;
                        return pattern.test(key);
                    }

                    function activateLicense() {
                        setLoading(true);
                        clearError();
                        const licenseKey = document.getElementById('licenseKey').value;
                        if (!isValidLicenseKey(licenseKey)) {
                            showError('Invalid license key format.');
                            setLoading(false);
                            return;
                        }

                        vscode.postMessage({ type: 'activateLicense', value: licenseKey });
                    }

                    function deactivateLicense() {
                        setLoading(true);
                        clearError();
                        vscode.postMessage({ type: 'deactivateLicense' });
                    }

                    function executeFeature(feature) {
                        if (premiumFeatures.includes(feature)) {
                            if (!licenseState.valid || licenseState.temporarilyDisabled || licenseState.expired) {
                                showError(
                                    licenseState.temporarilyDisabled
                                        ? 'Premium features are temporarily disabled due to offline duration limit.'
                                        : (licenseState.expired ? 'Your license has expired. Please renew to continue using premium features.' : 'Premium license required for this feature.')
                                );
                                return;
                            }
                        }

                        clearError();
                        vscode.postMessage({ type: 'executeFeature', feature: feature });
                    }

                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.type) {
                            case 'onlineStatus':
                                updateOnlineStatus(message.value);
                                updateLicenseStatus(message.licenseInfo); // Simplified
                                 const licenseForm = document.getElementById('licenseForm');
                                const licenseInfoDiv = document.getElementById('licenseInfo');
                                 // NEW: Check for expired
                                if (licenseForm && licenseInfoDiv) {
                                     licenseForm.style.display =
                                        (message.value && (!message.licenseInfo?.valid && !message.licenseInfo?.expired) )? 'block' : 'none';
                                    licenseInfoDiv.style.display =
                                        (message.licenseInfo?.valid || message.licenseInfo?.expired) ? 'block' : 'none';
                                }
                                const offlineWarning = document.getElementById('offlineWarning');
                                if (offlineWarning) {
                                    offlineWarning.style.display =
                                        (!message.value && message.licenseInfo?.temporarilyDisabled) ? 'block' : 'none';
                                }
                                // NEW: Expired Warning Display
                                const expiredWarning = document.getElementById('expiredWarning');
                                 if (expiredWarning) {
                                    expiredWarning.style.display = message.licenseInfo?.expired ? 'block' : 'none';
                                }
                                break;
                            case 'licenseStatus':
                                setLoading(false);
                                licenseState = message.value; // Update license state
                                updateLicenseStatus(message.value);
                                break;
                            case 'featureResult':
                                showResult(message.feature, message.result);
                                break;
                            case 'featureError': // Use distinct type for feature errors
                            case 'error':       // General errors
                                setLoading(false);
                                showError(message.value);
                                break;
                        }
                    });

                   function updateOnlineStatus(online) {
                        isOnline = online;
                        const statusElement = document.getElementById('connectionStatus');
                        statusElement.textContent = \`Online Status: \${online ? 'Connected' : 'Offline'}\`;
                        statusElement.style.color = online ? 'var(--vscode-terminal-ansiGreen)' : 'var(--vscode-terminal-ansiRed)';
                    }

                    function updateLicenseStatus(licenseInfo) {
                        const statusElement = document.getElementById('licenseStatus');
                        const licenseDetails = document.getElementById('licenseDetails');
                        const licenseForm = document.getElementById('licenseForm');
                        const licenseInfoDiv = document.getElementById('licenseInfo');


                        if (!licenseInfo) {
                            // No license key present
                            statusElement.textContent = 'License Status: Not Activated';
                            licenseForm.style.display = isOnline ? 'block' : 'none'; // Show form if online
                            licenseInfoDiv.style.display = 'none';
                            document.querySelectorAll('.premium').forEach(btn => btn.disabled = true); // Disable premium
                            return; // Exit early
                        }

                        licenseState = licenseInfo; // Update the licenseState.

                        if (licenseInfo.valid && !licenseInfo.temporarilyDisabled && !licenseInfo.expired) {
                            statusElement.textContent = \`License Status: \${licenseInfo.status || 'Active'}\`;
                            document.querySelectorAll('.premium').forEach(btn => btn.disabled = false);
                        } else if (licenseInfo.expired) {
                            statusElement.textContent = 'License Status: Expired';
                            document.querySelectorAll('.premium').forEach(btn => btn.disabled = true);
                        } else {
                            statusElement.textContent = licenseInfo.temporarilyDisabled ?
                                'License Status: Temporarily Disabled' :
                                'License Status: Invalid';
                            document.querySelectorAll('.premium').forEach(btn => btn.disabled = true);
                        }

                        // Only show license details if valid OR expired (not temporarily disabled)
                        licenseForm.style.display = (isOnline && !licenseInfo.valid && !licenseInfo.expired) ? 'block' : 'none';
                        licenseInfoDiv.style.display = (licenseInfo.valid || licenseInfo.expired) ? 'block' : 'none';


                        if (licenseInfo.valid || licenseInfo.expired) {
                            licenseDetails.innerHTML = \`
                                <p>Status: \${licenseInfo.expired ? 'Expired' : (licenseInfo.temporarilyDisabled ? 'Temporarily Disabled' : licenseInfo.status || 'Active')}</p>
                                <p>Product Name: \${licenseInfo.productName || 'N/A'}</p>
                                <p>Customer Name: \${licenseInfo.customerName || 'N/A'}</p>
                                <p>Customer Email: \${licenseInfo.customerEmail || 'N/A'}</p>
                                <p>License Key: \${licenseInfo.licenseKey || 'N/A'}</p>
                                <p>Instance Name: \${licenseInfo.instanceName || 'N/A'}</p>
                                <p>Activation Usage: \${licenseInfo.activationUsage || 0} / \${licenseInfo.activationLimit || 'Unlimited'}</p>
                                <p>Created At: \${new Date(licenseInfo.createdAt).toLocaleDateString() || 'N/A'}</p>
                                <p>Expires: \${licenseInfo.expiresAt ? new Date(licenseInfo.expiresAt).toLocaleDateString() : 'Never'}</p>
                            \`;
                        }
                    }



                    function showResult(feature, result) {
                         const resultDiv = document.createElement('div');
                        resultDiv.className = 'feature-result';
                        resultDiv.textContent = result;

                        const oldResult = document.querySelector('.feature-result');
                        if (oldResult) {
                            oldResult.remove();
                        }

                        const button = document.querySelector(\`button[onclick*="\${feature}"]\`);
                        if (button) {
                            button.parentNode.insertBefore(resultDiv, button.nextSibling);
                            setTimeout(() => resultDiv.remove(), 3000);
                        }
                    }

                    function showError(message) {
                        const errorDiv = document.getElementById('licenseError');
                        errorDiv.textContent = message;
                        errorDiv.style.display = 'block';
                    }

                    function clearError() {
                        const errorDiv = document.getElementById('licenseError');
                        errorDiv.textContent = '';
                        errorDiv.style.display = 'none';
                    }

                    function setLoading(loading) {
                        const activateBtn = document.getElementById('activateBtn');
                        const deactivateBtn = document.getElementById('deactivateBtn');
                        if (activateBtn) activateBtn.disabled = loading;
                        if (deactivateBtn) deactivateBtn.disabled = loading;
                        document.querySelectorAll('.feature-button').forEach(btn => btn.disabled = loading);
                    }
                </script>
            </body>
            </html>
        `;
    }
}