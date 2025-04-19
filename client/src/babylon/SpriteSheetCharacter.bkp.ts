// client/src/babylon/character/SpriteSheetCharacter.ts
// Manages displaying an animated 2D character using a spritesheet on a Plane mesh.
// Handles camera-relative direction updates for animations AND adds limited Y-axis rotation for perspective.

import * as B from '@babylonjs/core';
import { AssetService } from '../services/AssetService'; // Adjust path if needed
import { Vector3, TmpVectors, Plane, Observer, Nullable, Matrix, Quaternion, Color3 } from '@babylonjs/core'; // Import necessary classes

// --- Configuration (YOURS - Keeping as provided) ---
const FRAME_WIDTH = 64;
const FRAME_HEIGHT = 64;
const SHEET_COLUMNS = 24;
const SHEET_ROWS = 66;
const ANIMATION_DEFINITIONS = {
    'walk_up': { startRow: 8, frames: 9, columnOffset: 0, durationMultiplier: 1.0 },
    'walk_left': { startRow: 9, frames: 9, columnOffset: 0, durationMultiplier: 1.0 },
    'walk_down': { startRow: 10, frames: 9, columnOffset: 0, durationMultiplier: 1.0 },
    'walk_right': { startRow: 11, frames: 9, columnOffset: 0, durationMultiplier: 1.0 },
    'idle_up': { startRow: 43, frames: 2, columnOffset: 0, durationMultiplier: 4.0 },
    'idle_left': { startRow: 42, frames: 2, columnOffset: 0, durationMultiplier: 4.0 },
    'idle_down': { startRow: 41, frames: 2, columnOffset: 0, durationMultiplier: 4.0 },
    'idle_right': { startRow: 40, frames: 2, columnOffset: 0, durationMultiplier: 4.0 },
};
type AnimationName = keyof typeof ANIMATION_DEFINITIONS;
const DEFAULT_ANIMATION: AnimationName = 'idle_down';
const BASE_FRAME_DURATION = 120 / 1000; // Base duration (120ms) in seconds per frame
const MAX_Y_PERSPECTIVE_ANGLE = Math.PI / 3; // Max perspective yaw = 45 degrees (PI / 4 radians)

// --- Character Direction Enum ---
export enum CharacterDirection {
    Up = 'up',       // Facing +Z (Back to default camera)
    Down = 'down',   // Facing -Z (Front to default camera)
    Left = 'left',   // Facing -X (Right side to default camera)
    Right = 'right'  // Facing +X (Left side to default camera)
}
const DEFAULT_DIRECTION = CharacterDirection.Down; // Default logical forward (-Z)
const LEAN_X_ANGLE = -0.2
const TURN_TOWARDS_FACTOR = 0

//----------------------------------------------------------------

export class SpriteSheetCharacter {
    private scene: B.Scene;
    private assetService?: AssetService;
    public name: string;
    public plane: B.Mesh;
    private material: B.StandardMaterial;
    private texture: B.Texture | null = null;

    // Public state control
    public lookAtTarget: B.Vector3 | null = null;
    public animationState: string | null = null;

    // Internal Animation State
    private currentFullAnimation: AnimationName = DEFAULT_ANIMATION;
    private currentLogicalDirection: CharacterDirection = DEFAULT_DIRECTION; // Which sprite set to use (Up/Down/Left/Right)
    private currentFrameIndex: number = 0;
    private currentSnappedDirection: CharacterDirection = DEFAULT_DIRECTION; // Direction for sprite choice
    private animationTimer: number = 0;
    private currentFrameDuration: number = BASE_FRAME_DURATION;
    private isAnimationPlaying: boolean = true;

    private readonly uvScaleX: number = 1 / SHEET_COLUMNS;
    private readonly uvScaleY: number = 1 / SHEET_ROWS;
    private updateObserver: Nullable<Observer<B.Scene>> = null;

    constructor(
        name: string,
        scene: B.Scene,
        assetService?: AssetService,
        initialPosition: B.Vector3 = Vector3.Zero()
    ) {
        this.name = name;
        this.scene = scene;
        this.assetService = assetService;

        this.plane = B.MeshBuilder.CreatePlane(`${name}_plane`, { width: 2, height: 2 }, this.scene);
        this.plane.position = initialPosition.clone();
        this.plane.billboardMode = B.Mesh.BILLBOARDMODE_NONE; // Manual rotation
        this.plane.isPickable = false;
        this.plane.rotationQuaternion = Quaternion.Identity(); // Use Quaternion

        this.material = new B.StandardMaterial(`${name}_mat`, this.scene);
        this.material.backFaceCulling = false;
        this.material.disableLighting = false;
        // this.material.emissiveColor = B.Color3.White();
        this.material.useAlphaFromDiffuseTexture = true;
        // this.material.needDepthPrePass = true;
        this.material.disableDepthWrite = true;
        this.plane.material = this.material;

        this.updateObserver = this.scene.onBeforeRenderObservable.add(this.update);
        console.log(`[SpriteSheetCharacter:${this.name}] Initialized.`);
    }

    /** Loads/Updates the character's spritesheet texture and resets animation. */
    public async updateCharacter(spriteSheetUrl: string | null, initialAnimation?: AnimationName): Promise<void> {
        const oldTexture = this.texture;
        if (!spriteSheetUrl) {
            console.log(`[SpriteSheetCharacter:${this.name}] Clearing texture.`);
            this.material.diffuseTexture = null; this.texture = null; this.stopAnimation();
        } else {
            console.log(`[SpriteSheetCharacter:${this.name}] Updating texture: ${spriteSheetUrl}`);
            try {
                let newTexture: B.Texture | null = null; const scene = this.scene;
                if (this.assetService) { newTexture = new B.Texture(spriteSheetUrl, scene, false, true, B.Texture.NEAREST_SAMPLINGMODE); } // TODO: Use AssetService with options
                else { newTexture = new B.Texture(spriteSheetUrl, scene, false, true, B.Texture.NEAREST_SAMPLINGMODE); } // invertY=true
                if (newTexture) {
                    this.texture = newTexture; this.texture.hasAlpha = true; this.material.diffuseTexture = this.texture;
                    this.applyRotation(0, 0);
                    console.log(`[SpriteSheetCharacter:${this.name}] Texture updated.`);
                    if (initialAnimation) this.setAnimationInternal(initialAnimation, true);
                } else { console.error(`[SpriteSheetCharacter:${this.name}] Texture update failed: ${spriteSheetUrl}`); }
            } catch (error) { console.error(`[SpriteSheetCharacter:${this.name}] Error updating texture ${spriteSheetUrl}:`, error); this.texture = null; this.material.diffuseTexture = null; }
        }
        if (oldTexture && oldTexture !== this.texture && !this.assetService) { oldTexture.dispose(); }
    }

    /** Sets the movement state (walking or idle). */
    public setMoving(isMoving: boolean): void {
        if (this.isMoving !== isMoving) { this.isMoving = isMoving; this.determineAndSetAnimationName(); }
    }

    /** Sets an optional target point the character logically faces. */
    public setLookAtTarget(targetPoint: B.Vector3 | null): void {
        const targetChanged = (!this.lookAtTarget && targetPoint) || (this.lookAtTarget && !targetPoint) || (this.lookAtTarget && targetPoint && !this.lookAtTarget.equals(targetPoint));
        if (targetChanged) { this.lookAtTarget = targetPoint ? targetPoint.clone() : null; }
    }

    /** Pauses the frame advancement timer. */
    public stopAnimation(): void { this.isAnimationPlaying = false; }
    /** Resumes the frame advancement timer. */
    public resumeAnimation(): void { this.isAnimationPlaying = true; }
    /** Updates the character's world position. */
    public setPosition(position: B.Vector3): void { this.plane.position.copyFrom(position); }
    /** Gets the character's world position */
    public getPosition(): B.Vector3 { return this.plane.position; }

    // --- Internal Logic ---


    /** Main update loop called by scene.registerBeforeRender */
    private update = (): void => {
        // 1. Calculate Snapped Direction, Target Yaw, and Sprite Direction
        const { snappedYaw, subtleTurnYaw, spriteDirection } = this.calculateTargetRotationAndDirection();

        // 2. Apply the calculated rotation to the plane mesh
        this.applyRotation(snappedYaw, subtleTurnYaw);

        // 3. Update the internal state for sprite direction if changed
        if (this.currentSnappedDirection !== spriteDirection) {
            // console.log(`[${this.name} DEBUG SpriteDir] *** Sprite Dir CHANGED to ${spriteDirection} ***`);
            this.currentSnappedDirection = spriteDirection;
        }

        // 4. Determine the full animation name based on sprite direction & movement
        this.determineAndSetAnimationName();

        // 5. Advance the frame timer
        this.advanceAnimationFrame();
    }

    /**
     * Calculates the target rotation angles and the sprite direction based on camera view
     * relative to the character's logical forward direction.
     * @returns An object containing { snappedYaw, subtleTurnYaw, spriteDirection }
     */
    private calculateTargetRotationAndDirection(): { snappedYaw: number, subtleTurnYaw: number, spriteDirection: CharacterDirection } {
        const cam = this.scene.activeCamera;
        const charPos = this.plane.position;
        let snappedYaw = 0; // Default world Y rotation if calculation fails
        let subtleTurnYaw = 0; // Additional small turn towards camera
        let spriteDirection = this.currentSnappedDirection; // Default to current

        if (cam && cam.getViewMatrix()) { // Need camera and its view matrix
            // 1. Logical Forward vector (where character *wants* to face)
            const logicalForwardWorld = TmpVectors.Vector3[0];
            this.getLogicalForward(logicalForwardWorld); // Gets normalized vector

            // 2. View Direction vector (character to camera, XZ plane)
            const viewDirectionXZ = TmpVectors.Vector3[1];
            cam.globalPosition.subtractToRef(charPos, viewDirectionXZ);
            viewDirectionXZ.y = 0;
            if (viewDirectionXZ.lengthSquared() < 0.001) { // Avoid zero vector if camera overhead
                viewDirectionXZ.copyFrom(this.getDirectionVector(this.currentSnappedDirection)); // Use last direction's vector
                viewDirectionXZ.negateInPlace(); // Point towards character from previous direction
            }
            viewDirectionXZ.normalize();

            // 3. Relative Angle (Angle FROM Logical Forward TO View Direction)
            const dot = Vector3.Dot(logicalForwardWorld, viewDirectionXZ);
            const crossY = logicalForwardWorld.z * viewDirectionXZ.x - logicalForwardWorld.x * viewDirectionXZ.z;
            let relativeAngle = Math.atan2(crossY, dot); // -PI to PI
            
            // 4. Determine Snapped Direction and Snapped World Yaw Angle
            const PI_4 = Math.PI / 4; const PI_34 = 3 * Math.PI / 4;
            const PI_2 = Math.PI/2;

            // Determine the SPRITE direction based on the RELATIVE angle
            if (relativeAngle >= -PI_4 && relativeAngle < PI_4) {             // Camera is ~in front
                spriteDirection = CharacterDirection.Down;
                snappedYaw = this.getAngleFromDirection(CharacterDirection.Down); // Face world -Z
            } else if (relativeAngle >= PI_4 && relativeAngle < PI_34) {      // Camera is ~to the right
                spriteDirection = CharacterDirection.Right;
                snappedYaw = this.getAngleFromDirection(CharacterDirection.Right); // Face world +X
            } else if (relativeAngle >= PI_34 || relativeAngle < -PI_34) {   // Camera is ~behind
                spriteDirection = CharacterDirection.Up;
                snappedYaw = this.getAngleFromDirection(CharacterDirection.Up);   // Face world +Z
            } else { // angle >= -3*PI/4 && angle < -PI/4                    // Camera is ~to the left
                spriteDirection = CharacterDirection.Left;
                snappedYaw = this.getAngleFromDirection(CharacterDirection.Left);  // Face world -X
            }


            // 5. Calculate Subtle Turn Towards Camera
            // Find the angle difference between the snapped direction and the actual view direction
            const snappedForwardWorld = this.getDirectionVector(spriteDirection, TmpVectors.Vector3[2]);
            const dotSnap = Vector3.Dot(snappedForwardWorld, viewDirectionXZ);
            const crossSnapY = snappedForwardWorld.z * viewDirectionXZ.x - snappedForwardWorld.x * viewDirectionXZ.z;
            const angleDiff = Math.atan2(crossSnapY, dotSnap); // Angle FROM snapped dir TO actual view dir

            // Apply only a fraction of this difference for the subtle turn
            subtleTurnYaw = angleDiff * TURN_TOWARDS_FACTOR;
            snappedYaw = 0;
        }

        return { snappedYaw, subtleTurnYaw, spriteDirection };
    }

    /** Applies the rotation to the plane mesh using quaternions */
    private applyRotation(snappedYaw: number, subtleTurnYaw: number): void {
        if (!this.plane.rotationQuaternion) return;

        // Rotation for the snapped base direction
        const snappedRotation = TmpVectors.Quaternion[0];
        Quaternion.RotationAxisToRef(Vector3.UpReadOnly, snappedYaw, snappedRotation);

        // Rotation for the subtle additional turn towards the camera
        const subtleTurnRotation = TmpVectors.Quaternion[1];
        Quaternion.RotationAxisToRef(Vector3.UpReadOnly, subtleTurnYaw, subtleTurnRotation);

        // Combine: Base snapped rotation * subtle turn
        snappedRotation.multiplyToRef(subtleTurnRotation, this.plane.rotationQuaternion);
    }

    /** Helper to get the corresponding world Y angle (radians) for a CharacterDirection */
    private getAngleFromDirection(direction: CharacterDirection): number {
        switch (direction) {
            case CharacterDirection.Up: return 0;          // Face +Z
            case CharacterDirection.Down: return Math.PI;      // Face -Z
            case CharacterDirection.Left: return -Math.PI / 2; // Face -X
            case CharacterDirection.Right: return Math.PI / 2;  // Face +X
            default: return Math.PI;
        }
    }

    /** Helper to get the normalized logical forward vector in world space */
    private getLogicalForward(resultVector: Vector3): void {
        if (this.lookAtTarget) {
            this.lookAtTarget.subtractToRef(this.plane.position, resultVector);
        } else {
            resultVector.set(0, 0, -1); // Default: World -Z (Facing away from standard camera start)
        }
        resultVector.y = 0;
        if (resultVector.lengthSquared() < 0.001) {
            resultVector.copyFrom(this.getDirectionVector(this.currentSnappedDirection)); return; // Use last valid
        }
        if(Math.abs(resultVector.x) > Math.abs(resultVector.z))
            resultVector.z = 0;
        else 
            resultVector.x = 0;
        resultVector.normalize();

    }

    /** Determines and sets the correct full animation name based on current state */
    private determineAndSetAnimationName(forceUpdateUV: boolean = false): void {
        const prefix = this.animationState || 'idle';
        // Use the updated currentSnappedDirection
        const newAnimationName = `${prefix}_${this.currentSnappedDirection}` as AnimationName;
        this.setAnimationInternal(newAnimationName, forceUpdateUV);
    }

    /** INTERNAL method that actually changes animation state and UVs */
    private setAnimationInternal(name: AnimationName, forceUpdateUV: boolean = false): void {
        if (!this.texture) return;
        let animDef = ANIMATION_DEFINITIONS[name];
        if (!animDef) { name = DEFAULT_ANIMATION; animDef = ANIMATION_DEFINITIONS[name]; }
        if (!animDef) { console.error(`Default animation ${DEFAULT_ANIMATION} missing!`); return; }
        const nameChanged = this.currentFullAnimation !== name;
        if (!nameChanged && !forceUpdateUV) { this.isAnimationPlaying = true; return; }
        // console.log(`[DEBUG Anim] SetAnimInternal: UPDATING Animation from ${this.currentFullAnimation} to ${name}`);
        this.currentFullAnimation = name;
        this.currentFrameDuration = (animDef.durationMultiplier || 1.0) * BASE_FRAME_DURATION;
        if (nameChanged) { this.currentFrameIndex = 0; this.animationTimer = 0; }
        this.isAnimationPlaying = true;
        this._updateUVs();
    }

    /** Advances the animation frame if playing */
    private advanceAnimationFrame(): void {
        if (!this.isAnimationPlaying || !this.texture || !this.scene || !this.currentFullAnimation) return;
        const deltaTime = this.scene.getEngine().getDeltaTime() / 1000.0;
        this.animationTimer += deltaTime;
        if (this.animationTimer >= this.currentFrameDuration) {
            this.animationTimer %= this.currentFrameDuration;
            const animDef = ANIMATION_DEFINITIONS[this.currentFullAnimation];
            if (!animDef) return;
            this.currentFrameIndex = (this.currentFrameIndex + 1) % animDef.frames;
            this._updateUVs();
        }
    }

    /** Calculates and updates the texture UV offsets and scales */
    private _updateUVs(): void {
        if (!this.texture || !this.currentFullAnimation) return;
        const animDef = ANIMATION_DEFINITIONS[this.currentFullAnimation];
        if (!animDef) return;
        const frameIndexInSequence = this.currentFrameIndex;
        const column = animDef.columnOffset + frameIndexInSequence;
        const row = animDef.startRow;
        const uOffset = column * this.uvScaleX;
        const vOffset = row * this.uvScaleY;
        // console.log(`[DEBUG UV] Update: Anim=${this.currentFullAnimation}, Frame=${frameIndexInSequence}, Col=${column}, Row=${row}, uOff=${uOffset.toFixed(3)}, vOff=${vOffset.toFixed(3)}`);
        this.texture.uOffset = uOffset; this.texture.vOffset = vOffset;
        this.texture.uScale = this.uvScaleX; this.texture.vScale = this.uvScaleY;
    }

    private getDirectionVector(direction: CharacterDirection, resultVector?: Vector3): B.Vector3 {
        const vec = resultVector || TmpVectors.Vector3[3]; // Use temp or provided vector
        switch (direction) {
            case CharacterDirection.Up: vec.set(0, 0, 1); break;  // World +Z
            case CharacterDirection.Down: vec.set(0, 0, -1); break; // World -Z
            case CharacterDirection.Left: vec.set(-1, 0, 0); break; // World -X
            case CharacterDirection.Right: vec.set(1, 0, 0); break;  // World +X
            default: vec.set(0, 0, -1); // Default to Down/-Z
        }
        return vec;
    }

    /** Cleans up resources */
    public dispose(): void {
        console.log(`[SpriteSheetCharacter:${this.name}] Disposing...`);
        if (this.updateObserver) { this.scene.onBeforeRenderObservable.remove(this.updateObserver); this.updateObserver = null; }
        this.plane.dispose(false, true); this.material.dispose();
        if (!this.assetService && this.texture) { this.texture.dispose(); }
        this.texture = null;
        console.log(`[SpriteSheetCharacter:${this.name}] Disposed.`);
    }
}