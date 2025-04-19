import * as B from '@babylonjs/core';
import { AssetService } from '../services/AssetService';
import { Vector3, TmpVectors, Observer, Nullable, Quaternion, Color3 } from '@babylonjs/core';

const SHEET_COLUMNS = 24;
const SHEET_ROWS = 66;
const ANIMATION_DEFINITIONS = {
    'test_up': { startRow: 65, frames: 6, columnOffset: 0, durationMultiplier: 3.0 },
    'test_left': { startRow: 64, frames: 6, columnOffset: 0, durationMultiplier: 3.0 },
    'test_down': { startRow: 63, frames: 6, columnOffset: 0, durationMultiplier: 3.0 },
    'test_right': { startRow: 62, frames: 6, columnOffset: 0, durationMultiplier: 3.0 },
    'walk_up': { startRow: 57, frames: 8, columnOffset: 1, durationMultiplier: 1.0 },
    'walk_left': { startRow: 56, frames: 8, columnOffset: 1, durationMultiplier: 1.0 },
    'walk_down': { startRow: 55, frames: 8, columnOffset: 1, durationMultiplier: 1.0 },
    'walk_right': { startRow: 54, frames: 8, columnOffset: 1, durationMultiplier: 1.0 },
    'idle_up': { startRow: 43, frames: 2, columnOffset: 0, durationMultiplier: 4.0 },
    'idle_left': { startRow: 42, frames: 2, columnOffset: 0, durationMultiplier: 4.0 },
    'idle_down': { startRow: 41, frames: 2, columnOffset: 0, durationMultiplier: 4.0 },
    'idle_right': { startRow: 40, frames: 2, columnOffset: 0, durationMultiplier: 4.0 },
};
type AnimationName = keyof typeof ANIMATION_DEFINITIONS;
const DEFAULT_ANIMATION: AnimationName = 'idle_down';
const BASE_FRAME_DURATION = 120 / 1000;

export enum CharacterDirection {
    Up = 'up',
    Down = 'down',
    Left = 'left',
    Right = 'right'
}
const DEFAULT_DIRECTION = CharacterDirection.Down;

//---

export class SpriteSheetCharacter {
    private scene: B.Scene;
    private assetService?: AssetService;
    public name: string;
    public plane: B.Mesh;
    private material: B.StandardMaterial;
    private texture: B.Texture | null = null;

    // Logical view direction
    public lookDirection: CharacterDirection = DEFAULT_DIRECTION;
    private currentDirection: CharacterDirection = DEFAULT_DIRECTION; // Direction for sprite choice

    // Animation State
    public animationState: string | null = null;
    private currentFullAnimation: AnimationName = DEFAULT_ANIMATION;
    private currentFrameIndex: number = 0;
    private animationTimer: number = 0;
    private currentFrameDuration: number = BASE_FRAME_DURATION;
    private isAnimationPlaying: boolean = true;

    private readonly uvScaleX: number = 1 / SHEET_COLUMNS;
    private readonly uvScaleY: number = 1 / SHEET_ROWS;
    private updateObserver: Nullable<Observer<B.Scene>> = null;

    private debugArrow: B.LinesMesh | null = null;
    private debugArrowOptions: any;

    constructor(
        name: string,
        scene: B.Scene,
        assetService?: AssetService,
        initialPosition: B.Vector3 = Vector3.Zero()
    ) {
        this.name = name;
        this.scene = scene;
        this.assetService = assetService;

        this.plane = B.MeshBuilder.CreatePlane(`${name}_plane`, { size: 2 }, this.scene);
        this.plane.position = initialPosition.clone();
        this.plane.billboardMode = B.Mesh.BILLBOARDMODE_NONE; // Manual rotation
        this.plane.isPickable = false;
        this.plane.rotationQuaternion = Quaternion.Identity(); // Use Quaternion
        this.plane.visibility = 0;

        this.material = new B.StandardMaterial(`${name}_mat`, this.scene);
        this.material.backFaceCulling = true;
        this.material.disableLighting = false;
        this.material.emissiveColor = new Color3(0.2, 0.2, 0.2);
        this.material.useAlphaFromDiffuseTexture = true;
        this.plane.material = this.material;

        // const forward = new Vector3(0, 0, 1); // local +Z direction
        // const worldForward = Vector3.TransformNormal(forward, this.plane.getWorldMatrix());
        // this.forwardArrowOptions = {
        //     points: [
        //         this.plane.position,
        //         this.plane.position.add(worldForward.scale(0.5))
        //     ],
        //     updatable: true
        // }
        // this.forwardArrow = B.MeshBuilder.CreateLines("arrow", this.forwardArrowOptions, scene);
        // this.forwardArrow.color = Color3.Red();

        this.updateObserver = this.scene.onBeforeRenderObservable.add(this.update);
        console.log(`[SpriteSheetCharacter:${this.name}] Initialized.`);
    }

    public async updateCharacter(spriteSheetUrl: string | null, initialAnimation?: AnimationName): Promise<void> {
        const oldTexture = this.texture;
        if (!spriteSheetUrl) {
            console.log(`[SpriteSheetCharacter:${this.name}] Clearing texture.`);
            this.material.diffuseTexture = null; this.texture = null; this.stopAnimation(); this.plane.visibility = 0;
        } else {
            console.log(`[SpriteSheetCharacter:${this.name}] Updating texture: ${spriteSheetUrl}`);
            try {
                let newTexture: B.Texture | null = null; const scene = this.scene;
                if (this.assetService) { newTexture = await this.assetService.loadTexture(spriteSheetUrl); } // TODO: Use AssetService with options
                else { newTexture = new B.Texture(spriteSheetUrl, scene, false, true, B.Texture.NEAREST_SAMPLINGMODE); } // invertY=true
                if (newTexture) {
                    this.texture = newTexture;
                    this.texture.hasAlpha = true;
                    this.material.diffuseTexture = this.texture;
                    console.log(`[SpriteSheetCharacter:${this.name}] Texture updated.`);
                    if (!this.isAnimationPlaying && initialAnimation) this.setAnimationInternal(initialAnimation, true);
                    this._updateUVs();
                    this.plane.visibility = 1;
                } else { console.error(`[SpriteSheetCharacter:${this.name}] Texture update failed: ${spriteSheetUrl}`); }
            } catch (error) { console.error(`[SpriteSheetCharacter:${this.name}] Error updating texture ${spriteSheetUrl}:`, error); this.texture = null; this.material.diffuseTexture = null; }
        }
        if (oldTexture && oldTexture !== this.texture && !this.assetService) { oldTexture.dispose(); }
    }

    public async updateCharacterTexture(spritesheetTexture: B.Texture, initialAnimation?: AnimationName): Promise<void> {
        const oldTexture = this.texture;
        console.log(`[SpriteSheetCharacter:${this.name}] Updating texture: ${spritesheetTexture.name}`);
        try {
            let newTexture: B.Texture | null = spritesheetTexture;
            if (newTexture) {
                this.texture = newTexture;
                this.texture.hasAlpha = true;
                this.material.diffuseTexture = this.texture;
                console.log(`[SpriteSheetCharacter:${this.name}] Texture updated.`);
                if (!this.isAnimationPlaying && initialAnimation) this.setAnimationInternal(initialAnimation, true);
                this._updateUVs();
                this.plane.visibility = 1;
            } else { console.error(`[SpriteSheetCharacter:${this.name}] Texture update failed: ${spritesheetTexture.name}`); }
        } catch (error) { console.error(`[SpriteSheetCharacter:${this.name}] Error updating texture ${spritesheetTexture.name}:`, error); this.texture = null; this.material.diffuseTexture = null; }
        if (oldTexture && oldTexture !== this.texture && !this.assetService) { oldTexture.dispose(); }
    }

    public stopAnimation(): void { this.isAnimationPlaying = false; }
    public resumeAnimation(): void { this.isAnimationPlaying = true; }
    public setPosition(position: B.Vector3): void { this.plane.position.copyFrom(position); }
    public getPosition(): B.Vector3 { return this.plane.position; }
    public hasTexture(): Boolean { return this.texture !== null; }

    private update = (): void => {
        this.updateCurrentDirection();

        // Sprite Animation
        this.updateAnimationName();
        this.advanceAnimationFrame();
    }

    private updateCurrentDirection(): void {
        const cam = this.scene.activeCamera;
        const charPos = this.plane.position;

        if (!cam || !cam.getViewMatrix() || !this.plane.rotationQuaternion) return;

        const viewDirectionXZ = TmpVectors.Vector3[1];
        cam.globalPosition.subtractToRef(charPos, viewDirectionXZ);
        viewDirectionXZ.y = 0; // Project onto XZ plane

        if (viewDirectionXZ.lengthSquared() < 0.001) {
            // Camera is directly above or below, maintain last rotation or default
            // Or use the character's lookDirection to decide a default facing
            viewDirectionXZ.copyFrom(SpriteSheetCharacter.getDirectionVector(this.lookDirection));
            viewDirectionXZ.negateInPlace(); // Point towards character
            if (viewDirectionXZ.lengthSquared() < 0.001) { viewDirectionXZ.set(0, 0, -1); } // Ultimate fallback
        }
        viewDirectionXZ.normalize(); // Vector FROM character TOWARDS camera (on XZ plane)

        const cameraAngle = Math.atan2(viewDirectionXZ.x, viewDirectionXZ.z);

        // Snap this angle to the nearest 90 degrees (PI/2 radians)
        const snappedAngle = Math.round(cameraAngle / (Math.PI / 2)) * (Math.PI / 2);

        const finalPlaneAngle = snappedAngle + Math.PI;
        Quaternion.RotationYawPitchRollToRef(finalPlaneAngle, 0.1, 0, this.plane.rotationQuaternion);


        const characterLookVector = TmpVectors.Vector3[2]; // Use a different temp vector
        SpriteSheetCharacter.getDirectionVector(this.lookDirection, characterLookVector); // Get the character's intended facing direction

        const dot = Vector3.Dot(characterLookVector, viewDirectionXZ);
        const crossY = characterLookVector.z * viewDirectionXZ.x - characterLookVector.x * viewDirectionXZ.z;
        let relativeAngle = Math.atan2(crossY, dot); // Angle from characterLookVector to viewDirectionXZ (-PI to PI)

        const PI_4 = Math.PI / 4;
        const PI_34 = 3 * Math.PI / 4;
        let newSpriteDirection = this.currentDirection;

        if (relativeAngle >= -PI_4 && relativeAngle < PI_4) {             // Camera is relatively in FRONT of where the character is looking
            newSpriteDirection = CharacterDirection.Down;
        } else if (relativeAngle >= PI_4 && relativeAngle < PI_34) {      // Camera is relatively to the RIGHT
            newSpriteDirection = CharacterDirection.Right;
        } else if (relativeAngle >= PI_34 || relativeAngle < -PI_34) {   // Camera is relatively BEHIND
            newSpriteDirection = CharacterDirection.Up;
        } else { // angle >= -PI_34 && angle < -PI_4                     // Camera is relatively to the LEFT
            newSpriteDirection = CharacterDirection.Left;
        }

        this.currentDirection = newSpriteDirection;

        // // Make the debug arrow represent the characters lookDirection in world space
        // if(this.forwardArrow) {
        //     const logicalForwardWorld = TmpVectors.Vector3[3]; // Use another temp vector
        //     SpriteSheetCharacter.getDirectionVector(this.lookDirection, logicalForwardWorld); // Get the pure world direction vector

        //     // If you want the arrow to rotate with the character's body *rotation* (which we don't set directly anymore based on lookDirection)
        //     // you might need to transform the local forward (0,0,-1 maybe?) by the plane's *current* world matrix.
        //     // However, showing the intended logical direction might be more useful for debugging.
        //      const arrowEnd = this.plane.position.add(logicalForwardWorld.scale(0.5)); // Show logical direction from center

        //      // Check if MeshBuilder.CreateLines needs points array directly or an options object
        //      // Assuming it modifies the instance if 'instance' is provided correctly:
        //      this.forwardArrowOptions.points[0] = this.plane.position; // Update start point in case character moved
        //      this.forwardArrowOptions.points[1] = arrowEnd;
        //      this.forwardArrow = B.MeshBuilder.CreateLines("arrow", {points: this.forwardArrowOptions.points, instance: this.forwardArrow }); // Update existing instance
        // }
    }

    public applyAssetService(assetService: AssetService) {
        this.assetService = assetService;
    }

    public turnAtCamera(): void {
        const cam = this.scene.activeCamera;
        const charPos = this.plane.position;

        if (!cam || !cam.getViewMatrix()) return;

        const viewDirectionXZ = TmpVectors.Vector3[4]; // Use a spare tmp vector
        cam.globalPosition.subtractToRef(charPos, viewDirectionXZ);
        viewDirectionXZ.y = 0;
        if (viewDirectionXZ.lengthSquared() < 0.001) return;

        viewDirectionXZ.normalize();

        const dot = Vector3.Dot(this.plane.forward, viewDirectionXZ);
        const crossY = this.plane.forward.z * viewDirectionXZ.x - this.plane.forward.x * viewDirectionXZ.z;
        let relativeAngle = Math.atan2(crossY, dot); // Angle from characterLookVector to viewDirectionXZ (-PI to PI)

        if (this.plane.rotationQuaternion)
            Quaternion.RotationYawPitchRollToRef(relativeAngle, 0.1, 0, this.plane.rotationQuaternion);

    }

    public lookAtCamera(): void {
        const cam = this.scene.activeCamera;
        const charPos = this.plane.position;

        if (!cam || !cam.getViewMatrix()) return;

        const viewDirectionXZ = TmpVectors.Vector3[4]; // Use a spare tmp vector
        cam.globalPosition.subtractToRef(charPos, viewDirectionXZ);
        viewDirectionXZ.y = 0;
        if (viewDirectionXZ.lengthSquared() < 0.001) return;

        viewDirectionXZ.normalize();

        // Convert direction vector to closest cardinal enum
        const angle = Math.atan2(viewDirectionXZ.x, viewDirectionXZ.z);

        const PI_4 = Math.PI / 4;
        let newDirection: CharacterDirection;

        if (angle >= -PI_4 && angle < PI_4) {
            newDirection = CharacterDirection.Up;
        } else if (angle >= PI_4 && angle < 3 * PI_4) {
            newDirection = CharacterDirection.Right;
        } else if (angle >= -3 * PI_4 && angle < -PI_4) {
            newDirection = CharacterDirection.Left;
        } else {
            newDirection = CharacterDirection.Down;
        }

        this.lookDirection = newDirection;
    }

    public static getDirectionVector(direction: CharacterDirection, resultVector?: Vector3): B.Vector3 {
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

    public static inverseDirection(direction: CharacterDirection): CharacterDirection {
        switch (direction) {
            case CharacterDirection.Up: return CharacterDirection.Down;
            case CharacterDirection.Down: return CharacterDirection.Up;
            case CharacterDirection.Left: return CharacterDirection.Right;
            case CharacterDirection.Right: return CharacterDirection.Left;
            default: return DEFAULT_DIRECTION;
        }
    }

    public static getAngleFromDirection(direction: CharacterDirection): number {
        switch (direction) {
            case CharacterDirection.Up: return 0;          // Face +Z
            case CharacterDirection.Down: return Math.PI;      // Face -Z
            case CharacterDirection.Left: return -Math.PI / 2; // Face -X
            case CharacterDirection.Right: return Math.PI / 2;  // Face +X
            default: return Math.PI;
        }
    }

    private updateAnimationName(forceUpdateUV: boolean = false): void {
        const prefix = this.animationState || 'idle';
        const newAnimationName = `${prefix}_${this.currentDirection}` as AnimationName;
        this.setAnimationInternal(newAnimationName, forceUpdateUV);
    }

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
        if (this.animationState != name.split('_')[0]) { this.currentFrameIndex = 0; this.animationTimer = 0; }
        this.isAnimationPlaying = true;
        this._updateUVs();
    }

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

    private _updateUVs(): void {
        if (!this.texture || !this.currentFullAnimation) return;
        const animDef = ANIMATION_DEFINITIONS[this.currentFullAnimation];
        if (!animDef) return;
        const frameIndexInSequence = this.currentFrameIndex;
        const column = animDef.columnOffset + frameIndexInSequence;
        const row = animDef.startRow;
        const uOffset = column * this.uvScaleX;
        const vOffset = row * this.uvScaleY;
        this.texture.uOffset = uOffset; this.texture.vOffset = vOffset;
        this.texture.uScale = this.uvScaleX; this.texture.vScale = this.uvScaleY;
    }

    public dispose(): void {
        console.log(`[SpriteSheetCharacter:${this.name}] Disposing...`);
        if (this.updateObserver) { this.scene.onBeforeRenderObservable.remove(this.updateObserver); this.updateObserver = null; }
        this.plane.dispose(false, true); this.material.dispose();
        if (this.debugArrow) this.debugArrow.dispose();
        if (!this.assetService && this.texture) { this.texture.dispose(); }
        this.texture = null;
        console.log(`[SpriteSheetCharacter:${this.name}] Disposed.`);
    }
}