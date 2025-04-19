// client/src/config/index.ts
// Exports client configuration values like the Colyseus server endpoint URL,
// API keys (if any), feature flags.

// Get Colyseus endpoint from environment variables during build/runtime
// Vite exposes env variables prefixed with VITE_
// See: https://vitejs.dev/guide/env-and-mode.html

const colyseusEndpoint = import.meta.env.VITE_COLYSEUS_ENDPOINT || 'ws://localhost:2567';

const config = {
    /** WebSocket endpoint for the Colyseus server. */
    colyseusEndpoint: colyseusEndpoint,

    /** Log level for client-side messages ('debug', 'info', 'warn', 'error') */
    logLevel: import.meta.env.VITE_LOG_LEVEL || 'info',

    /** Add other client-specific config */
    // Example: featureFlags: { newInventoryUI: import.meta.env.VITE_FEATURE_NEW_INVENTORY === 'true' }
};

// Use export default
export default config;

// Optional: Log the config being used (only in development)
if (import.meta.env.DEV) {
    console.log("[Client Config] Using configuration:", config);
}