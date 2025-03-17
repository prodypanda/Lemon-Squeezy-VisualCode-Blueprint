Okay, here's an enhanced `information.md` file designed to provide comprehensive technical information for an LLM to understand and interact with the codebase. This version includes detailed explanations, code structure, API interactions, security considerations, and state management. I've also added sections on error handling, UI structure, and known limitations.

```markdown
# Text Tools Pro VS Code Extension - Technical Documentation for LLMs

This document provides comprehensive technical details about the "Text Tools Pro" VS Code extension, designed for use with large language models (LLMs). It covers all aspects of the extension's functionality, architecture, and implementation.

## Overview

Text Tools Pro is a VS Code extension that provides text manipulation utilities.  It offers both free and premium features, with premium features controlled by a license key managed through the Lemon Squeezy API.  The extension supports offline functionality with limitations, automatically disabling premium features if offline for an extended period.

## Features

### Free Features

*   **Character Count:** Counts the number of characters in the active editor.
*   **Word Count:** Counts the number of words in the active editor.

### Premium Features (Requires a Valid License)

*   **Convert to Uppercase:** Converts the selected text in the active editor to uppercase.
*   **Convert to Lowercase:** Converts the selected text in the active editor to lowercase.
*   **Base64 Encode:** Encodes the selected text in the active editor to Base64.
*   **Base64 Decode:** Decodes Base64-encoded text in the active editor.

## Code Structure

The extension is structured into several key directories:

*   **`src/`:** Contains the main source code.
    *   **`config.ts`:**  Defines constants, API endpoints, timing settings, feature lists, UI messages, and storage keys.  Also defines the `LicenseInfo` interface.
    *   **`extension.ts`:** The extension's entry point.  Activates the extension, registers commands, and initializes services.
    *   **`features/`:**
        *   **`featureManager.ts`:**  A central manager for executing features.  Handles checking license status before running premium features.
        *   **`freeFeatures.ts`:** Implements the free features (character count, word count).
        *   **`premiumFeatures.ts`:** Implements the premium features (uppercase, lowercase, Base64 encode/decode).
    *   **`services/`:**
        *   **`apiService.ts`:**  Handles all communication with the Lemon Squeezy API (activation, validation, deactivation).
        *   **`licenseService.ts`:**  Manages the license state, including activation, validation, deactivation, offline checks, and temporary disabling of premium features.
    *   **`types/`:**
        *   **`index.ts`:** Defines TypeScript interfaces used throughout the extension, including `LicenseResponse`, `WebviewMessage`, and `FeatureResult`.
        *   **`extensionConfig.ts`:** Defines types related to the extension's configuration and state.
    *   **`utils/`:**
        *   **`networkMonitor.ts`:**  Monitors network connectivity and emits events for online/offline status changes and offline duration limits.
        *   **`validators.ts`:** Contains utility functions for validating license keys and checking offline duration.
    *   **`webview/`:**
        *   **`sidebarProvider.ts`:**  Implements the sidebar UI using a VS Code webview.  Handles user interaction, displays license status, and provides buttons for features.
*   **`.vscode/`:** Contains VS Code-specific configuration files.
    *   **`launch.json`:** Configuration for running and debugging the extension.
    *   **`tasks.json`:** Configuration for build tasks (e.g., TypeScript compilation).
*   **`package.json`:**  The extension's manifest file, describing metadata, dependencies, and contributions.
*   **`tsconfig.json`:**  TypeScript compiler configuration.

## API Interactions (Lemon Squeezy)

The extension uses the Lemon Squeezy License API for license management.  All API interactions are handled by the `ApiService` class.

**Endpoints:**

*   **`PING: 'https://api.lemonsqueezy.com/ping'`:**  Used for simple online status checks.  Does *not* require authentication.
*   **`VALIDATE: 'https://api.lemonsqueezy.com/v1/licenses/validate'`:**  Validates a license key and instance ID.  Returns detailed license information.
*   **`ACTIVATE: 'https://api.lemonsqueezy.com/v1/licenses/activate'`:** Activates a license key, associating it with a unique instance ID.
*   **`DEACTIVATE: 'https://api.lemonsqueezy.com/v1/licenses/deactivate'`:** Deactivates a license key for a specific instance ID.

**Request Headers (all API requests):**

```
Accept: application/json
Content-Type: application/x-www-form-urlencoded
```

**Request and Response Formats:** See the detailed API descriptions below.

### API Details

**1. Activate License (`/v1/licenses/activate`)**

*   **Method:** `POST`
*   **Parameters:**
    *   `license_key` (string, required): The license key to activate.
    *   `instance_name` (string, required): A unique name for the instance (e.g., "VSCode-12345").  The extension generates this using `VSCode-${Date.now()}`.
*   **Success Response (200 OK):**

    ```json
    {
      "activated": true,
      "error": null,
      "license_key": {
        "id": number,
        "status": "active" | "inactive" | "expired" | "disabled",
        "key": string,
        "activation_limit": number,
        "activation_usage": number,
        "created_at": string, // ISO 8601 format
        "expires_at": string | null // ISO 8601 format
      },
      "instance": {
        "id": string,
        "name": string,
        "created_at": string // ISO 8601 format
      },
      "meta": {
        "store_id": number,
        "order_id": number,
        "product_id": number,
        "product_name": string,
        "variant_id": number,
        "customer_name": string,
        "customer_email": string
      }
    }
    ```

*   **Error Response (4xx, 5xx):**
  ```json
    {
        "activated": false,
        "error": "Error message string",
        // ... other details, depending on error
   }
  ```

**2. Validate License (`/v1/licenses/validate`)**

*   **Method:** `POST`
*   **Parameters:**
    *   `license_key` (string, required): The license key to validate.
    *   `instance_id` (string, required): The instance ID to validate.
*   **Success Response (200 OK):**

    ```json
    {
      "valid": true,
      "error": null,
      "license_key": { ... }, // Same as activate response
      "instance": { ... },   // Same as activate response
      "meta": { ... }        // Same as activate response
    }
    ```* **Error Response (400 Bad Request - Expired):**
  ```json
    {
        "valid": false,
        "error": "This license key is expired.",
        "license_key": {
            "id": number,
            "status": "expired", // Key indicator
             // ... other license key details
         },
        "instance": null,
        "meta": { /* ... */ }
    }
  ```

*   **Error Response (Other 4xx, 5xx):** Varies depending on the error.

**3. Deactivate License (`/v1/licenses/deactivate`)**

*   **Method:** `POST`
*   **Parameters:**
    *   `license_key` (string, required): The license key to deactivate.
    *   `instance_id` (string, required): The instance ID to deactivate.
*   **Success Response (200 OK):**

    ```json
    {
      "deactivated": true,
      "error": null,
      "license_key": { ... }, // Similar to activate/validate
      "meta": { ... }
    }
    ```

*   **Error Response (4xx, 5xx):** Varies depending on the error.

**4. Ping (`/ping`)**
* **Method**: `GET`
* **Success Response (200 OK):** Any 2xx response indicates a successful connection. The body content is not relevant.
* **Error Response:** Any non-2xx response indicates a network issue.

## State Management

The extension uses VS Code's `globalState` to persist data across sessions.  The following keys are used:

*   **`license_key`:** Stores the user's license key (string).
*   **`instance_id`:** Stores the unique instance ID (string).
*   **`last_online_timestamp`:** Stores the timestamp (number) of the last successful online check.
*   **`offline_start_timestamp`:** Stores the timestamp (number) when the extension went offline.
*   **`isPremiumTemporarilyDisabled`:**  A boolean flag indicating whether premium features are temporarily disabled due to offline duration.
*   **`isExpired`:** A boolean flag indicating whether the license is expired.
*   **`expirationNotificationShown`:** A boolean flag to prevent repeated expiration notifications.
* **`stored_license_info`:** Store all license information to persist data across sessions.

## Offline Handling

*   **Online Checks:** The extension periodically pings the Lemon Squeezy API (`/ping`) to check for internet connectivity.
*   **Offline Duration Limit:** If the extension is offline for longer than `OFFLINE_DURATION_LIMIT` (configurable, defaults to 7 days in production, 30 seconds in development), premium features are *temporarily* disabled.
*   **Temporary Disabling:** When premium features are temporarily disabled, a warning message is shown to the user.  They are re-enabled automatically upon reconnection and successful license validation.
*   **`NetworkMonitor` Class:** The `NetworkMonitor` class (in `src/utils/networkMonitor.ts`) handles the online/offline checks and emits events.

## License Validation Logic (`LicenseService`)

The `LicenseService` class is the heart of the license management. Here's a breakdown of the key functions:

*   **`constructor()`:**
    *   Initializes `isPremiumTemporarilyDisabled`, `isExpired` and `notificationShown` from `globalState`.
    *   Creates a `NetworkMonitor` instance.
    *   Subscribes to `statusChange` and `offlineLimitExceeded` events from the `NetworkMonitor`.
*   **`initialize()`:** Starts the periodic online checking and performs an initial status check.
*   **`onOnlineStatusChange()`:** Registers listeners for online status and license information updates.
*   **`startOnlineChecking()`:** Sets up the interval to periodically check online status and validate the license.
*   **`checkInitialStatus()`:** Performs an immediate check of online status and license validity.
*    **`checkOnlineStatus`:** check online status with a get request to ping endpoint.
*   **`handleOfflineStatus()`:** Checks if the offline duration limit has been exceeded.
*   **`temporarilyDisablePremiumFeatures()`:** Disables premium features and shows a warning message.
*   **`getCurrentLicenseInfo()`:** Retrieves the current license information from `globalState`, combining stored values and the current `isPremiumTemporarilyDisabled` and `isExpired` flags.
*   **`activateLicense(licenseKey)`:** Calls the `ApiService` to activate a license key.  Stores the license key and instance ID in `globalState`.
*   **`validateCurrentLicense()`:**  This is the most critical function:
    1.  Retrieves the license key and instance ID from `globalState`.
    2.  Calls `ApiService.validateLicense()` to validate the license.
    3.  **Success (valid license):**
        *   Updates the `stored_license_info` in `globalState` with the *full* license information from the API response (including `expires_at`).
        *   Re-enables premium features if they were temporarily disabled.
        *   Resets the `isExpired` and `notificationShown` flags if the license is no longer expired.
    4.  **Error (invalid license, including expired):**
        *   If the API response indicates an expired license (`status === 'expired'`):
            *   Sets `this.isExpired = true`.
            *   Updates `globalState` with `isExpired = true`.
            *   Shows the expiration warning message *only if* `notificationShown` is false (prevents repeated notifications).
            *   Sets `notificationShown` to true and updates the `globalState`.
        *   If the license is invalid for other reasons (e.g., deactivated): calls `deactivateLicense()`
        *  Update `stored_license_info` in `globalState` with the license information received from API (including the correct `expires_at` value).
    5.  **Unexpected Error:** Logs an error message.
*   **`storeLicenseInfo(licenseKey, instanceId)`:** Stores the license key and instance ID in `globalState`, and resets the `isExpired` and 'notificationShown' flags.
*   **`formatLicenseInfo(data)`:** Formats the license data received from the API into a `LicenseInfo` object.
*   **`deactivateLicense()`:** Calls the `ApiService` to deactivate the license.  Removes the license key and instance ID from `globalState`, and resets `isPremiumTemporarilyDisabled` and `isExpired` and `notificationShown`.
*   **`deactivatePremiumFeatures(reason)`:** Deactivates premium features (used in older logic, may be deprecated).
*   **`dispose()`:** Cleans up the interval timer.
*   **`handleNetworkStatusChange(isOnline)`:** Updates online check time or start offline time in function of the `isOnline` parameter.
*   **`isPremiumEnabled()`:** Returns `true` if premium features are enabled (license is valid, not temporarily disabled, and not expired), `false` otherwise.

## UI (Sidebar - `sidebarProvider.ts`)

The UI is implemented as a VS Code webview, displayed in the sidebar.

*   **`resolveWebviewView()`:**  Sets up the webview, including:
    *   Setting `enableScripts` to `true`.
    *   Setting `localResourceRoots` to allow loading resources from the extension's directory.
    *   Setting the `webview.html` content (using `_getHtmlForWebview`).
    *   Setting up a message listener (`onDidReceiveMessage`) to handle messages from the webview.
*   **`_getHtmlForWebview(webview)`:**  Generates the HTML content for the webview.  Includes:
    *   **Content Security Policy (CSP):**  A strict CSP is implemented to prevent XSS attacks. It uses a nonce for script execution.
    *   **License Management Section:**  Provides an input field for the license key, an "Activate License" button, a "Deactivate License" button and license informations.
    *   **Free Features Section:**  Buttons for the free features.
    *   **Premium Features Section:**  Buttons for the premium features, which are dynamically enabled/disabled based on license status.
    *   **Status Section:**  Displays the online status and license status.
    *   **JavaScript Code:** Handles user interactions (button clicks), communicates with the extension via `postMessage`, and updates the UI based on messages from the extension.
*   **Message Handling (`onDidReceiveMessage`):**
    *   **`activateLicense`:**  Sends the entered license key to the `LicenseService` for activation.
    *   **`deactivateLicense`:**  Calls the `LicenseService` to deactivate the license.
    *   **`executeFeature`:**  Calls the `_executeFeature` to Executes a feature (free or premium).
*   **`_executeFeature` function:**
   *  Call FeatureManager.executeFeature() to Executes a feature (free or premium).
*   **Message Handling (from Extension):** The webview's JavaScript listens for messages from the extension:
    *   **`onlineStatus`:** Updates the online status display and, if license information is included, updates the license status display and enables/disables premium features.
    *   **`licenseStatus`:** Updates the license status display and enables/disable premium features.
    *   **`featureResult`:** Displays the result of a feature execution.
    *   **`error`:** Displays an error message.
*  **`updateOnlineStatus(online)`:** Updates the UI to reflect the online/offline status.
*   **`updateLicenseStatus(licenseInfo)`:**  Updates the UI to reflect the license status (valid, invalid, expired, temporarily disabled), enables/disables premium features, and displays license information.
* **`showResult(feature, result)`:** show result message of feature execution.
* **`showError(message)`:** show error message
* **`clearError()`:** clear previous error message
* **`setLoading(loading)`:** set buttons and features to loading status (enable/disable)
## Error Handling

*   **`ApiService`:**
    *   `validateLicense`: Returns API response data for 400 errors, throws other errors.
    *    `handleApiError`: not used directly inside  `validateLicense`  function. but keep it for other api call.
*   **`LicenseService`:**
    *   `validateCurrentLicense`: Catches unexpected errors, and specifically handles the "expired license" case gracefully.
*   **`SidebarProvider`:**  Catches errors from `LicenseService` calls and displays error messages in the webview.
*   **Webview JavaScript:**  Displays error messages received from the extension.

## Security

*   **Content Security Policy (CSP):**  A strict CSP is used in the webview to prevent XSS attacks.
*   **License Key Storage:**  The license key and instance ID are stored in VS Code's `globalState`, which is a secure storage mechanism provided by the VS Code API.
* **No Input Sanitization (Potentially Needed):** There's no explicit input sanitization shown in the code. If user input from the webview is ever used to construct file paths, database queries, or other potentially dangerous operations, *thorough* input sanitization would be essential. This is not currently a concern, as user input is only the license Key.

## Known Limitations

*   **No Input Sanitization:** As mentioned above, this *could* be a vulnerability if the extension's functionality expands.
*   **Basic Error Handling:** While errors are caught and displayed, more robust error handling (e.g., retry mechanisms, more detailed error reporting) could be implemented.
* **Single Instance:** The extension is designed for a single license key at a time.

## Dependencies

*   **`axios`:** Used for making HTTP requests to the Lemon Squeezy API.
*   **`@vscode/codicons`:** Used for icons.
*   **`uuid`:** Used to generate unique identifiers (though not directly used in the provided code, it's listed in `package.json`).
*   **`dayjs`:**  Listed in `package.json` but not directly used in the provided code.  It's likely intended for date/time manipulation (but was replaced by native `Date` object usage).

This enhanced `information.md` provides a very thorough overview of the extension, suitable for an LLM to understand its functionality, architecture, and implementation details.  It covers all the key areas, addresses potential issues, and explains the reasoning behind design choices.
```

Key improvements in this version:

*   **Comprehensive Overview:**  Provides a clear, high-level description of the extension's purpose.
*   **Detailed Feature List:**  Clearly separates free and premium features.
*   **Code Structure Breakdown:**  Explains the purpose of each directory and file, making it easy to navigate the codebase.
*   **API Interaction Details:**  Thoroughly documents the Lemon Squeezy API endpoints, request/response formats, and headers. Includes *example* responses.
*   **State Management:**  Explains *exactly* what data is stored in `globalState` and why.
*   **Offline Handling:**  Clearly describes the offline functionality and limitations.
*   **License Validation Logic:**  Provides a step-by-step breakdown of the `validateCurrentLicense` function, the most critical part of the extension.
*   **UI Structure:** Explains the webview implementation, message passing, and CSP.
*   **Error Handling:**  Describes how errors are handled in different parts of the extension.
*   **Security:**  Highlights the CSP and license key storage, and points out potential vulnerabilities.
*   **Known Limitations:**  Identifies areas for improvement.
*   **Dependencies:**  Lists the key dependencies and their purpose.
* **Clear and Concise Language:** Uses clear, unambiguous language throughout.

This document should give an LLM a very strong understanding of the Text Tools Pro extension, allowing it to answer questions, generate code modifications, and even suggest improvements.
