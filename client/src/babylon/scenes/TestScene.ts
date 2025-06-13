import * as BABYLON from '@babylonjs/core';
import '@babylonjs/inspector';
import { BaseScene } from './BaseScene';
import { useGeneralStore } from '@/stores/GeneralStore';
import { useServiceStore } from '@/stores/ServiceStore';
import { WORLD_BLOCK_LAYER, WorldMeshBuilder } from '../utils/WorldMeshBuilder';
import { IWorldBlock } from '@project-override/shared/core/WorldBlock';
import { BlockDefinition } from '../utils/BlockDefinition';

import DEV_TESTMAP from '@/data/dev_TestMap_Big.json';
import blockDefinitionsData from '@/data/DT_BlockDefinitions.json';
import { ICharacterSummary } from '@project-override/shared/core/CharacterSummary';
import { SpriteSheetCharacter, CharacterDirection } from '../prefabs/SpriteSheetCharacter';
import { Plant } from '../prefabs/Plant';
import { StaticProp } from '../prefabs/StaticProp';
import { PlayerController } from '../prefabs/PlayerController';
import { SPRITE_PLANE_LAYER } from '../prefabs/SpriteSheetPlane';

export class TestScene extends BaseScene {
    private worldBuilder: WorldMeshBuilder | undefined;
    private player: PlayerController | undefined;

    private physicsViewer: BABYLON.PhysicsViewer | undefined;
    private isPhysicsViewerVisible: boolean = false;

    private shadowGenerator: BABYLON.ShadowGenerator | undefined;
    private spriteShadowGenerator: BABYLON.ShadowGenerator | undefined;

    private fileInput: HTMLInputElement | undefined;

    private availableBlockTypes: BlockDefinition[] = [];

    private volumetricFog?: BABYLON.GPUParticleSystem | BABYLON.ParticleSystem;

    constructor(engine: BABYLON.Engine) {
        super(engine);
        this.clearColor = new BABYLON.Color4(0.2, 0.18, 0.22, 1);
        this.availableBlockTypes = blockDefinitionsData as BlockDefinition[];
    }

    private setupFileInput(): void {
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.accept = '.json';
        this.fileInput.style.display = 'none'; // Keep it hidden
        this.fileInput.onchange = this.handleFileSelected;
        document.body.appendChild(this.fileInput); // Add to body to function
    }

    private triggerImport(): void {
        this.fileInput?.click(); // Programmatically click the hidden file input
    }

    private handleFileSelected = async (event: Event): Promise<void> => {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            const file = input.files[0];
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const content = e.target?.result as string;
                    const importedWorldData = JSON.parse(content) as IWorldBlock[];

                    if (!Array.isArray(importedWorldData)) {
                        throw new Error("Imported JSON is not an array of IWorldBlock.");
                    }
                    // Basic validation for some objects in the array
                    if (importedWorldData.length > 0 && (!importedWorldData[0].position || typeof importedWorldData[0].type === 'undefined')) {
                        throw new Error("Imported data does not seem to match IWorldBlock structure.");
                    }

                    console.log(`Successfully parsed ${importedWorldData.length} blocks from ${file.name}.`);
                    useGeneralStore.getState().gameEngine?.uiDirector?.showToast(
                        `Importing ${file.name}...`, 3000, 'top-right'
                    );

                    if (this.worldBuilder) {
                        // Clear existing world (optional, or you could merge)
                        // For simplicity, let's clear and load new
                        this.worldBuilder.dispose(); // Dispose old chunks and caches
                        this.worldBuilder = new WorldMeshBuilder(this, this.availableBlockTypes); // Re-initialize

                        await this.worldBuilder.loadInitialWorld(importedWorldData);
                        console.log("New world imported and loaded.");
                        useGeneralStore.getState().gameEngine?.uiDirector?.showToast(
                            'World Imported!', 3000, 'top-right', 'success'
                        );

                        this.player!.character.dummyMesh?.physicsBody;
                    }
                } catch (error) {
                    console.error("Error importing or parsing JSON map:", error);
                    useGeneralStore.getState().gameEngine?.uiDirector?.showToast(
                        `Import Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 5000, 'top-right', 'error'
                    );
                } finally {
                    // Reset file input to allow importing the same file again if needed
                    if (this.fileInput) this.fileInput.value = '';
                }
            };

            reader.onerror = (e) => {
                console.error("Error reading file:", e);
                useGeneralStore.getState().gameEngine?.uiDirector?.showToast(
                    'Error reading file.', 3000, 'top-right', 'error'
                );
                if (this.fileInput) this.fileInput.value = '';
            }

            reader.readAsText(file);
        }
    }

    public async initialize(): Promise<void> {
        this.debugLayer.show({ embedMode: true });
        this.setupFileInput(); // Create the hidden file input

        try {
            console.log("Initializing TestScene...");

            // --- Environment Setup (Post-Processing, Lighting, Fog) ---
            this.setupAtmosphericFog();
            
            const shadowGenerator = this.setupLightingAndShadows();
            this.shadowsEnabled = true;

            // --- Physics Setup ---
            const preloadedPhysics = useGeneralStore.getState().gameEngine?.physics;
            if (preloadedPhysics) {
                const physicsPlugin = new BABYLON.HavokPlugin(true, preloadedPhysics);
                this.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), physicsPlugin);
            } else {
                console.error("Physics is not loaded.");
                return;
            }

            // --- Asset Service Setup ---
            useServiceStore.getState().assetService?.setScene(this);

            // --- Player Setup (Now beautifully simple) ---
            const playerInitialPosition = new BABYLON.Vector3(0, 5, 0);
            const testCharSummary: ICharacterSummary = { id: 'char1', userId: 'user1', name: 'Player', level: 1, lastPlayed: 0, isOnline: false, isDeleted: false, deletedAt: 0, appearance: { bodyIdx: 4711, eyesIdx: 0, beardIdx: 0, hairIdx: 0, hairFrontIdx: 0, hairBackIdx: 0 }, equipmentVisuals: [] };

            this.player = new PlayerController(this, {
                initialPosition: playerInitialPosition,
                characterSummary: testCharSummary
            });
            await this.player.initialize(testCharSummary);

            // Set the scene's active camera to the one created and managed by the player controller
            this.activeCamera = this.player.camera;
            this.setupPostProcessing(this.activeCamera); // Setup post-processing on the final active camera

            // --- World & Prop Setup ---
            this.worldBuilder = new WorldMeshBuilder(this, blockDefinitionsData as BlockDefinition[], shadowGenerator);
            const exampleInitialWorld: IWorldBlock[] = DEV_TESTMAP as IWorldBlock[];
            await this.worldBuilder.loadInitialWorld(exampleInitialWorld);

            const plant = new Plant('plant_test', this, new BABYLON.Vector3(6, 1, 6));
            await plant.applyTexture('/assets/textures/dev_grass.png');

            const chest = new StaticProp('chest_test', this, new BABYLON.Vector3(6, 1, 8));
            await chest.applyTexture('/assets/textures/dev_chest.png');
            chest.enablePhysics();

            const tree = new StaticProp('tree_test', this, new BABYLON.Vector3(-6, 2.2, 0), new BABYLON.Vector2(2.0, 4.0), new BABYLON.Vector3(0, 0.0, 0));
            await tree.applyTexture('/assets/textures/dev_tree.png');
            tree.enablePhysics();

            this.physicsViewer?.showBody(tree.mesh!.physicsBody!);

            // --- Apply Shadows to Scene Objects ---
            this.player.enableShadows(this.shadowGenerator!);
            chest.enableShadows(this.shadowGenerator!);

            // --- Final Setup & Observables ---
            this.onKeyboardObservable.add((kbInfo) => {
                if (kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN && kbInfo.event.key.toLowerCase() === 'p') {
                    this.togglePhysicsViewer();
                }
            });

            this.setupVolumetricFog();

            this.onReadyObservable.addOnce(() => {
                const uiDirector = useGeneralStore.getState().gameEngine?.uiDirector;
                const bgmService = useServiceStore.getState().bgmService;
                if (!uiDirector || !bgmService) return;

                bgmService.play({ name: "menu_theme", filePath: "/assets/audio/bgm/MainframeOfTheForgottenRealm.mp3", loop: true, volume: 0.1 }, 0);
                setTimeout(() => uiDirector.showToast('Dev Build #2483-2025-05-25 (Physics Debug)', 5000, 'bottom-left'), 1000);
                this.triggerImport();
            });
            console.log("Press 'P' to toggle physics debug shapes.");
            console.log('Test scene setup complete.');

        } catch (error) {
            console.error("Error during TestScene initialization:", error);
        }
    }

    private setupLightingAndShadows(): BABYLON.ShadowGenerator {
        // Remove the old basic light if it exists
        const oldLight = this.getLightByName('light');
        if (oldLight) oldLight.dispose();

        // Add a soft, ambient light to fill in shadows so they aren't pure black.
        const ambientLight = new BABYLON.HemisphericLight("ambientLight", new BABYLON.Vector3(0, 1, 0), this);
        ambientLight.intensity = 0.3;
        ambientLight.specular = BABYLON.Color3.Black(); // No shiny reflections

        // This is our main "sun" light, creating the strong shadows.
        const directionalLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(-0.5, -1, -0.7), this);
        directionalLight.position = new BABYLON.Vector3(20, 40, 20);
        directionalLight.intensity = 1.3;
        directionalLight.autoUpdateExtends = true;
        directionalLight.includeOnlyWithLayerMask = WORLD_BLOCK_LAYER | SPRITE_PLANE_LAYER;

        const spriteLight = new BABYLON.DirectionalLight("dirSpriteLight", directionalLight.direction, this);
        spriteLight.position = directionalLight.position;
        spriteLight.intensity = 0;
        spriteLight.includeOnlyWithLayerMask = WORLD_BLOCK_LAYER;

        // directionalLight.autoCalcShadowZBounds = false; // Turn OFF automatic calculation.
        // directionalLight.shadowMinZ = 1;   // Start casting shadows 1 unit away from the light's position.
        // directionalLight.shadowMaxZ = 1000; // Stop casting shadows 100 units away.

        this.spriteShadowGenerator = new BABYLON.ShadowGenerator(512, spriteLight); // Can be smaller
        this.spriteShadowGenerator.transparencyShadow = true;
        this.spriteShadowGenerator.usePoissonSampling = true;
        this.spriteShadowGenerator.darkness = 0.6; // Controls how dark shadows are

        // Create the shadow generator
        this.shadowGenerator = new BABYLON.ShadowGenerator(1024, directionalLight);
        this.shadowGenerator.usePoissonSampling = true;
        this.shadowGenerator.transparencyShadow = true; // Allow transparency
        this.shadowGenerator.darkness = 0.5; // Controls how dark shadows are

        this.shadowGenerator.bias = 0.00008;
        // this.shadowGenerator.normalBias = 0.5;

        return this.shadowGenerator;
    }

    private setupVolumetricFog(): void {
        var useGPUVersion = false;

        var fogTexture = new BABYLON.Texture("https://raw.githubusercontent.com/aWeirdo/Babylon.js/master/smoke_15.png", this);

        if (this.volumetricFog) {
            this.volumetricFog.dispose();
        }

        if (useGPUVersion && BABYLON.GPUParticleSystem.IsSupported) {
            this.volumetricFog = new BABYLON.GPUParticleSystem("particles", { capacity: 50000 }, this);
            this.volumetricFog.activeParticleCount = 15000;
            this.volumetricFog.manualEmitCount = this.volumetricFog.activeParticleCount;
            this.volumetricFog.minEmitBox = new BABYLON.Vector3(-50, 2, -50); // Starting all from
            this.volumetricFog.maxEmitBox = new BABYLON.Vector3(50, 2, 50); // To..

        } else {
            this.volumetricFog = new BABYLON.ParticleSystem("particles", 2500, this);
            this.volumetricFog.manualEmitCount = this.volumetricFog.getCapacity();
            this.volumetricFog.minEmitBox = new BABYLON.Vector3(-25, 2, -25); // Starting all from
            this.volumetricFog.maxEmitBox = new BABYLON.Vector3(25, 2, 25); // To...
        }


        this.volumetricFog.particleTexture = fogTexture.clone();
        this.volumetricFog.emitter = new BABYLON.Vector3(0, 0, 0);

        this.volumetricFog.color1 = new BABYLON.Color4(0.8, 0.8, 0.8, 0.1);
        this.volumetricFog.color2 = new BABYLON.Color4(.95, .95, .95, 0.15);
        this.volumetricFog.colorDead = new BABYLON.Color4(0.9, 0.9, 0.9, 0.1);
        this.volumetricFog.minSize = 3.5;
        this.volumetricFog.maxSize = 5.0;
        this.volumetricFog.minLifeTime = Number.MAX_SAFE_INTEGER;
        this.volumetricFog.emitRate = 50000;
        this.volumetricFog.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
        this.volumetricFog.renderingGroupId = 2;
        this.volumetricFog.gravity = new BABYLON.Vector3(0, 0, 0);
        this.volumetricFog.direction1 = new BABYLON.Vector3(0, 0, 0);
        this.volumetricFog.direction2 = new BABYLON.Vector3(0, 0, 0);
        this.volumetricFog.minAngularSpeed = -2;
        this.volumetricFog.maxAngularSpeed = 2;
        this.volumetricFog.minEmitPower = .5;
        this.volumetricFog.maxEmitPower = 1;
        this.volumetricFog.updateSpeed = 0.005;

        this.volumetricFog.start();
    }

    // --- NEW: Post-Processing Pipeline ---
    private setupPostProcessing(camera: BABYLON.Camera): void {
        const pipeline = new BABYLON.DefaultRenderingPipeline(
            "defaultPipeline", // The name of the pipeline
            false,
            this, // The scene
            [camera] // The list of cameras to attach to
        );
        pipeline.samples = 4; // MSAA for smoother edges

        // --- Depth of Field (Crucial for the HD-2D "diorama" look) ---
        pipeline.depthOfFieldEnabled = true;
        pipeline.depthOfField.focusDistance = 10000; // Set to the camera's radius in mm
        pipeline.depthOfField.focalLength = 70;      // Higher value = more blur
        pipeline.depthOfField.fStop = 1.4;           // Lower value = more blur

        // --- Bloom (Makes bright areas glow softly) ---
        pipeline.bloomEnabled = true;
        pipeline.bloomThreshold = 0.5; // Controls what brightness triggers bloom
        pipeline.bloomWeight = 0.6;    // The intensity of the bloom effect
        pipeline.bloomScale = 0.5;

        // --- Color Grading & Vignette ---
        pipeline.imageProcessing.contrast = 1.2;
        pipeline.imageProcessing.exposure = 0.9;
        // Add a vignette to darken the screen edges and focus the view
        pipeline.imageProcessing.vignetteEnabled = true;
        pipeline.imageProcessing.vignetteWeight = 1.5;
        pipeline.imageProcessing.vignetteColor = new BABYLON.Color4(0, 0, 0, 0); // Black, transparent center
        pipeline.imageProcessing.vignetteBlendMode = BABYLON.ImageProcessingConfiguration.VIGNETTEMODE_MULTIPLY;
    }

    // --- NEW: Atmospheric Fog ---
    private setupAtmosphericFog(): void {
        this.fogMode = BABYLON.Scene.FOGMODE_EXP2;
        this.fogColor = BABYLON.Color3.FromHexString(this.clearColor.toHexString());
        this.fogDensity = 0.025;
    }

    private togglePhysicsViewer(): void {
        // ... (No changes here)
        const physicsEngine = this.getPhysicsEngine();
        if (!physicsEngine) {
            console.warn("Cannot toggle PhysicsViewer: No physics engine.");
            return;
        }

        if (this.isPhysicsViewerVisible) {
            if (this.physicsViewer) {
                this.physicsViewer.dispose();
                this.physicsViewer = undefined;
            }
            this.isPhysicsViewerVisible = false;
        } else {
            this.physicsViewer = new BABYLON.PhysicsViewer(this);
            if (this.player?.mesh?.physicsBody) {
                this.physicsViewer.showBody(this.player.mesh.physicsBody);
            }
            this.worldBuilder?.chunkCollisionMeshes.forEach(mesh => {
                if (mesh.physicsBody) {
                    this.physicsViewer?.showBody(mesh.physicsBody);
                }
            });
            this.isPhysicsViewerVisible = true;
        }
    }

    public dispose(): void {
        super.dispose();
        this.player?.dispose();
        this.worldBuilder?.dispose();
        this.physicsViewer?.dispose();
        console.log("TestScene disposed.");
    }
}