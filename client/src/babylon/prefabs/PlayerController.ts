import * as BABYLON from '@babylonjs/core';
import { ICharacterSummary } from '@project-override/shared/core/CharacterSummary';
import { SpriteSheetCharacter, CharacterDirection } from './SpriteSheetCharacter';

export interface PlayerControllerOptions {
    moveSpeed?: number;
    initialPosition: BABYLON.Vector3;
    characterSummary: ICharacterSummary;
}

export class PlayerController {
    public scene: BABYLON.Scene;
    public character: SpriteSheetCharacter;
    public camera: BABYLON.ArcRotateCamera;
    
    // Public getter for the main mesh, useful for external interactions like the physics viewer
    public get mesh(): BABYLON.TransformNode {
        return this.character.mesh;
    }

    // --- Private Properties ---
    private _inputMap: { [key: string]: boolean } = {};
    private _moveSpeed: number;
    
    // Observers for proper disposal
    private _updateObserver: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>> = null;
    private _keyboardObserver: BABYLON.Nullable<BABYLON.Observer<BABYLON.KeyboardInfo>> = null;

    constructor(scene: BABYLON.Scene, options: PlayerControllerOptions) {
        this.scene = scene;
        this._moveSpeed = options.moveSpeed ?? 2.0;

        // Create the core, synchronous objects
        this.character = new SpriteSheetCharacter('player', this.scene, options.initialPosition);
        
        // The camera is integral to the player controller's behavior
        this.camera = new BABYLON.ArcRotateCamera('playerCam', -Math.PI / 2.5, Math.PI / 4, 20, options.initialPosition.clone(), this.scene);
        this.camera.lowerRadiusLimit = 5;
        this.camera.upperRadiusLimit = 40;
        this.camera.lowerBetaLimit = Math.PI / 6;
        this.camera.upperBetaLimit = Math.PI / 2 - 0.1;
        this.camera.attachControl(true);
        this.camera.lockedTarget = this.character.mesh;
    }

    public async initialize(characterSummary: ICharacterSummary): Promise<void> {
        // Load character appearance (async)
        await this.character.setCharacter(characterSummary);
        this.character.billboard = true;

        // The SpriteSheetCharacter already knows how to set up its own physics.
        // We just need to tell it when.
        this.character.enablePhysics();

        // Setup input listeners and the update loop
        this._setupInput();
        this._updateObserver = this.scene.onBeforeRenderObservable.add(this._update);
    }
    
    // Pass-through method to allow the scene to manage shadows
    public enableShadows(shadowGenerator: BABYLON.ShadowGenerator): void {
        this.character.enableShadows(shadowGenerator);
    }

    private _setupInput(): void {
        this._keyboardObserver = this.scene.onKeyboardObservable.add((kbInfo) => {
            const key = kbInfo.event.key.toLowerCase();
            if (kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN) {
                this._inputMap[key] = true;
            } else if (kbInfo.type === BABYLON.KeyboardEventTypes.KEYUP) {
                this._inputMap[key] = false;
            }
        });
    }

    // Arrow function preserves 'this' context when called by the observable
    private _update = (): void => {
        const body = this.character.mesh.physicsBody;
        if (!body) return;

        const cameraForward = this.camera.getDirection(BABYLON.Axis.Z);
        const cameraRight = this.camera.getDirection(BABYLON.Axis.X);
        const moveDirection = BABYLON.Vector3.Zero();

        cameraForward.y = 0; cameraForward.normalize();
        cameraRight.y = 0; cameraRight.normalize();

        let isMoving = false;
        if (this._inputMap['w']) { moveDirection.addInPlace(cameraForward); isMoving = true; }
        if (this._inputMap['s']) { moveDirection.subtractInPlace(cameraForward); isMoving = true; }
        if (this._inputMap['a']) { moveDirection.subtractInPlace(cameraRight); isMoving = true; }
        if (this._inputMap['d']) { moveDirection.addInPlace(cameraRight); isMoving = true; }

        const currentYVelocity = body.getLinearVelocity()?.y || 0;

        if (isMoving && moveDirection.lengthSquared() > 0.01) {
            moveDirection.normalize();
            const targetVelocity = moveDirection.scale(this._moveSpeed);
            body.setLinearVelocity(new BABYLON.Vector3(targetVelocity.x, currentYVelocity, targetVelocity.z));

            this.character.animationState = 'walk';
            
            if (Math.abs(moveDirection.z) > Math.abs(moveDirection.x)) {
                this.character.lookDirection = moveDirection.z > 0 ? CharacterDirection.Up : CharacterDirection.Down;
            } else {
                this.character.lookDirection = moveDirection.x > 0 ? CharacterDirection.Right : CharacterDirection.Left;
            }
        } else {
            const currentVelocity = body.getLinearVelocity() || BABYLON.Vector3.Zero();
            body.setLinearVelocity(new BABYLON.Vector3(currentVelocity.x * 0.5, currentYVelocity, currentVelocity.z * 0.5));
            if (Math.abs(currentVelocity.x) < 0.1 && Math.abs(currentVelocity.z) < 0.1) {
                 body.setLinearVelocity(new BABYLON.Vector3(0, currentYVelocity, 0));
            }

            this.character.animationState = 'idle';
        }
    }

    public dispose(): void {
        this.camera.dispose();
        this.character.dispose();
        if (this._updateObserver) {
            this.scene.onBeforeRenderObservable.remove(this._updateObserver);
        }
        if (this._keyboardObserver) {
            this.scene.onKeyboardObservable.remove(this._keyboardObserver);
        }
    }
}