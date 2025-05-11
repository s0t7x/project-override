// client/src/babylon/SceneDirector.ts
import * as B from '@babylonjs/core';
import { GameEngine } from './GameEngine'; // Correct import
import { NetworkService } from '../services/NetworkService';
import { AssetService } from '../services/AssetService';
import { createGameScene } from './scenes/createGameScene';
import { createMenuScene } from './scenes/createMenuScene';
import { useGameStore, ScreenState } from '../state/gameStore';
import { createEntryScene } from './scenes/createEntryScene';
import { WorldMapManager } from './managers/WorldMapManager';

export class SceneDirector {
    private gameEngineWrapper: GameEngine; // Store the wrapper instance
    private engine: B.Engine | null = null; // Store the actual B.Engine when initialized
    private networkService: NetworkService;
    private assetService: AssetService;
    private currentScene: B.Scene | null = null;
    private currentScreenState: ScreenState | null = null;
    private isEngineReady: boolean = false;

    constructor(gameEngineWrapper: GameEngine, networkService: NetworkService, assetService: AssetService) {
        console.log("[SceneDirector] Initializing...");
        // Store the wrapper, DO NOT try to access the internal engine yet
        this.gameEngineWrapper = gameEngineWrapper;
        this.networkService = networkService;
        this.assetService = assetService;

        // Remove the check here:
        // if (!gameEngineWrapper.getEngine()) { ... }

        // Subscribe to game state changes
        useGameStore.subscribe(
            (newState, prevState) => {
                // Only handle screen changes if the engine is ready
                if (this.isEngineReady) {
                    this.handleScreenChange(newState.currentScreen, false);
                } else {
                    console.log("[SceneDirector] Engine not ready, deferring screen change handling.");
                    // Store the target state? Or rely on onEngineInitialized to pick up latest state?
                    // Let's rely on onEngineInitialized picking up the latest state for now.
                }
            },
        );
        console.log("[SceneDirector] Subscribed to game state changes.");
        // DO NOT setup initial scene here yet
    }

    /** Called by GameEngine *after* the B.Engine is created and ready. */
    public onEngineInitialized(engine: B.Engine): void {
        console.log("[SceneDirector] Engine is now initialized.");
        this.engine = engine;
        this.isEngineReady = true;
        // Now setup the initial scene based on the *current* game state
        // const initialScreen = useGameStore.getState().currentScreen;
        // this.handleScreenChange(initialScreen, true); // Force initial setup
    }

    public getActiveScene(): B.Scene | null {
        return this.currentScene;
    }

    private disposeScene(): void {
        if(this.currentScene?.metadata?.mapRenderers) {
            Array.from(Object.values(this.currentScene.metadata.mapRenderers)).forEach((mr: any) => mr.dispose());
        }
        this.currentScene?.metadata?.characterPreview?.dispose(); // Dispose character preview

        if (this.currentScene && this.currentScreenState === 'game') this.disposeGameScene();
        else if (this.currentScene) this.disposeMenuScene();
    }

    private handleScreenChange(newScreen: ScreenState, force: boolean = false): void {
        if (!this.isEngineReady || !this.engine) {
            console.warn("[SceneDirector] handleScreenChange called before engine was ready.");
            return;
        }
        if (newScreen === this.currentScreenState && !force) return;
        console.log(`[SceneDirector] Handling screen change: ${this.currentScreenState} -> ${newScreen}`);

        switch (newScreen) {
            case 'entry':
                // Should not happen. If so: BLANK!
                this.disposeScene(); break;
            case 'game':
                this.disposeScene();
                this.setupGameScene(); break;
            default:
                console.log(`[SceneDirector] ScreenState does not want 3D Scene change: ${this.currentScreenState} -> ${newScreen}`);
                break;
        }
        this.currentScreenState = newScreen;
    }

    public async setupEntryScene(assetService?: AssetService) {
        if (!this.engine) return;
        console.log("[SceneDirector] Setting up Entry Scene...");
        this.currentScene = createEntryScene(this.engine, assetService);

        // --- Wait for scene to be ready before setting asset service context ---
        this.currentScene.onReadyObservable.addOnce(() => {
            console.log("[SceneDirector] Menu Scene is ready. Setting AssetService context.");
            this.assetService.setScene(this.currentScene!); // Use non-null assertion as we are inside the ready callback
            // Load assets AFTER setting the scene context
        });
        // Note: Don't call assetService.setScene immediately anymore.
        // this.assetService.setScene(this.currentScene); // <--- REMOVE IMMEDIATE CALL
        // console.log("[SceneDirector] Menu Scene setup initiated."); // Log initiation, not readiness
    }

    public async setupMenuScene() {
        if (!this.engine) return;
        console.log("[SceneDirector] Setting up Menu Scene...");
        this.currentScene = createMenuScene(this.engine);

        // --- Wait for scene to be ready before setting asset service context ---
        this.currentScene.onReadyObservable.addOnce(() => {
            console.log("[SceneDirector] Menu Scene is ready. Setting AssetService context.");
            this.assetService.setScene(this.currentScene!); // Use non-null assertion as we are inside the ready callback
            // Load assets AFTER setting the scene context
            // this.loadMenuAssets(); // Example call
        });
        // Note: Don't call assetService.setScene immediately anymore.
        // this.assetService.setScene(this.currentScene); // <--- REMOVE IMMEDIATE CALL
        // console.log("[SceneDirector] Menu Scene setup initiated."); // Log initiation, not readiness
    }

    // Inside setupGameScene:
    public async setupGameScene() {
        if (!this.engine) return;
        console.log("[SceneDirector] Setting up Game Scene...");
        // ... (check network connection etc.) ...
        this.currentScene = createGameScene(this.engine, this.assetService);

        // --- Wait for scene to be ready ---
        this.currentScene.onReadyObservable.addOnce(() => {
            console.log("[SceneDirector] Game Scene is ready. Setting AssetService context and initializing managers.");
            this.assetService.setScene(this.currentScene!); // Set context first

            // Now initialize managers that might need the AssetService with a scene context
            console.log("[SceneDirector] Initializing Game Scene Managers...");
            // this.cameraManager = new CameraManager(this.currentScene!);
            // this.inputManager = new InputManager(this.currentScene!, this.networkService);
            // this.worldManager = new WorldManager(this.currentScene!, this.assetService);
            // this.entityManager = new ClientEntityManager(this.currentScene!, this.assetService /*, this.cameraManager*/);

            // Start loading essential game assets now
            // this.loadGameAssets(); // Example call
        });
        // Note: Don't call assetService.setScene or initialize managers immediately anymore.
        // this.assetService.setScene(this.currentScene); // <--- REMOVE IMMEDIATE CALL
        // Initialize managers inside the onReadyObservable callback
        console.log("[SceneDirector] Game Scene setup initiated.");
    }

    private disposeMenuScene() {
        if (this.currentScene) {
            console.log("[SceneDirector] Disposing Menu Scene...");
            this.currentScene.dispose();
            this.currentScene = null;
        }
    }

    /** Disposes the game scene and its managers. */
    private disposeGameScene() {
        console.log("[SceneDirector] Disposing Game Scene and Managers...");
        // Dispose managers first to detach listeners etc.
        // this.inputManager?.dispose();
        // this.entityManager?.dispose();
        // this.worldManager?.dispose();
        // this.cameraManager?.dispose();

        // Dispose the scene itself
        this.currentScene?.dispose();

        // Clear references
        this.currentScene = null;
        // this.entityManager = null;
        // this.worldManager = null;
        // this.inputManager = null;
        // this.cameraManager = null;
        console.log("[SceneDirector] Game Scene Disposed.");
    }
}