// client/src/styles/theme.ts
// Arwes theme configuration object defining ProjectOverride's specific look and feel.
// Start with a basic theme and customize later.

import { createRootTheme } from '@arwes/core';
import { sounds cyberpunk } from '@arwes/sounds'; // Example sound pack

// Define base color palettes (customize these significantly!)
const colors = {
    primary: { // Example: Sci-fi blue/cyan
        main: '#00f0f0',
        dark: '#00a0a0',
        light: '#80ffff',
    },
    secondary: { // Example: Accent orange/yellow
        main: '#ffa500',
        dark: '#cc8400',
        light: '#ffc966',
    },
    background: { // Dark background scheme
        main: '#05050a', // Very dark blue/black
        dark: '#000005',
        light: '#10101a',
    },
    text: { // Text colors
        main: '#e0e0e0',
        dark: '#a0a0a0',
        light: '#ffffff',
    },
    // Add specific colors: success, error, warning, info, disabled etc.
    success: { main: '#00ff80' },
    error: { main: '#ff4040' },
    warning: { main: '#ffff00' },
    info: { main: '#00aaff' },
    disabled: { main: '#808080' },
};


// Create the theme object using Arwes utilities
export const rootTheme = createRootTheme({
    palette: {
        // Assign colors to semantic slots used by Arwes components
        primary: colors.primary,
        secondary: colors.secondary,
        success: colors.success,
        error: colors.error,
        warning: colors.warning,
        info: colors.info,
        neutral: colors.text, // Neutral usually maps to text/control colors
        main: colors.background, // Main surface background
        bg: colors.background, // Component backgrounds
        text: colors.text, // Primary text
        // Define other palette properties if needed (contrastText etc.)
    },
    // typography: {
    //     // Define font families, sizes, weights if needed
    // },
    // Add shadows, breakpoints, etc.
    // shadows: { ... }
    // breakpoints: { ... }
});

// Example: Create a simple sound player setup (adjust paths if assets are local)
export const soundPlayers = {
    // Use pre-configured sound packs or define your own
    ...cyberpunk // Example: Use cyberpunk sounds
    // Add custom sounds:
    // myCustomClick: { src: ['/sounds/my-click.wav'], loop: false }
};

// --- TODO ---
// - Customize color palettes extensively to match ProjectOverride's aesthetic.
// - Configure typography (fonts).
// - Define custom sounds if needed and link asset paths correctly.
// - Explore other Arwes theme options (shadows, spacing, etc.).