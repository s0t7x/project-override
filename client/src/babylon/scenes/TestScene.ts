import * as BABYLON from '@babylonjs/core';
import { BaseScene } from './BaseScene';
import { useGeneralStore } from '@/stores/GeneralStore';
import { useServiceStore } from '@/stores/ServiceStore';
// import { Button } from '@/react/common/Button'; // Assuming not needed for this debug
import { WorldMeshBuilder } from '../utils/WorldMeshBuilder';
import { IWorldBlock } from '@project-override/shared/core/WorldBlock';
import { BlockDefinition } from '../utils/BlockDefinition';

import DEV_TESTMAP from '@/data/dev_TestMap_Big.json';
import blockDefinitionsData from '@/data/DT_BlockDefinitions.json';
import { ICharacterSummary } from '@project-override/shared/core/CharacterSummary';
import { SpriteSheetCharacter } from '../prefabs/SpriteSheetCharacter';

export class TestScene extends BaseScene {
    private worldBuilder: WorldMeshBuilder | undefined;

    constructor(engine: BABYLON.Engine) {
        super(engine);
        this.initialize(); // Call async initialization
    }

    private async initialize(): Promise<void> {
        try {
            console.log("Initializing TestScene...");

            const preloadedPhysics = useGeneralStore.getState().gameEngine?.physics;
            if (preloadedPhysics) {
                let physicsPlugin: BABYLON.HavokPlugin = new BABYLON.HavokPlugin(true, preloadedPhysics);
                console.log("Physics from preloaded GameEngine state.");
                this.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), physicsPlugin); // Standard gravity
                console.log("Physics enabled.");
            } else {
                console.error("Physics is not loaded. Physics will not work.");
                return; // Can't proceed without Physics
            }


            // Light
            new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0.5, 1, 0.25), this);

            // Camera
            const camera = new BABYLON.FreeCamera('cam', new BABYLON.Vector3(15, 15, 0), this); // Adjusted position
            camera.setTarget(new BABYLON.Vector3(10, 2, 10)); // Look towards expected player start
            camera.fov = 0.6;
            camera.minZ = 0.1;
            camera.attachControl(true);
            this.activeCamera = camera;

            this.clearColor = new BABYLON.Color4(0.1, 0.1, 0.15, 1);

            this.worldBuilder = new WorldMeshBuilder(this, blockDefinitionsData as BlockDefinition[]);
            const exampleInitialWorld: IWorldBlock[] = DEV_TESTMAP as IWorldBlock[];

            console.log("Starting initial world load...");
            await this.worldBuilder.loadInitialWorld(exampleInitialWorld);
            console.log("Initial world load complete (visuals and physics).");

            // playerCollisionBox.physicsImpostor.setAngularVelocity
            console.log("Player collision box and impostor created.");

            // SpriteSheetCharacter (Visuals only for now, sync position later)
            useServiceStore.getState().assetService?.setScene(this);
            const testCharSummary: ICharacterSummary = { /* your summary */ id: 'char1', userId: 'user1', name: 'Test', level: 1, lastPlayed: 0, isOnline: false, isDeleted: false, deletedAt: 0, appearance: { bodyIdx: 4711, eyesIdx: 0, beardIdx: 0, hairIdx: 0, hairFrontIdx: 0, hairBackIdx: 0 }, equipmentVisuals: [] };
            const testCharVisual = new SpriteSheetCharacter('testCharVisual', this, new BABYLON.Vector3(10,20,10)); // Initial pos doesn't matter
            testCharVisual.setCharacter(testCharSummary); // If setCharacter is async
            testCharVisual.plane.isPickable = false; // Visual part
            testCharVisual.plane.physicsBody = new BABYLON.PhysicsBody(
                testCharVisual.plane,              // Node
                BABYLON.PhysicsMotionType.DYNAMIC,
                false,                                 // isDeterministic
                this
            );
            testCharVisual.plane.physicsBody.setAngularDamping(255);
            const shape = new BABYLON.PhysicsShape({ type: BABYLON.PhysicsShapeType.CAPSULE, parameters: { radius: 0.9 } }, this);
    
            testCharVisual.plane.physicsBody.shape = shape;

            // // In your render loop, you would sync testCharVisual.plane.position with playerCollisionBox.position
            // this.onBeforeRenderObservable.add(() => {
            //     if (testCharVisual && testCharVisual.plane) {
            //         testCharVisual.plane.position.copyFrom(playerCollisionBox.position);
            //         testCharVisual.plane.position.y += 0.5;
            //         // Optionally sync rotation if your character physics box can rotate
            //         // if (playerCollisionBox.rotationQuaternion) {
            //         //    testCharVisual.plane.rotationQuaternion = playerCollisionBox.rotationQuaternion;
            //         // }
            //     }
            // });


            this.onReadyObservable.addOnce(() => {
                const uiDirector = useGeneralStore.getState().gameEngine?.uiDirector;
                const bgmService = useServiceStore.getState().bgmService;
                if (!uiDirector || !bgmService) return;

                bgmService.play({ name: "menu_theme",
                filePath: "/assets/audio/bgm/MainframeOfTheForgottenRealm.mp3",
                loop: true,
                volume: 0.1}, 0);

                setTimeout(() => {
                    uiDirector.showToast('Dev Build #2483-2025-05-25 (Physics Debug)', 5000, 'bottom-left');
                }, 1000);
            });

            console.log('Test scene setup complete.');

        } catch (error) {
            console.error("Error during TestScene initialization:", error);
        }
    }
}