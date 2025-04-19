// client/src/babylon/GameEngine.ts
import * as B from '@babylonjs/core';
import { SceneDirector } from './SceneDirector'; // Import the actual type now

export class GameEngine {
    public engine: B.Engine | null = null;
    public canvas: HTMLCanvasElement | null = null;

    // No SceneDirector reference needed here now
    // public sceneDirector: import('./SceneDirector').SceneDirector | null = null;

    private _isInitialized: boolean = false;
    private _resizeObserver: ResizeObserver | null = null; // Store observer to disconnect

    constructor() {
        console.log("[GameEngine] Instance created.");
    }

    /** Initializes the BabylonJS Engine and starts the render loop. */
    public initialize(canvas: HTMLCanvasElement, sceneDirector: SceneDirector): void { // Pass SceneDirector here
        if (this._isInitialized) {
            console.warn("[GameEngine] Already initialized.");
            return;
        }
        console.log("[GameEngine] Initializing Engine...");
        this.canvas = canvas;

        B.Logger.LogLevels = B.Logger.WarningLogLevel
        this.engine = new B.Engine(canvas, true, {
            preserveDrawingBuffer: true,
            stencil: true,
            alpha: true,
            audioEngine: true
        });

        this.engine.loadingScreen = new B.DefaultLoadingScreen(canvas, '');
        this.engine.loadingScreen.displayLoadingUI = () => {
            canvas.style.display = 'none';
        }; // no-op
        this.engine.loadingScreen.hideLoadingUI = () => {
            canvas.style.display = 'block';
        };

        if (!this.engine) {
            throw new Error("Failed to initialize Renderer");
        }

        // --- Engine Resize Handling ---
         this._resizeObserver = new ResizeObserver(() => {
            this.engine?.resize();
        });
        this._resizeObserver.observe(this.canvas);

        // --- Start Render Loop ---
        this.engine.runRenderLoop(() => {
            if (!this.engine) {
                console.error("[GameEngine] Engine is null during render loop.");
                return;
            }
            const activeScene = sceneDirector?.getActiveScene();
            // --- DEBUG LOG ---
            // console.log(`Render loop: Active scene is ${activeScene ? activeScene.getClassName() : 'null'}`);
            // --- END DEBUG ---
            if (activeScene) {
                activeScene.render();
            }
        });

        this._isInitialized = true;
        console.log("[GameEngine] Engine initialized and render loop started.");

        // Trigger initial scene setup ON the director AFTER engine is ready
        sceneDirector?.onEngineInitialized(this.engine); // Add this method to SceneDirector
    }

    public dispose(): void {
        if (!this._isInitialized || !this.engine) return;
        console.log("[GameEngine] Disposing Engine...");
        this.engine.stopRenderLoop();
        // Disconnect observer
        if (this._resizeObserver && this.canvas) {
            this._resizeObserver.unobserve(this.canvas);
            this._resizeObserver = null;
        }
        // SceneDirector should handle scene disposal before engine disposal
        this.engine.dispose();
        this.engine = null;
        this.canvas = null;
        this._isInitialized = false;
        console.log("[GameEngine] Engine disposed.");
    }

    public getEngine(): B.Engine | null {
        // This is still fine, but SceneDirector shouldn't rely on it in constructor
        return this.engine;
    }

    public isInitialized(): boolean {
         return this._isInitialized;
    }
}