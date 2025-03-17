# Lemon Squeezy Blueprint for VS Code

This VS Code extension provides a blueprint for integrating Lemon Squeezy licensing into your own VS Code extensions. It demonstrates how to:

*   **Differentiate between free and premium features.**
*   **Activate, validate, and deactivate licenses using the Lemon Squeezy API.**
*   **Handle offline scenarios gracefully, providing temporary access to premium features.**
*   **Provide a user-friendly interface within a VS Code sidebar for license management.**
*   **Show appropriate notifications for license status changes (expired, temporarily disabled, etc.)**

This blueprint is designed to be easily adaptable to your specific extension's needs. You can modify the feature set, UI, and API endpoints to match your requirements.

## Key Features

*   **License Activation:** Users can enter their Lemon Squeezy license key to activate premium features.  The extension validates the key format locally *before* sending it to the Lemon Squeezy API.
*   **License Validation:**  The extension periodically validates the license key with the Lemon Squeezy API to ensure its continued validity.  This happens in the background.
*   **License Deactivation:** Users can deactivate their license, freeing it up for use on another machine.
*   **Offline Grace Period:** If the extension cannot connect to the Lemon Squeezy API, premium features remain available for a configurable grace period (defaulting to 7 days in production and 30 seconds in development).  A clear warning message is displayed.
*   **License Expiration Handling:** The extension detects expired licenses and disables premium features. A warning message is shown to the user.
*   **Clear Status Indicators:** The sidebar displays the current online status and license status (Active, Inactive, Expired, Temporarily Disabled).
*   **Detailed License Information:**  The sidebar shows detailed license information, including:
    *   Status
    *   Product Name
    *   Customer Name
    *   Customer Email
    *   License Key
    *   Instance Name
    *   Activation Usage / Limit
    *   Creation Date
    *   Expiration Date
*   **Error Handling:**  The extension handles various error scenarios, including:
    *   Invalid license key format (client-side validation).
    *   License key not found (404 from the API).
    *   License key expired (400 from the API).
    *   Network connectivity issues.
    *   General API errors.
    * User-friendly error messages are displayed in the sidebar.
*   **Example Features:** The extension includes example free (character count, word count) and premium features (convert to uppercase, convert to lowercase, Base64 encode, Base64 decode) to demonstrate how to differentiate feature access.
*   **Well-Structured Code:** The code is organized into logical modules (services, features, utils, webview) for easy modification and maintenance.
*   **Extensive Comments:** The code is thoroughly commented to explain the purpose of each section.
*   **TypeScript:**  The extension is written in TypeScript for type safety and improved maintainability.
* **Status 404 and 400 Handling:** The extension handles correctly the errors 404 and 400 and display to the user the correct message.

## File Structure

```
lemonsqueezy-visualcode-blueprint/
├── package.json          // Extension manifest
└── src                   // Source code
    ├── config.ts         // Configuration settings (API endpoints, timings, etc.)
    ├── extension.ts      // Main extension entry point
    ├── features          // Feature implementations
    │   ├── featureManager.ts // Manages feature execution based on license status
    │   ├── freeFeatures.ts   // Implementations of free features
    │   └── premiumFeatures.ts // Implementations of premium features
    ├── services          // Services for interacting with external resources
    │   ├── apiService.ts     // Handles communication with the Lemon Squeezy API
    │   └── licenseService.ts // Manages license activation, validation, and deactivation
    ├── types             // Type definitions
    │   ├── extensionConfig.ts // type of config
    │   └── index.ts      // General type definitions (LicenseResponse, WebviewMessage, etc.)
    ├── utils             // Utility functions
    │   ├── networkMonitor.ts // Monitors network connectivity and manages offline grace period
    │   └── validators.ts  // Validation functions (license key format, offline duration, etc.)
    └── webview           // Webview-related code
        └── sidebarProvider.ts // Provides the content and logic for the sidebar webview
```

## Getting Started (For Developers Building Their Own Extension)

1.  **Clone the Repository:**

    ```bash
    git clone https://github.com/YOUR_GITHUB_USERNAME/lemonsqueezy-visualcode-blueprint.git
    cd lemonsqueezy-visualcode-blueprint
    ```

2.  **Install Dependencies:**

    ```bash
    npm install
    ```

3.  **Configure for Your Product:**

    *   **`src/config.ts`:**
        *   **`STORE_ID`:** Replace `157343` with your Lemon Squeezy store ID.
        *   **`PRODUCT_ID`:** Replace `463516` with your Lemon Squeezy product ID.
        *   **`API_ENDPOINTS`:**  If you are *not* using the standard Lemon Squeezy API, update these URLs.  In most cases, you will *not* need to change these.
        *   **`TIMING`:** Adjust `ONLINE_PING_INTERVAL` (how often to check the license) and `OFFLINE_DURATION_LIMIT` (how long premium features are available offline) as needed.  The default is 7 days for production builds and 30 seconds for development builds.
        *   **`FEATURES`:**  Modify the `FREE` and `PREMIUM` arrays to reflect the features of *your* extension. These are just example features; replace them with your own command IDs.
        *   **`UI.MESSAGES`:**  Customize the user-facing messages if desired.
        * **`STORAGE_KEYS`:** Do not modify.
    *   **`package.json`:**
        *   Update `name`, `displayName`, `description`, `publisher`, `version`, `repository`, and `icon` to match your extension.
        *   Change the `contributes.commands` section to define your extension's commands.  The provided commands are examples; replace them with your own. The command names should match the feature names in `config.ts`.
        *   Update the `contributes.viewsContainers` and `contributes.views` sections if you want to use a different ID or title for the sidebar.
        * Update `activationEvents` if necessary.

4.  **Implement Your Features:**

    *   **`src/features/freeFeatures.ts`:** Add or modify the implementations of your free features.  Use the `vscode` API to interact with the editor and other VS Code components.
    *   **`src/features/premiumFeatures.ts`:** Add or modify the implementations of your premium features.
    *   **`src/features/featureManager.ts`:** Update the `executeFeature` method to include your new features and to correctly call the free or premium implementation based on the `isPremiumEnabled` parameter. This is the central point where feature access is controlled.

5.  **Customize the Sidebar (Optional):**

    *   **`src/webview/sidebarProvider.ts`:** Modify the HTML in `_getHtmlForWebview` to change the appearance of the sidebar.  You can add more UI elements, change the styling, etc.  The provided HTML includes all the necessary elements for license management and feature execution.  The JavaScript within the HTML handles communication with the extension.

6.  **Build and Run:**

    *   Compile the extension: `npm run compile`
    *   Open the project in VS Code.
    *   Press `F5` to run the extension in the Extension Development Host.

7.  **Testing:**

    *   Use a valid Lemon Squeezy license key to test activation.
    *   Use an invalid license key to test error handling.
    *   Disconnect from the internet to test the offline grace period.
    *   Deactivate the license to test deactivation.
    *   Wait for the license to expire (or use a test license that is already expired) to verify expiration handling.
    *   Test all your features to ensure they are correctly gated based on license status.

8.  **Publishing:**

    *   Once you are satisfied with your extension, follow the VS Code documentation to package and publish it to the Marketplace.

## Important Considerations

*   **Security:**  The license key is stored in VS Code's global state, which is not encrypted. For enhanced security, consider using a more secure storage mechanism. However, for most use cases, the global state is sufficient, as Lemon Squeezy licenses can be deactivated and regenerated.
*   **API Rate Limits:** Be aware of Lemon Squeezy's API rate limits and implement appropriate error handling and retry mechanisms if needed. This blueprint uses basic error handling, but you might want to add more sophisticated logic.
*   **Lemon Squeezy Webhooks:** For real-time license updates (e.g., if a user cancels their subscription), you should implement a webhook handler on your server and use the VS Code extension API to communicate those changes to the extension. This blueprint does *not* include webhook handling.
* **Store and Product ID Verification:** the extension checks that the store and product ids obtained from the Lemon Squeezy API match those in your configuration.

## Code Explanation

### `src/config.ts`

This file contains all the configurable settings for the extension:

*   **`STORE_ID` & `PRODUCT_ID`**:  Your Lemon Squeezy store and product IDs.
*   **`API_ENDPOINTS`**: The URLs for the Lemon Squeezy API endpoints.
*   **`TIMING`**:  Settings for online checks and offline duration.
*   **`FEATURES`**: Lists of free and premium feature command IDs.
*   **`UI`**: Customizable user-facing messages.
*   **`STORAGE_KEYS`**: Keys used to store license information in VS Code's global state.
*   **`LicenseInfo`**: Interface definition.
*   **`DEFAULT_CONFIG`**: Default values for the extension configuration.

### `src/extension.ts`

This is the main entry point for the extension. It initializes the `LicenseService` and `SidebarProvider`, registers the sidebar view, and registers the `showToolbar` command.

### `src/features/featureManager.ts`

This class manages the execution of features. The `executeFeature` method checks if a feature is premium and if the license is enabled before calling the appropriate feature implementation (from `freeFeatures.ts` or `premiumFeatures.ts`).

### `src/features/freeFeatures.ts` and `src/features/premiumFeatures.ts`

These files contain the implementations of the example features. You should replace these with your own feature implementations.

### `src/services/apiService.ts`

This class handles communication with the Lemon Squeezy API using the `axios` library. It provides methods for activating, validating, and deactivating licenses.  It also includes error handling for 400, 404 and other errors.

### `src/services/licenseService.ts`

This class manages the overall license state. It handles:

*   **Activation:** Calling `ApiService.activateLicense` and storing the license information.
*   **Validation:** Periodically calling `ApiService.validateLicense` to check the license status.
*   **Deactivation:** Calling `ApiService.deactivateLicense` and clearing the stored license information.
*   **Offline Handling:** Monitoring network connectivity and temporarily disabling premium features if offline for too long.
*   **Expiration Handling:** Detecting and handling expired licenses.
*   **Online Status Events:**  Notifying the `SidebarProvider` of changes to the online status and license information.
*   **Storage:**  Storing and retrieving license information from VS Code's global state.

### `src/types/index.ts`

Defines the interfaces used throughout the extension, like `LicenseResponse`, `WebviewMessage`, and `FeatureResult`.

### `src/types/extensionConfig.ts`

Defines interface of the config.

### `src/utils/networkMonitor.ts`

This class uses `ApiService.ping` to periodically check network connectivity and emits events (`statusChange`, `offlineLimitExceeded`) to notify the `LicenseService`.

### `src/utils/validators.ts`

This file provides utility functions for validating the license key format and checking if the offline duration limit has been exceeded.

### `src/webview/sidebarProvider.ts`

This class provides the content and logic for the sidebar webview.  It handles:

*   **Rendering the HTML:** The `_getHtmlForWebview` method generates the HTML for the sidebar.
*   **Receiving Messages:** The `onDidReceiveMessage` handler processes messages from the webview (e.g., activate license, deactivate license, execute feature).
*   **Sending Messages:** The `postMessage` method sends messages to the webview (e.g., license status updates, feature results, errors).
*   **Initial Status Update:** Sends an initial status message to the webview when it loads.
*   **License Key Validation:** Performs client-side validation of the license key format *before* sending it to the server.
* **Display error messages**

## License

This project is licensed under the MIT License - see the `package.json` file for details.
```

Key improvements and explanations in this README:

*   **Clear and Concise Overview:**  The introduction clearly states the purpose of the blueprint and its key features.
*   **Developer Focus:** The "Getting Started" section is specifically tailored for developers who want to use this blueprint to build their own extensions.  It walks them through the necessary steps and provides clear instructions.
*   **Configuration Details:**  The `src/config.ts` section explains each configuration option and highlights which parts need to be changed.
*   **Feature Implementation Guidance:**  The instructions clearly explain how to add and modify features, emphasizing the role of `featureManager.ts`.
*   **Sidebar Customization:**  The README explains how to modify the sidebar's appearance and functionality.
*   **Build and Run Instructions:**  Provides clear steps for building and running the extension.
*   **Comprehensive Testing Guide:**  Includes a detailed list of scenarios to test, ensuring thorough validation of the licensing logic.
*   **Publishing Guidance:**  Briefly mentions the steps for publishing the extension to the Marketplace.
*   **Important Considerations:**  Highlights key security, API rate limits, and webhook considerations.  This section is crucial for developers to understand the limitations and potential improvements.
*   **Code Explanation:**  Provides a detailed explanation of each file's purpose and functionality. This makes it easier for developers to understand the codebase and make modifications.
*   **File Structure:** The file structure diagram is well-formatted and easy to read.
*   **Key Features List:**  Highlights the most important features of the blueprint.
*   **Error Handling:**  Emphasizes the robust error handling capabilities.
* **Status 404 and 400 Handling:** Clearly indicates that the extension handles 404 and 400 errors from the API, providing a better user experience.
*   **TypeScript:**  Highlights the use of TypeScript.
*   **License:** Mentions the MIT license.

This improved README provides a complete and user-friendly guide for developers who want to use this Lemon Squeezy blueprint.  It covers all the necessary aspects, from initial setup to publishing, and provides clear explanations of the code and its functionality. It addresses all the previous feedback and offers a significantly more comprehensive and helpful resource.
