import * as BABYLON from '@babylonjs/core';
import { BaseScene } from './BaseScene';
import { useGeneralStore } from '@/stores/GeneralStore';
import { useServiceStore } from '@/stores/ServiceStore';
import { WorldMeshBuilder } from '../utils/WorldMeshBuilder';
import { IWorldBlock } from '@project-override/shared/core/WorldBlock';
import { BlockDefinition } from '../utils/BlockDefinition';

import DEV_TESTMAP from '@/data/dev_TestMap_Big.json';
import blockDefinitionsData from '@/data/DT_BlockDefinitions.json';
import { ICharacterSummary } from '@project-override/shared/core/CharacterSummary';
import { SpriteSheetCharacter, CharacterDirection } from '../prefabs/SpriteSheetCharacter'; // Ensure CharacterDirection is exported
import { Plant } from '../prefabs/Plant';

export class TestScene extends BaseScene {
    private worldBuilder: WorldMeshBuilder | undefined;
    private playerCharacter: SpriteSheetCharacter | undefined;
    private inputMap: { [key: string]: boolean } = {};
    private playerMoveSpeed = 3.5; // Adjusted speed

    private physicsViewer: BABYLON.PhysicsViewer | undefined;
    private isPhysicsViewerVisible: boolean = false;


    constructor(engine: BABYLON.Engine) {
        super(engine);
        this.initialize();
    }

    private async initialize(): Promise<void> {
        try {
            console.log("Initializing TestScene...");

            const preloadedPhysics = useGeneralStore.getState().gameEngine?.physics;
            if (preloadedPhysics) {
                const physicsPlugin = new BABYLON.HavokPlugin(true, preloadedPhysics);
                this.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), physicsPlugin);
                console.log("Physics enabled.");
            } else {
                console.error("Physics is not loaded. Physics will not work.");
                return;
            }

            new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0.5, 1, 0.25), this);

            useServiceStore.getState().assetService?.setScene(this); // Important for asset loading in SpriteSheetCharacter
            
            const plant = new Plant('plant_test', this, new BABYLON.Vector3(12, 1, 12));
            await plant.applyTexture('/assets/textures/dev_grass.png');

            // Player Character (visuals and physics body)
            // Initial position on the ground, e.g., Y=2 assuming ground is at Y=0 or Y=1
            // Ensure the player starts at a reasonable height above the ground blocks
            const playerInitialPosition = new BABYLON.Vector3(10, 5, 10); 
            this.playerCharacter = new SpriteSheetCharacter('playerChar', this, playerInitialPosition);
            
            const testCharSummary: ICharacterSummary = { id: 'char1', userId: 'user1', name: 'Player', level: 1, lastPlayed: 0, isOnline: false, isDeleted: false, deletedAt: 0, appearance: { bodyIdx: 4711, eyesIdx: 0, beardIdx: 0, hairIdx: 0, hairFrontIdx: 0, hairBackIdx: 0 }, equipmentVisuals: [] };
            await this.playerCharacter.setCharacter(testCharSummary); // Make sure setCharacter is awaited if it loads assets
            this.playerCharacter.billboard = true;

            if (this.playerCharacter.plane) { // Ensure plane exists
                this.playerCharacter.plane.physicsBody = new BABYLON.PhysicsBody(
                    this.playerCharacter.plane,
                    BABYLON.PhysicsMotionType.DYNAMIC,
                    false,
                    this
                );
                this.playerCharacter.plane.physicsBody.setMassProperties({ mass: 2 }); // Give player some mass
                this.playerCharacter.plane.physicsBody.setAngularDamping(1000); // Prevent capsule from falling over
                this.playerCharacter.plane.physicsBody.setMassProperties({
                    mass: 2,
                    inertia: new BABYLON.Vector3(1e7, 0.5, 1e7),
                })

                // Adjusted capsule shape for better fit with a 2-unit high sprite
                const capsuleRadius = 0.4;
                const playerShape = new BABYLON.PhysicsShape({
                    type: BABYLON.PhysicsShapeType.CAPSULE,
                    parameters: { radius: capsuleRadius, pointA: new BABYLON.Vector3(0, -0.5, 0), pointB: new BABYLON.Vector3(0, 0.5, 0), center: new BABYLON.Vector3(0, -0.5, 0) },
                }, this);
                this.playerCharacter.plane.physicsBody.shape = playerShape;

                console.log("Player collision body and shape created.");
            } else {
                console.error("Player character plane not initialized!");
                return;
            }


            // Camera - ArcRotateCamera for third-person view
            const camera = new BABYLON.ArcRotateCamera('arcCam', -Math.PI / 2, Math.PI / 3.5, 15, playerInitialPosition.clone(), this);
            camera.lowerRadiusLimit = 2;
            camera.upperRadiusLimit = 30;
            camera.lowerBetaLimit = Math.PI / 6; // Prevent camera from going too low
            camera.upperBetaLimit = Math.PI / 2 - 0.1; // Prevent camera from going directly overhead
            camera.attachControl(true);
            this.activeCamera = camera;
            if (this.playerCharacter?.plane) {
                camera.lockedTarget = this.playerCharacter.plane; // Make camera follow the player
            }

            this.clearColor = new BABYLON.Color4(0.1, 0.1, 0.15, 1);

            this.worldBuilder = new WorldMeshBuilder(this, blockDefinitionsData as BlockDefinition[]);
            const exampleInitialWorld: IWorldBlock[] = DEV_TESTMAP as IWorldBlock[];

            console.log("Starting initial world load...");
            await this.worldBuilder.loadInitialWorld(exampleInitialWorld);
            console.log("Initial world load complete (visuals and physics).");

            this.setupInputControls();
            this.onBeforeRenderObservable.add(this.updatePlayer);

            this.onReadyObservable.addOnce(() => {
                const uiDirector = useGeneralStore.getState().gameEngine?.uiDirector;
                const bgmService = useServiceStore.getState().bgmService;
                if (!uiDirector || !bgmService) return;

                bgmService.play({ name: "menu_theme", filePath: "/assets/audio/bgm/MainframeOfTheForgottenRealm.mp3", loop: true, volume: 0.1 }, 0);
                setTimeout(() => uiDirector.showToast('Dev Build #2483-2025-05-25 (Physics Debug)', 5000, 'bottom-left'), 1000);
            });

this.onKeyboardObservable.add((kbInfo) => {
                if (kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN) {
                    if (kbInfo.event.key.toLowerCase() === 'p') {
                        this.togglePhysicsViewer();
                    }
                }
            });
            console.log("Press 'P' to toggle physics debug shapes.");

            console.log('Test scene setup complete.');

        } catch (error) {
            console.error("Error during TestScene initialization:", error);
        }
    }

    private setupInputControls(): void {
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
        const physicsEngine = this.getPhysicsEngine();
        if (!physicsEngine) {
            console.warn("Cannot toggle PhysicsViewer: No physics engine.");
            return;
        }

        if (this.isPhysicsViewerVisible) {
            if (this.physicsViewer) {
                this.physicsViewer.dispose();
                this.physicsViewer = undefined;
                console.log("PhysicsViewer hidden.");
            }
            this.isPhysicsViewerVisible = false;
        } else {
            this.physicsViewer = new BABYLON.PhysicsViewer(this); // Pass the scene

            // Show player's physics body
            if (this.playerCharacter?.plane?.physicsBody) {
                this.physicsViewer.showBody(this.playerCharacter.plane.physicsBody);
            }

            // Show world chunk collision meshes
            this.worldBuilder?.chunkCollisionMeshes.forEach(mesh => {
                if (mesh.physicsBody) {
                    this.physicsViewer?.showBody(mesh.physicsBody);
                }
            });
            console.log("PhysicsViewer shown.");
            this.isPhysicsViewerVisible = true;
        }
    }

    private updatePlayer = (): void => { // Use arrow function to bind `this`
        if (!this.playerCharacter || !this.playerCharacter.plane.physicsBody || !this.activeCamera) return;

        const body = this.playerCharacter.plane.physicsBody;
        const cameraForward = this.activeCamera.getDirection(BABYLON.Axis.Z);
        const cameraRight = this.activeCamera.getDirection(BABYLON.Axis.X);
        const moveDirection = BABYLON.Vector3.Zero();

        // Project camera directions onto XZ plane and normalize
        cameraForward.y = 0; cameraForward.normalize();
        cameraRight.y = 0; cameraRight.normalize();

        let isMoving = false;
        if (this.inputMap['w']) {
            moveDirection.addInPlace(cameraForward);
            isMoving = true;
        }
        if (this.inputMap['s']) {
            moveDirection.subtractInPlace(cameraForward);
            isMoving = true;
        }
        if (this.inputMap['a']) {
            moveDirection.subtractInPlace(cameraRight);
            isMoving = true;
        }
        if (this.inputMap['d']) {
            moveDirection.addInPlace(cameraRight);
            isMoving = true;
        }

        const currentYVelocity = body.getLinearVelocity()?.y || 0;

        if (isMoving && moveDirection.lengthSquared() > 0.01) {
            moveDirection.normalize();
            const targetVelocity = moveDirection.scale(this.playerMoveSpeed);
            body.setLinearVelocity(new BABYLON.Vector3(targetVelocity.x, currentYVelocity, targetVelocity.z));

            this.playerCharacter.animationState = 'walk';

            // Update lookDirection based on world moveDirection
            if (Math.abs(moveDirection.z) > Math.abs(moveDirection.x) * 1.5) { // Prioritize Z if significantly larger
                this.playerCharacter.lookDirection = moveDirection.z > 0 ? CharacterDirection.Up : CharacterDirection.Down;
            } else if (Math.abs(moveDirection.x) > Math.abs(moveDirection.z) * 1.5) { // Prioritize X if significantly larger
                this.playerCharacter.lookDirection = moveDirection.x > 0 ? CharacterDirection.Right : CharacterDirection.Left;
            } else { // Diagonal - pick based on largest component or a default
                 if (Math.abs(moveDirection.z) >= Math.abs(moveDirection.x)) {
                    this.playerCharacter.lookDirection = moveDirection.z > 0 ? CharacterDirection.Up : CharacterDirection.Down;
                 } else {
                    this.playerCharacter.lookDirection = moveDirection.x > 0 ? CharacterDirection.Right : CharacterDirection.Left;
                 }
            }

        } else {
            // Apply damping/stop horizontal movement
            const currentVelocity = body.getLinearVelocity() || BABYLON.Vector3.Zero();
            body.setLinearVelocity(new BABYLON.Vector3(currentVelocity.x * 0.5, currentYVelocity, currentVelocity.z * 0.5)); // Simple damping
            if (Math.abs(currentVelocity.x) < 0.1 && Math.abs(currentVelocity.z) < 0.1) {
                 body.setLinearVelocity(new BABYLON.Vector3(0, currentYVelocity, 0));
            }

            this.playerCharacter.animationState = 'idle';
        }
        // SpriteSheetCharacter's internal update (called via scene.onBeforeRenderObservable)
        // will use animationState and lookDirection to choose the correct sprite.
    }

    public dispose(): void {
        super.dispose();
        this.onBeforeRenderObservable.removeCallback(this.updatePlayer);
        this.worldBuilder?.dispose();
        this.playerCharacter?.dispose();
        this.physicsViewer?.dispose(); // Dispose viewer if it exists
        console.log("TestScene disposed.");
    }
}