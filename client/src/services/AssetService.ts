// client/src/services/AssetService.ts
// Manages loading and caching of BabylonJS assets (meshes, textures, sounds, sprites).
// Provides methods for requesting assets, potentially using BJS AssetManager.

import * as B from '@babylonjs/core'; // Use B alias for Babylon core

export class AssetService {
    private scene: B.Scene | null = null; // Scene context is needed for some loaders
    private assetsManager: B.AssetsManager | null = null;

    // Cache for loaded assets (simple example)
    private meshCache: Map<string, B.AbstractMesh[]> = new Map();
    private textureCache: Map<string, B.Texture> = new Map();
    private soundCache: Map<string, B.Sound> = new Map();

    constructor() {
        console.log("[AssetService] Initialized.");
    }

    // Add getter for the scene
    public getActiveScene(): B.Scene | null {
        return this.scene;
    }

    // Add check
    public isSceneReady(): boolean {
        return this.scene !== null;
    }

    /** Sets the active BabylonJS scene context needed for the AssetsManager. */
    public setScene(scene: B.Scene): void {
        if (this.scene !== scene) {
            console.log("[AssetService] Setting active scene context.");
            this.scene = scene;
            this.assetsManager = new B.AssetsManager(scene);

            this.assetsManager.onTaskErrorObservable.add((task) => {
                console.error(`[AssetService] Error loading asset task: ${task.name} - ${task.errorObject?.message}`, task.errorObject?.exception);
            });
            this.assetsManager.onTaskSuccessObservable.add((task) => {
                // console.log(`[AssetService] Successfully loaded asset task: ${task.name}`); // Can be noisy
            });
            this.assetsManager.onProgressObservable.add((event) => {
                // console.log(`[AssetService] Loading progress: ${event.remainingCount}/${event.totalCount} tasks remaining.`);
                // Update loading UI progress bar here
            });
        }
    }

    /**
     * Loads a mesh (e.g., glTF/glb file) asynchronously using the AssetsManager.
     * Returns the root mesh(es) on success. Caches results.
     * @param filePath - Path to the mesh file (e.g., "/assets/models/player.glb").
     * @param fileName - Optional explicit file name for the task.
     * @returns Promise resolving with the loaded meshes or null on failure.
     */
    public async loadMesh(filePath: string, fileName: string = ""): Promise<B.AbstractMesh[] | null> {
        if (!this.assetsManager || !this.scene) {
            console.error("[AssetService] Cannot load mesh, scene context not set.");
            return null;
        }
        if (this.meshCache.has(filePath)) {
            // console.log(`[AssetService] Returning cached mesh: ${filePath}`);
            // Need to clone meshes if they are reused multiple times in the scene
            return this.meshCache.get(filePath)!.map(mesh => mesh.clone(`${mesh.name}_clone`, null) as B.AbstractMesh);
        }

        return new Promise((resolve, reject) => {
            const task = this.assetsManager!.addMeshTask(`meshTask_${filePath}`, "", filePath, fileName);

            task.onSuccess = (task) => {
                console.log(`[AssetService] Mesh loaded: ${filePath}`);
                // Disable the loaded meshes initially, let EntityManager enable them
                task.loadedMeshes.forEach(mesh => mesh.setEnabled(false));
                // Cache the original loaded meshes (without cloning yet)
                this.meshCache.set(filePath, task.loadedMeshes);
                // Return clones for immediate use
                resolve(task.loadedMeshes.map(mesh => mesh.clone(`${mesh.name}_clone`, null) as B.AbstractMesh));
            };

            task.onError = (task, message, exception) => {
                console.error(`[AssetService] Failed to load mesh ${filePath}: ${message}`, exception);
                reject(null); // Indicate failure
            };

            // Start loading if not already running for other tasks
            // Often better to queue tasks and call load() once
            // this.assetsManager.load();
        });
    }

    /**
    * Loads a texture asynchronously using the AssetsManager.
    * Caches results.
    * @param filePath - Path to the texture file (e.g., "/assets/textures/grass.png").
    * @returns Promise resolving with the loaded texture or null on failure.
    */
    public async loadTexture(filePath: string, load = true): Promise<B.Texture | null> {
        if (!this.assetsManager || !this.scene) {
            console.error("[AssetService] Cannot load texture, scene context not set.");
            return null;
        }
        if (this.textureCache.has(filePath)) {
            // console.log(`[AssetService] Returning cached texture: ${filePath}`);
            return this.textureCache.get(filePath)!;
        }

        return new Promise((resolve, reject) => {
            const task = this.assetsManager!.addTextureTask(`textureTask_${filePath}`, filePath, false, true, B.Texture.NEAREST_SAMPLINGMODE);

            task.onSuccess = (task) => {
                console.log(`[AssetService] Texture loaded: ${filePath}`);
                this.textureCache.set(filePath, task.texture);
                resolve(task.texture);
            };
            task.onError = (task, message, exception) => {
                console.error(`[AssetService] Failed to load texture ${filePath}: ${message}`, exception);
                reject(null);
            };
            if(load) this.assetsManager?.loadAsync(); // Consider calling load() separately after queuing tasks
        });
    }

    public loadTextureFromCache(filePath: string): B.Texture | undefined {
        if (!this.assetsManager || !this.scene) {
            console.error("[AssetService] Cannot load texture, scene context not set.");
            return undefined;
        }
        if (this.textureCache.has(filePath)) {
            // console.log(`[AssetService] Returning cached texture: ${filePath}`);
            return this.textureCache.get(filePath)!;
        }
    }

    public async loadTextureFromComposition(composition: { cacheKey: string, canvas: HTMLCanvasElement}): Promise<B.Texture | null> {
        if (!this.assetsManager || !this.scene) {
            console.error("[AssetService] Cannot load texture, scene context not set.");
            return null;
        }
        if (this.textureCache.has(composition.cacheKey)) {
            // console.log(`[AssetService] Returning cached texture: ${filePath}`);
            return this.textureCache.get(composition.cacheKey)!;
        }

        return new Promise((resolve, reject) => {


            const texture = new B.DynamicTexture(
                composition.cacheKey,
                { width: composition.canvas.width, height: composition.canvas.height },
                this.scene,
                false,
                B.Texture.NEAREST_SAMPLINGMODE
            );

            // Draw canvas to dynamic texture
            texture.getContext().drawImage(composition.canvas, 0, 0);
            texture.update(); // <-- important!


            if(!texture) reject(null)

            this.textureCache.set(composition.cacheKey, texture);
            resolve(texture);
        });
    }


    /**
    * Loads a sound asynchronously using the AssetsManager or directly.
    * Caches results.
    * @param filePath - Path to the sound file (e.g., "/assets/sounds/hit.wav").
    * @param soundName - Unique name to identify the sound.
    * @returns Promise resolving with the loaded sound or null on failure.
    */
    public async loadSound(filePath: string, soundName: string): Promise<B.Sound | null> {
        if (!this.scene) { // Sound doesn't strictly need AssetsManager but uses Scene
            console.error("[AssetService] Cannot load sound, scene context not set.");
            return null;
        }
        if (this.soundCache.has(soundName)) {
            // console.log(`[AssetService] Returning cached sound: ${soundName}`);
            return this.soundCache.get(soundName)!;
        }

        return new Promise((resolve, reject) => {
            const sound = new B.Sound(soundName, filePath, this.scene!, () => {
                // Success callback
                console.log(`[AssetService] Sound loaded: ${soundName} (${filePath})`);
                this.soundCache.set(soundName, sound);
                resolve(sound);
            }, {
                // Options: loop, autoplay, volume, spatialSound, etc.
                autoplay: false,
                volume: 1,
            });

            // Handle potential loading errors if the Sound constructor supports it,
            // otherwise rely on browser console for 404s etc.
            // Note: BJS Sound constructor doesn't have a direct error callback like AssetsManager tasks.
        });
    }

    /** Starts the loading process for all queued tasks in the AssetsManager. */
    public startLoading(): Promise<void> {
        if (!this.assetsManager) {
            console.warn("[AssetService] Cannot start loading, AssetsManager not initialized.");
            return Promise.resolve();
        }
        console.log("[AssetService] Starting asset loading queue...");
        return this.assetsManager.loadAsync(); // Use loadAsync for Promise support
    }

    public startLoadingSync(): void {
        if (!this.assetsManager) {
            console.warn("[AssetService] Cannot start loading, AssetsManager not initialized.");
            return
        }
        console.log("[AssetService] Starting asset loading queue...");
        this.assetsManager.load();
    }


    /** Clears asset caches. Useful when changing scenes drastically. */
    public clearCache(): void {
        console.log("[AssetService] Clearing asset caches.");
        this.meshCache.clear();
        this.textureCache.clear();
        // Dispose sounds before clearing cache to release resources
        this.soundCache.forEach(sound => sound.dispose());
        this.soundCache.clear();
        // Reset AssetsManager if needed (might be better to create a new one per scene)
        // this.assetsManager?.reset();
    }
}