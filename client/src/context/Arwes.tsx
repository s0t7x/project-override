import React from 'react';

import { BleepsProvider } from "@arwes/react";
import { BleepsSettings } from "../config/Bleeps";

// import { ThemeProvider, StylesBaseline } from '@arwes/react';
// import { ThemeSettings } from '../config/Theme';

interface ArwesProviderProps {
    children: React.ReactNode;
}

export const ArwesProvider: React.FC<ArwesProviderProps> = ({ children }) => {
    return (
        <BleepsProvider {...BleepsSettings}>
            {/* <ThemeProvider {...ThemeSettings}> */}
                {/* <StylesBaseline /> */}
                {children}
            {/* </ThemeProvider> */}
        </BleepsProvider>
    );
};