import React, { useEffect, useRef } from 'react';
import { useServices } from '../../context';

/**
 * React component that renders the HTML canvas for the Babylon.js scene.
 * It initializes the sceneDirector with the canvas element.
 */
const BabylonCanvas: React.FC = () => {
    // Get the sceneDirector from the context
    const { sceneDirector, servicesInitialized } = useServices();
    // Ref to hold the canvas element
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        // Ensure services are initialized and canvas ref is available
        if (servicesInitialized && canvasRef.current) {
            console.log('Initializing sceneDirector with canvas...');
            // Initialize the sceneDirector with the canvas element
            sceneDirector.initialize(canvasRef.current);
        }

        // Cleanup function to dispose the scene when the component unmounts
        // or when servicesInitialized becomes false (e.g., on logout)
        return () => {
             if (sceneDirector) {
                 sceneDirector.dispose();
             }
        };
    }, [servicesInitialized, sceneDirector]); // Re-run effect if servicesInitialized or sceneDirector changes

    // Render the canvas element
    return (
        <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', display: servicesInitialized ? 'block' : 'none' }}
            // Add other canvas attributes as needed (e.g., id)
        />
    );
};

export default BabylonCanvas;