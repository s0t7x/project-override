import * as BABYLON from '@babylonjs/core';
import '@babylonjs/inspector';
import { BaseScene } from './BaseScene';
import { useGeneralStore } from '@/stores/GeneralStore';
import { useServiceStore } from '@/stores/ServiceStore';
import { WorldMeshBuilder } from '../utils/WorldMeshBuilder';
import { IWorldBlock } from '@project-override/shared/core/WorldBlock';
import { BlockDefinition } from '../utils/BlockDefinition';

import DEV_TESTMAP from '@/data/dev_TestMap_Big.json';
import blockDefinitionsData from '@/data/DT_BlockDefinitions.json';
import { ICharacterSummary } from '@project-override/shared/core/CharacterSummary';
import { SpriteSheetCharacter, CharacterDirection } from '../prefabs/SpriteSheetCharacter';
import { Plant } from '../prefabs/Plant';
import { StaticProp } from '../prefabs/StaticProp';
import { PlayerController } from '../prefabs/PlayerController';

export class TestScene extends BaseScene {
    private worldBuilder: WorldMeshBuilder | undefined;
    private player: PlayerController | undefined;

    private physicsViewer: BABYLON.PhysicsViewer | undefined;
    private isPhysicsViewerVisible: boolean = false;


    constructor(engine: BABYLON.Engine) {
        super(engine);
        this.clearColor = new BABYLON.Color4(0.2, 0.18, 0.22, 1);
    }

    public async initialize(): Promise<void> {
        this.debugLayer.show({ embedMode: true });
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
            const playerInitialPosition = new BABYLON.Vector3(10, 5, 10);
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

            const plant = new Plant('plant_test', this, new BABYLON.Vector3(12, 1, 12));
            await plant.applyTexture('/assets/textures/dev_grass.png');

            const chest = new StaticProp('chest_test', this, new BABYLON.Vector3(12, 1, 18));
            await chest.applyTexture('/assets/textures/dev_chest.png');
            chest.enablePhysics();

            // --- Apply Shadows to Scene Objects ---
            this.player.enableShadows(shadowGenerator);
            chest.enableShadows(shadowGenerator);

            // --- Final Setup & Observables ---
            this.onKeyboardObservable.add((kbInfo) => {
                if (kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN && kbInfo.event.key.toLowerCase() === 'p') {
                    this.togglePhysicsViewer();
                }
            });

            this.onReadyObservable.addOnce(() => { 
                const uiDirector = useGeneralStore.getState().gameEngine?.uiDirector;
                const bgmService = useServiceStore.getState().bgmService;
                if (!uiDirector || !bgmService) return;

                bgmService.play({ name: "menu_theme", filePath: "/assets/audio/bgm/MainframeOfTheForgottenRealm.mp3", loop: true, volume: 0.1 }, 0);
                setTimeout(() => uiDirector.showToast('Dev Build #2483-2025-05-25 (Physics Debug)', 5000, 'bottom-left'), 1000);
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
        ambientLight.intensity = 0.2;
        ambientLight.specular = BABYLON.Color3.Black(); // No shiny reflections

        // This is our main "sun" light, creating the strong shadows.
        const directionalLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(-0.5, -1, -0.7), this);
        directionalLight.position = new BABYLON.Vector3(20, 40, 20);
        directionalLight.intensity = 1.2;

        directionalLight.autoUpdateExtends = true;

        // directionalLight.autoCalcShadowZBounds = false; // Turn OFF automatic calculation.
        // directionalLight.shadowMinZ = 1;   // Start casting shadows 1 unit away from the light's position.
        // directionalLight.shadowMaxZ = 1000; // Stop casting shadows 100 units away.


        // Create the shadow generator
        const shadowGenerator = new BABYLON.ShadowGenerator(2048, directionalLight);
        shadowGenerator.useExponentialShadowMap = true; // Smoother shadow edges
        shadowGenerator.darkness = 0.7; // Controls how dark shadows are
        shadowGenerator.transparencyShadow = true; // Allow transparency

        return shadowGenerator;
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