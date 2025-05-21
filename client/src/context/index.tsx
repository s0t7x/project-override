import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { NetworkService } from '../services/NetworkService';
import { AuthService } from '../services/AuthService';
import { BabylonSceneDirector } from '../services/BabylonSceneDirector';
import { UiSceneDirector } from '../services/UiSceneDirector';

/**
 * Defines the structure of the services provided by the context.
 */
interface IContext {
    networkService: NetworkService;
    authService: AuthService;
    uiDirector: UiSceneDirector;
    sceneDirector: BabylonSceneDirector;
    servicesInitialized: boolean; // To indicate when services are ready
}

// Create the context with a default undefined value
const ServicesContext = createContext<IContext | undefined>(undefined);

/**
 * Custom hook to access the services from the context.
 * Throws an error if used outside of a ServiceProvider.
 */
export const useServices = (): IContext => {
    const context = useContext(ServicesContext);
    if (context === undefined) {
        throw new Error('useServices must be used within a ServiceProvider');
    }
    return context;
};

/**
 * Props for the ServiceProvider component.
 */
interface ServiceProviderProps {
    children: React.ReactNode;
}

/**
 * Provides instances of all core services to the application via React Context.
 * Ensures services are singletons and initialized once.
 */
export const ServiceProvider: React.FC<ServiceProviderProps> = ({ children }) => {
    // Use useRef to hold service instances across renders
    const networkServiceRef = useRef<NetworkService | null>(null);
    const authServiceRef = useRef<AuthService | null>(null);
    const uiDirectorRef = useRef<UiSceneDirector | null>(null);
    const sceneDirectorRef = useRef<BabylonSceneDirector | null>(null);

    const [servicesInitialized, setServicesInitialized] = useState(false);

    // Initialize services only once on mount
    useEffect(() => {
        console.log('Initializing services...');
        const network = new NetworkService();
        const auth = new AuthService(network);
        const uiDirector = new UiSceneDirector();
        const sceneDirector = new BabylonSceneDirector();

        // Store instances in refs
        networkServiceRef.current = network;
        authServiceRef.current = auth;
        uiDirectorRef.current = uiDirector;
        sceneDirectorRef.current = sceneDirector;

        // Connect network service (async)
        network.connect().then(() => {
            console.log('Network service connected.');
            // Services are now ready for use
            setServicesInitialized(true);
        }).catch((error: any) => {
            console.error('Failed to connect network service:', error);
            // Handle connection error (e.g., show an error message)
            // Depending on your app flow, you might prevent initialization or show a retry option
            setServicesInitialized(false); // Keep services uninitialized if connection fails
        });

        // Cleanup function to dispose services on unmount
        return () => {
            console.log('Disposing services...');
            // Dispose services that need cleanup (like Babylon engine)
            // Network service might need a disconnect method
            // network.disconnect(); // Implement if needed
        };
    }, []); // Empty dependency array ensures this runs only once on mount

    // Provide the service instances via context
    const services: IContext | undefined = servicesInitialized ? {
        networkService: networkServiceRef.current!,
        authService: authServiceRef.current!,
        uiDirector: uiDirectorRef.current!,
        sceneDirector: sceneDirectorRef.current!,
        servicesInitialized: true,
    } : undefined; // Provide undefined until services are initialized/connected

    // Render children only when services are initialized
    return (
        <ServicesContext.Provider value={services}>
            {servicesInitialized ? children : <div>Loading services...</div>}
            {/* You might want a more sophisticated loading/error state here */}
        </ServicesContext.Provider>
    );
};