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

export class TestScene extends BaseScene {
    private worldBuilder: WorldMeshBuilder | undefined;
    private playerCharacter: SpriteSheetCharacter | undefined;
    private inputMap: { [key: string]: boolean } = {};
    private playerMoveSpeed = 2.0;

    private physicsViewer: BABYLON.PhysicsViewer | undefined;
    private isPhysicsViewerVisible: boolean = false;


    constructor(engine: BABYLON.Engine) {
        super(engine);
        // MODIFIED: Changed clear color to a warmer, desaturated tone for a more "earthy" feel
        this.clearColor = new BABYLON.Color4(0.2, 0.18, 0.22, 1);
        this.initialize();
    }

    private async initialize(): Promise<void> {
        this.debugLayer.show({ embedMode: true });
        try {
            console.log("Initializing TestScene...");
            const playerInitialPosition = new BABYLON.Vector3(10, 5, 10);
                        // --- MODIFIED: Camera Setup ---
            // Adjusted angle and radius for a more cinematic, "tilted" view like in the reference image.
            const camera = new BABYLON.ArcRotateCamera('arcCam', -Math.PI / 2.5, Math.PI / 4, 20, playerInitialPosition.clone(), this);
            camera.lowerRadiusLimit = 5;
            camera.upperRadiusLimit = 40;
            camera.lowerBetaLimit = Math.PI / 6;
            camera.upperBetaLimit = Math.PI / 2 - 0.1;
            camera.attachControl(true);
            this.activeCamera = camera;

            // --- Physics Setup (No changes) ---
            const preloadedPhysics = useGeneralStore.getState().gameEngine?.physics;
            if (preloadedPhysics) {
                const physicsPlugin = new BABYLON.HavokPlugin(true, preloadedPhysics);
                this.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), physicsPlugin);
            } else {
                console.error("Physics is not loaded. Physics will not work.");
                return;
            }

            // Asset service setup for prefabs
            useServiceStore.getState().assetService?.setScene(this);

            // --- Prefab & World Setup ---
            const plant = new Plant('plant_test', this, new BABYLON.Vector3(12, 1, 12));
            await plant.applyTexture('/assets/textures/dev_grass.png');

            const chest = new StaticProp('chest_test', this, new BABYLON.Vector3(12, 1, 18));
            await chest.applyTexture('/assets/textures/dev_chest.png');
            
            this.worldBuilder = new WorldMeshBuilder(this, blockDefinitionsData as BlockDefinition[]);
            const exampleInitialWorld: IWorldBlock[] = DEV_TESTMAP as IWorldBlock[];
            await this.worldBuilder.loadInitialWorld(exampleInitialWorld);

            // --- Player Character Setup (Added shadow casting) ---
            this.playerCharacter = new SpriteSheetCharacter('playerChar', this, playerInitialPosition);
            
            const testCharSummary: ICharacterSummary = { id: 'char1', userId: 'user1', name: 'Player', level: 1, lastPlayed: 0, isOnline: false, isDeleted: false, deletedAt: 0, appearance: { bodyIdx: 4711, eyesIdx: 0, beardIdx: 0, hairIdx: 0, hairFrontIdx: 0, hairBackIdx: 0 }, equipmentVisuals: [] };
            await this.playerCharacter.setCharacter(testCharSummary);
            this.playerCharacter.billboard = true;

            if (!this.playerCharacter.plane) {
                console.error("Player character plane not initialized!");
                return;
            }

            // Player Physics (No major changes, just ensure it's correct)
            this.playerCharacter.plane.physicsBody = new BABYLON.PhysicsBody(
                this.playerCharacter.plane, BABYLON.PhysicsMotionType.DYNAMIC, false, this
            );
            this.playerCharacter.plane.physicsBody.setMassProperties({
                mass: 2,
                inertia: new BABYLON.Vector3(1e7, 0.5, 1e7),
            });
            this.playerCharacter.plane.physicsBody.setAngularDamping(1000);
            const capsuleRadius = 0.4;
            const playerShape = new BABYLON.PhysicsShape({
                type: BABYLON.PhysicsShapeType.CAPSULE,
                parameters: { radius: capsuleRadius, pointA: new BABYLON.Vector3(0, -0.5, 0), pointB: new BABYLON.Vector3(0, 0.5, 0) },
            }, this);
            this.playerCharacter.plane.physicsBody.shape = playerShape;

            camera.lockedTarget = this.playerCharacter.plane;

            // --- NEW: Atmospheric & Post-Processing Setup ---
            // This is the core of the new look.
            const shadowGenerator = this.setupLightingAndShadows();
            this.shadowsEnabled = true;
            // this.setupPostProcessing(camera);
            // this.setupAtmosphericFog();

            const sp = BABYLON.MeshBuilder.CreateSphere('sp', { diameter: 2 });
            sp.position = playerInitialPosition.clone();

            shadowGenerator.addShadowCaster(sp);

            // const p = BABYLON.MeshBuilder.CreatePlane('p', { size: 50 });
            // p.rotate(BABYLON.Axis.X, Math.PI / 2, BABYLON.Space.LOCAL);
            // p.position = new BABYLON.Vector3(playerInitialPosition.x, 2, playerInitialPosition.z);
            // p.receiveShadows = true;
            
            // --- Apply Shadows ---
            // Make the player and props cast shadows
            this.playerCharacter.enableShadows(shadowGenerator);
            // shadowGenerator.addShadowCaster(this.playerCharacter.plane);
            if (chest.mesh) shadowGenerator.addShadowCaster(chest.mesh);

            this.worldBuilder.chunkCollisionMeshes.forEach(mesh => {
                shadowGenerator.addShadowCaster(mesh);
            });


            // --- Final Setup ---
            this.setupInputControls();
            this.onBeforeRenderObservable.add(this.updatePlayer);
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
            console.log('Test scene setup complete with HD-2D effects.');

        } catch (error) {
            console.error("Error during TestScene initialization:", error);
        }
    }

    // --- NEW: Lighting & Shadow Setup ---
    private setupLightingAndShadows(): BABYLON.ShadowGenerator {
        // Remove the old basic light if it exists
        const oldLight = this.getLightByName('light');
        if (oldLight) oldLight.dispose();

        // // Add a soft, ambient light to fill in shadows so they aren't pure black.
        // const ambientLight = new BABYLON.HemisphericLight("ambientLight", new BABYLON.Vector3(0, 1, 0), this);
        // ambientLight.intensity = 0.1;
        // ambientLight.specular = BABYLON.Color3.Black(); // No shiny reflections

        // This is our main "sun" light, creating the strong shadows.
        const directionalLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(-0.5, -1, -0.7), this);
        directionalLight.position = new BABYLON.Vector3(20, 40, 20);
        directionalLight.intensity = 1.4;

        directionalLight.autoCalcShadowZBounds = false; // Turn OFF automatic calculation.
        directionalLight.shadowMinZ = 1;   // Start casting shadows 1 unit away from the light's position.
        directionalLight.shadowMaxZ = 1000; // Stop casting shadows 100 units away.


        // Create the shadow generator
        const shadowGenerator = new BABYLON.ShadowGenerator(1024, directionalLight);
        shadowGenerator.useExponentialShadowMap = true; // Smoother shadow edges
        shadowGenerator.darkness = 0.8; // Controls how dark shadows are

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
        // Match the fog color to the scene's clear color for a seamless blend
        this.fogColor = BABYLON.Color3.FromHexString(this.clearColor.toHexString());
        this.fogDensity = 0.025; // Adjust this value to make fog thicker or thinner
        // this.fogStart = 0.01;
    }

    private setupInputControls(): void {
        // ... (No changes here)
        this.onKeyboardObservable.add((kbInfo) => {
            const key = kbInfo.event.key.toLowerCase();
            if (kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN) {
                this.inputMap[key] = true;
            } else if (kbInfo.type === BABYLON.KeyboardEventTypes.KEYUP) {
                this.inputMap[key] = false;
            }
        });
        console.log("Input controls (WASD) set up.");
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
            if (this.playerCharacter?.plane?.physicsBody) {
                this.physicsViewer.showBody(this.playerCharacter.plane.physicsBody);
            }
            this.worldBuilder?.chunkCollisionMeshes.forEach(mesh => {
                if (mesh.physicsBody) {
                    this.physicsViewer?.showBody(mesh.physicsBody);
                }
            });
            this.isPhysicsViewerVisible = true;
        }
    }

    private updatePlayer = (): void => {
        // ... (No changes here, the logic is sound)
        if (!this.playerCharacter || !this.playerCharacter.plane.physicsBody || !this.activeCamera) return;

        const body = this.playerCharacter.plane.physicsBody;
        const cameraForward = this.activeCamera.getDirection(BABYLON.Axis.Z);
        const cameraRight = this.activeCamera.getDirection(BABYLON.Axis.X);
        const moveDirection = BABYLON.Vector3.Zero();

        cameraForward.y = 0; cameraForward.normalize();
        cameraRight.y = 0; cameraRight.normalize();

        let isMoving = false;
        if (this.inputMap['w']) { moveDirection.addInPlace(cameraForward); isMoving = true; }
        if (this.inputMap['s']) { moveDirection.subtractInPlace(cameraForward); isMoving = true; }
        if (this.inputMap['a']) { moveDirection.subtractInPlace(cameraRight); isMoving = true; }
        if (this.inputMap['d']) { moveDirection.addInPlace(cameraRight); isMoving = true; }

        const currentYVelocity = body.getLinearVelocity()?.y || 0;

        if (isMoving && moveDirection.lengthSquared() > 0.01) {
            moveDirection.normalize();
            const targetVelocity = moveDirection.scale(this.playerMoveSpeed);
            body.setLinearVelocity(new BABYLON.Vector3(targetVelocity.x, currentYVelocity, targetVelocity.z));

            this.playerCharacter.animationState = 'walk';
            
            if (Math.abs(moveDirection.z) > Math.abs(moveDirection.x)) {
                this.playerCharacter.lookDirection = moveDirection.z > 0 ? CharacterDirection.Up : CharacterDirection.Down;
            } else {
                this.playerCharacter.lookDirection = moveDirection.x > 0 ? CharacterDirection.Right : CharacterDirection.Left;
            }
        } else {
            const currentVelocity = body.getLinearVelocity() || BABYLON.Vector3.Zero();
            body.setLinearVelocity(new BABYLON.Vector3(currentVelocity.x * 0.5, currentYVelocity, currentVelocity.z * 0.5));
            if (Math.abs(currentVelocity.x) < 0.1 && Math.abs(currentVelocity.z) < 0.1) {
                 body.setLinearVelocity(new BABYLON.Vector3(0, currentYVelocity, 0));
            }

            this.playerCharacter.animationState = 'idle';
        }
    }

    public dispose(): void {
        super.dispose();
        // ... (No changes here)
        this.onBeforeRenderObservable.removeCallback(this.updatePlayer);
        this.worldBuilder?.dispose();
        this.playerCharacter?.dispose();
        this.physicsViewer?.dispose();
        console.log("TestScene disposed.");
    }
}