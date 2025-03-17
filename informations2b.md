# Technical Information: Lemon Squeezy Visual Code Extension

This document provides comprehensive technical details about the Visual Studio Code extension that integrates with Lemon Squeezy for license management. It covers the file structure, functionality, API interactions, security measures, and configuration options.

## Overview

This VS Code extension provides text manipulation tools, with some features available for free and others requiring a paid license managed through Lemon Squeezy. The extension supports both online and offline operation (with limitations for premium features).  It uses the Lemon Squeezy API for license activation, validation, and deactivation.

## File Structure

The extension's codebase is organized as follows:

lemonsqueezy-visualcode-blueprint/
├── .vscode
│ ├── launch.json # VS Code launch configuration
│ └── tasks.json # VS Code task configuration
├── package.json # Extension manifest
├── src
│ ├── config.ts # Configuration constants and interfaces
│ ├── extension.ts # Extension entry point (activation/deactivation)
│ ├── features
│ │ ├── featureManager.ts # Logic for executing features (free/premium)
│ │ ├── freeFeatures.ts # Free feature implementations
│ │ └── premiumFeatures.ts# Premium feature implementations
│ ├── services
│ │ ├── apiService.ts # Handles Lemon Squeezy API interactions
│ │ └── licenseService.ts # Manages license state and validation
│ ├── types
│ │ ├── extensionConfig.ts # Types for extension configuration
│ │ └── index.ts # General type definitions
│ ├── utils
│ │ ├── networkMonitor.ts # Monitors network connectivity
│ │ └── validators.ts # Validation functions (e.g., license key format)
│ └── webview
│ └── sidebarProvider.ts # Provides the webview UI for the sidebar
└── tsconfig.json # TypeScript compiler configuration


## Functionality

### Free Features

*   **Character Count:** Counts the number of characters in the active editor.
*   **Word Count:** Counts the number of words in the active editor.

### Premium Features (Requires Valid License)

*   **Convert to Uppercase:** Converts the selected text in the active editor to uppercase.
*   **Convert to Lowercase:** Converts the selected text in the active editor to lowercase.
*   **Base64 Encode:** Encodes the selected text in the active editor to Base64.
*   **Base64 Decode:** Decodes Base64-encoded text in the active editor.

### License Management

*   **Activation:** Users can activate a license key purchased from Lemon Squeezy. The extension generates a unique instance ID for each VS Code installation.
*   **Validation:** The extension periodically validates the license key with the Lemon Squeezy API.
*   **Deactivation:** Users can deactivate their license, removing it from the local storage and freeing up an activation slot.
*   **Offline Operation:** The extension allows limited offline use of premium features.  If the user is offline for an extended period (configurable, 7 days in production, 30 seconds in development), premium features are temporarily disabled until the next successful online validation.
*   **Expiration Handling:** If the license expires, premium features are disabled, and the user is informed to renew their license. The expiration date is displayed in the UI.

## API Interactions (Lemon Squeezy)

The extension uses the following Lemon Squeezy API endpoints:

*   **`POST /v1/licenses/activate`:** Activates a license key.
    *   **Headers:**
        ```
        Accept: application/json
        Content-Type: application/x-www-form-urlencoded
        ```
    *   **Parameters:**
        *   `license_key` (string, required): The license key to activate.
        *   `instance_name` (string, required): A unique name for the VS Code instance (e.g., `VSCode-1678886400000`).
    *   **Success Response (200 OK):**  Includes `activated: true` and details about the license and instance.  The `instance.id` is crucial and stored locally for subsequent validation and deactivation.
    *   **Error Response:** Includes an `error` field with a description.

*   **`POST /v1/licenses/validate`:** Validates a license key and its instance.
    *   **Headers:** (Same as activate)
    *   **Parameters:**
        *   `license_key` (string, required): The license key to validate.
        *   `instance_id` (string, required): The instance ID obtained during activation.
    *   **Success Response (200 OK):** Includes `valid: true` and details about the license and instance.
    *   **Error Response (400 Bad Request):**  Includes `valid: false` and an `error` field (e.g., "This license key is expired.").  The extension treats a 400 response with a "license expired" error differently from other errors, updating the UI but not throwing an exception. Other 4xx and 5xx errors *are* treated as exceptions.

*   **`POST /v1/licenses/deactivate`:** Deactivates a license key and instance.
    *   **Headers:** (Same as activate)
    *   **Parameters:**
        *   `license_key` (string, required): The license key to deactivate.
        *   `instance_id` (string, required): The instance ID to deactivate.
    *   **Success Response (200 OK):** Includes `deactivated: true`.
    *   **Error Response:** Includes an `error` field.

* **`GET https://api.lemonsqueezy.com/ping`**: Used as online ping to check internet connection.

The `ApiService` class encapsulates all interactions with the Lemon Squeezy API.  It uses the `axios` library for making HTTP requests. The `handleApiError` function within `ApiService` re-throws axios errors, except for 400 errors on the `/validate` endpoint.

## Core Classes and Components

*   **`LicenseService`:** This is the central class for managing license state. It handles:
    *   Activation, validation, and deactivation logic.
    *   Periodic online checks.
    *   Offline duration limits.
    *   Expiration handling.
    *   Storing and retrieving license information from VS Code's `globalState`.
    *   Notifying the `SidebarProvider` of license state changes.
    *  Preventing redundant expiration notifications.

*   **`SidebarProvider`:**  Manages the webview UI displayed in the VS Code sidebar.  It handles:
    *   Displaying the license management form (input field, activate/deactivate buttons).
    *   Showing license information (status, expiration date, etc.).
    *   Enabling/disabling premium feature buttons based on license status.
    *   Displaying error messages.
    *   Communicating with `LicenseService` via messages.

*   **`ApiService`:**  Handles all HTTP requests to the Lemon Squeezy API.

*   **`FeatureManager`:**  Determines whether a requested feature is free or premium and executes the appropriate feature logic.

*   **`NetworkMonitor`:**  Checks for internet connectivity at regular intervals.

*   **`FreeFeatures` / `PremiumFeatures`:**  Contain the implementations of the text manipulation features.

## Configuration (`src/config.ts`)

```typescript
export const CONFIG = {
    STORE_ID: 157343,
    PRODUCT_ID: 463516,

    API_ENDPOINTS: {
        PING: 'https://api.lemonsqueezy.com/ping',
        VALIDATE: 'https://api.lemonsqueezy.com/v1/licenses/validate',
        ACTIVATE: 'https://api.lemonsqueezy.com/v1/licenses/activate',
        DEACTIVATE: 'https://api.lemonsqueezy.com/v1/licenses/deactivate'
    },

    TIMING: {
        ONLINE_PING_INTERVAL: 5000,  // 5 seconds
        OFFLINE_DURATION_LIMIT: process.env.NODE_ENV === 'production'
            ? 7 * 24 * 60 * 60 * 1000  // 7 days in production
            : 30 * 1000                 // 30 seconds in development
    },

    FEATURES: {
        FREE: ['characterCount', 'wordCount'],
        PREMIUM: ['toUpperCase', 'toLowerCase', 'base64Encode', 'base64Decode']
    },

    UI: {
        MESSAGES: {
            OFFLINE_WARNING: 'Premium features are temporarily disabled while offline',
            LICENSE_REQUIRED: 'Premium license required for this feature',
            ACTIVATION_SUCCESS: 'License activated successfully',
            DEACTIVATION_SUCCESS: 'License deactivated successfully'
        }
    },

    STORAGE_KEYS: {
        LICENSE_KEY: 'license_key',
        INSTANCE_ID: 'instance_id',
        LAST_ONLINE: 'last_online_timestamp',
        OFFLINE_START: 'offline_start_timestamp'
    }
};

export interface LicenseInfo {
    valid: boolean;
    licenseKey: string;
    instanceId: string;
    instanceName?: string;
    status: 'active' | 'inactive' | 'expired' | 'disabled';
    expiresAt?: string | null;
    activationLimit?: number;
    activationUsage?: number;
    temporarilyDisabled?: boolean;
    expired?: boolean;
    createdAt?: string;
    productName?: string;
    customerName?: string;
    customerEmail?: string;
}

export const DEFAULT_CONFIG: ExtensionConfig = {
    offlineDurationLimit: process.env.NODE_ENV === 'production'
        ? 7 * 24 * 60 * 60 * 1000  // 7 days
        : 30 * 1000,               // 30 seconds
    isTemporarilyDisabled: false
};


STORE_ID / PRODUCT_ID: Your Lemon Squeezy store and product IDs.

API_ENDPOINTS: URLs for the Lemon Squeezy API.

TIMING:

ONLINE_PING_INTERVAL: How often to check for internet connectivity (in milliseconds).

OFFLINE_DURATION_LIMIT: How long premium features can be used offline before being temporarily disabled.

FEATURES: Lists of free and premium features.

UI.MESSAGES: User-facing messages.

STORAGE_KEYS: Keys used for storing data in VS Code's globalState.

LicenseInfo: Interface that define license informations.

DEFAULT_CONFIG: Default configuration for the extension.

Data Storage
The extension uses VS Code's globalState (persistent storage) to store:

license_key: The user's license key.

instance_id: The unique instance ID generated during activation.

last_online_timestamp: The timestamp of the last successful online check.

offline_start_timestamp: The timestamp when offline mode began.

isPremiumTemporarilyDisabled: A boolean flag indicating whether premium features are temporarily disabled due to offline duration.

expirationNotificationShown: A boolean flag indicating whether the expiration notification has already been shown to the user.

stored_license_info: Stores all informations about license.

Security
Content Security Policy (CSP): The webview uses a strict CSP to prevent cross-site scripting (XSS) attacks. Only scripts with a dynamically generated nonce are allowed to execute.

HTTPS: All API communication uses HTTPS to encrypt data in transit.

Error Handling: The extension handles API errors gracefully, displaying appropriate messages to the user and preventing unexpected behavior.

Re-throw Error: The handleApiError and validateLicense functions within ApiService re-throw errors for robust error propagation.

Extension Activation
The extension is activated onStartupFinished, meaning it activates after VS Code has fully loaded.

Testing
The provided code does not include explicit unit tests, but the debugging steps outlined in previous responses describe how to manually test various aspects of the extension's functionality.

Key Improvements and Considerations
Robust Error Handling: The use of try...catch blocks and re-throwing of errors in ApiService ensures that errors are handled appropriately.

Specific 400 Error Handling: The special handling of 400 errors from the /validate endpoint allows the extension to correctly process expired licenses.

UI Updates: The onlineStatusListeners ensure that the UI is updated whenever the license state changes.

Offline Support: The offline duration limit allows for limited offline use of premium features.

Expiration Handling: The isExpired flag and notification logic provide a clear user experience when a license expires.

CSP: The Content Security Policy enhances the security of the webview.

Persistent Storage: VS Code's globalState provides a reliable way to store license information.

This document provides a thorough technical overview of the Lemon Squeezy VS Code extension. It should be sufficient for understanding the codebase, debugging issues, and making further enhancements.