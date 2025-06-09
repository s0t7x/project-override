import * as B from '@babylonjs/core';
import { Vector3, TmpVectors, Quaternion } from '@babylonjs/core';
import { ICharacterAppearance } from '@project-override/shared/core/CharacterAppearance';
import { ICharacterSummary } from '@project-override/shared/core/CharacterSummary';
// import { IEquipmentVisual } from '@project-override/shared/core/EquipmentVisual';
import { IColor3 } from '@project-override/shared/math/Color3';

// --- Constants (keep as they are) ---
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

const CHARACTER_SIZE = 2;

export enum CharacterDirection {
    Up = 'up',
    Down = 'down',
    Left = 'left',
    Right = 'right'
}
const DEFAULT_DIRECTION = CharacterDirection.Down;

import { SpriteSheetPlane } from './SpriteSheetPlane';

// ---

export class SpriteSheetCharacter extends SpriteSheetPlane {
    protected multiMaterial: B.MultiMaterial; // Renamed for clarity

    // Use StandardMaterial as created
    protected material_eyes:          B.NodeMaterial;
    protected material_hair:          B.NodeMaterial;
    protected material_equip_legs:    B.NodeMaterial;
    protected material_equip_body:    B.NodeMaterial;

    // Keep separate texture references for each layer
    protected texture_base: B.Texture | null = null;
    protected texture_eyes: B.Texture | null = null;
    protected texture_hair: B.Texture | null = null;
    protected texture_equip_legs: B.Texture | null = null;
    protected texture_equip_body: B.Texture | null = null;

    // Logical view direction
    public lookDirection: CharacterDirection = DEFAULT_DIRECTION;
    protected currentDirection: CharacterDirection = DEFAULT_DIRECTION; // Direction for sprite choice

    // Animation State
    public animationState: string | null = null; // e.g., 'walk', 'idle'
    protected currentFullAnimation: AnimationName = DEFAULT_ANIMATION;
    protected currentFrameIndex: number = 0;
    protected animationTimer: number = 0;
    protected currentFrameDuration: number = BASE_FRAME_DURATION;
    protected isAnimationPlaying: boolean = true;
    public animationSpeed: number = 1;

    protected readonly uvScaleX: number = 1 / SHEET_COLUMNS;
    protected readonly uvScaleY: number = 1 / SHEET_ROWS;

    protected planeSize: number = 2;

    public dummyMesh: B.Mesh | null;

    constructor(
        name: string,
        scene: B.Scene,
        initialPosition: B.Vector3 = Vector3.Zero()
    ) {
        super(name, scene, initialPosition);

        this.dummyMesh = B.MeshBuilder.CreatePlane(`${name}_transformNode`, { size: this.planeSize },this.scene);
        this.dummyMesh.isPickable = false;
        this.dummyMesh.position = initialPosition.clone();
        this.dummyMesh.visibility = 0;

        this.mesh.dispose();
        this.mesh = B.MeshBuilder.CreatePlane(`${name}_plane`, { size: this.planeSize }, this.scene);
        this.mesh.parent = this.dummyMesh;
        this.mesh.position = new B.Vector3(0, 0.1, 0);
        this.mesh.billboardMode = B.Mesh.BILLBOARDMODE_NONE; // Manual rotation
        this.mesh.isPickable = false;
        this.mesh.rotationQuaternion = Quaternion.Identity(); // Use Quaternion
        this.mesh.visibility = 0;

        this.collisionMesh?.dispose();
        this.collisionMesh = B.MeshBuilder.CreateCapsule(`${name}_collision`, { radius: CHARACTER_SIZE * 0.2, height: CHARACTER_SIZE * 0.8, }, this.scene);
        this.collisionMesh.parent = this.dummyMesh;
        this.collisionMesh.isPickable = false;
        this.collisionMesh.visibility = 0;

        // 2. Create Individual Materials for Each Layer
        this.material_eyes = this.createLayerMaterial(`${name}_mat_eyes`, true);
        this.material_hair = this.createLayerMaterial(`${name}_mat_hair`, true);
        this.material_equip_legs = this.createLayerMaterial(`${name}_mat_equip_legs`, true);
        this.material_equip_body = this.createLayerMaterial(`${name}_mat_equip_body`, true);

        // 3. Create the MultiMaterial
        this.multiMaterial = new B.MultiMaterial(`${name}_multimat`, this.scene);
        this.multiMaterial.subMaterials.push(this.material); // Index 0
        this.multiMaterial.subMaterials.push(this.material_eyes); // Index 1
        this.multiMaterial.subMaterials.push(this.material_hair); // Index 2
        this.multiMaterial.subMaterials.push(this.material_equip_legs);
        this.multiMaterial.subMaterials.push(this.material_equip_body);

        // 4. Define SubMeshes
        // A standard plane has 4 vertices and 6 indices (0, 1, 2, 0, 2, 3)
        const vertexCount = 4;
        const indexCount = 6;
        this.mesh.subMeshes = []; // Clear default submesh

        // Create a submesh for each material layer, all covering the entire geometry
        new B.SubMesh(0, 0, vertexCount, 0, indexCount, this.mesh); // For material
        new B.SubMesh(1, 0, vertexCount, 0, indexCount, this.mesh); // For material_eyes
        new B.SubMesh(2, 0, vertexCount, 0, indexCount, this.mesh); // For material_hair
        new B.SubMesh(3, 0, vertexCount, 0, indexCount, this.mesh);
        new B.SubMesh(4, 0, vertexCount, 0, indexCount, this.mesh);

        // 5. Assign the MultiMaterial to the Plane
        this.mesh.material = this.multiMaterial;

        this.updateObserver!.remove();
        this.updateObserver = this.scene.onBeforeRenderObservable.add(this.update);

        console.log(`[SpriteSheetCharacter:${this.name}] Initialized with MultiMaterial.`);
    }

    public enablePhysics(): void {
        if(!this.dummyMesh) return;
        this.dummyMesh.physicsBody = new B.PhysicsBody(
            this.dummyMesh, B.PhysicsMotionType.DYNAMIC, false, this.scene
        );
        this.dummyMesh.physicsBody.setMassProperties({
            mass: 1,
            inertia: new B.Vector3(1e7, 1e7, 1e7)
        });
        this.dummyMesh.physicsBody.setAngularDamping(1000);
        const playerShape = new B.PhysicsShape({
            type: B.PhysicsShapeType.MESH,
            parameters: { mesh: this.collisionMesh },
        }, this.scene);
        this.dummyMesh.physicsBody.shape = playerShape;
    }

    public getTextureURLForIdx(idx: number) {
        // some more nice way pls
        if(idx == 4711) return '/assets/spritesheets/character/dev_base.png'

        return undefined;
    }

    public async applyCustomization(customization: ICharacterAppearance | null) {
        console.log(`[SpriteSheetCharacter:${this.name}] Updating character customization.`);
        // --- Base Layer ---
        if (customization?.bodyIdx) {
            try {
                const textureUrl = this.getTextureURLForIdx(customization.bodyIdx);
                if (!textureUrl) throw Error('naa, no textureUrl for idx ' + customization.bodyIdx);
                let newTexture: B.Texture | null = await this.loadLayerTexture(textureUrl, this.material, "Base");
                if (newTexture) {
                    this.texture_base = newTexture;
                    this.texture_base.hasAlpha = true;
                    // this.material.diffuseTexture = this.texture_base;
                    // this.material.setTexture(HUE_SHIFT_TEXTURE_SAMPLER_NAME, this.texture_base);
                    console.log(`[SpriteSheetCharacter:${this.name}] Base Texture updated.`);
                } else {
                    console.error(`[SpriteSheetCharacter:${this.name}] Base Texture failed to load: ${textureUrl}`);
                    this.texture_base = null;
                    // this.material.diffuseTexture = null;
                    // this.material.setTexture(HUE_SHIFT_TEXTURE_SAMPLER_NAME, null);
                }
            } catch (error) {
                console.error(`[SpriteSheetCharacter:${this.name}] Error loading base texture: ${customization.bodyIdx}`, error);
                this.texture_base = null;
                // this.material.diffuseTexture = null;
                // this.material.setTexture(HUE_SHIFT_TEXTURE_SAMPLER_NAME, null);
            }
        } else {
            this.texture_base = null;
            // this.material.diffuseTexture = null;
            // this.material.setTexture(HUE_SHIFT_TEXTURE_SAMPLER_NAME, null);
            this.texture_base = await this.loadLayerTexture(null, this.material, "Base");
        }

        // --- Hair Layer ---
        if (customization?.hairIdx) {
            try {
                const textureUrl = this.getTextureURLForIdx(customization.hairIdx)
                if (!textureUrl) throw Error('naa, no textureUrl for idx ' + customization.hairIdx);
                let newTexture: B.Texture | null = await this.loadLayerTexture(textureUrl, this.material_hair, "Hair");
                if (newTexture) {
                    this.texture_hair = newTexture;
                    this.texture_hair.hasAlpha = true;
                    // this.material_hair.diffuseTexture = this.texture_hair;
                    // this.material_hair.setTexture(HUE_SHIFT_TEXTURE_SAMPLER_NAME, this.texture_hair);
                    console.log(`[SpriteSheetCharacter:${this.name}] Hair Texture updated.`);
                    this.material_hair.alpha = 1.0;
                } else {
                    console.error(`[SpriteSheetCharacter:${this.name}] Hair Texture failed to load: ${textureUrl}`);
                    this.texture_hair = null;
                    // this.material_hair.diffuseTexture = null;
                    // this.material_hair.setTexture(HUE_SHIFT_TEXTURE_SAMPLER_NAME, null);
                    this.material_hair.alpha = 0.0;
                }
            } catch (error) {
                console.error(`[SpriteSheetCharacter:${this.name}] Error loading hair texture: ${customization.hairIdx}`, error);
                this.texture_hair = null;
                // this.material_hair.diffuseTexture = null;
                // this.material_hair.setTexture(HUE_SHIFT_TEXTURE_SAMPLER_NAME, null);
                this.material_hair.alpha = 0.0;
            }
        } else {
            this.texture_hair = null;
            // this.material_hair.diffuseTexture = null;
            // this.material_hair.setTexture(HUE_SHIFT_TEXTURE_SAMPLER_NAME, null);
            this.material_hair.alpha = 0.0;
            this.texture_hair = await this.loadLayerTexture(null, this.material_hair, "Hair");
        }

        // // --- Eyes Layer (Add similarly if needed) ---
        // if (customization?.eyesSpriteSheet && customization?.eyesSpriteSheet.length > 0) {
        //     try {
        //         const textureUrl = customization.eyesSpriteSheet;
        //         let newTexture: B.Texture | null = await this.loadLayerTexture(customization?.eyesSpriteSheet, this.material_eyes, "Eyes");
        //         if (newTexture) {
        //             this.texture_eyes = newTexture;
        //             this.texture_eyes.hasAlpha = true;
        //             // this.material_eyes.diffuseTexture = this.texture_eyes;
        //             // this.material_eyes.setTexture(HUE_SHIFT_TEXTURE_SAMPLER_NAME, this.texture_eyes);
        //             console.log(`[SpriteSheetCharacter:${this.name}] Eyes Texture updated.`);
        //             this.material_eyes.alpha = 1.0;
        //         } else {
        //             console.error(`[SpriteSheetCharacter:${this.name}] Eyes Texture failed to load: ${textureUrl}`);
        //             this.texture_eyes = null;
        //             // this.material_eyes.diffuseTexture = null;
        //             // this.material_eyes.setTexture(HUE_SHIFT_TEXTURE_SAMPLER_NAME, null);
        //             this.material_eyes.alpha = 0.0;
        //         }
        //     } catch (error) {
        //         console.error(`[SpriteSheetCharacter:${this.name}] Error loading eyes texture: ${customization.eyesSpriteSheet}`, error);
        //         this.texture_eyes = null;
        //         // this.material_eyes.diffuseTexture = null;
        //         // this.material_eyes.setTexture(HUE_SHIFT_TEXTURE_SAMPLER_NAME, null);
        //         this.material_eyes.alpha = 0.0;
        //     }
        // } else {
        //     this.texture_eyes = null;
        //     // this.material_eyes.diffuseTexture = null;
        //     // this.material_eyes.setTexture(HUE_SHIFT_TEXTURE_SAMPLER_NAME, null);
        //     this.material_eyes.alpha = 0.0;
        //     this.texture_eyes = await this.loadLayerTexture(null, this.material_eyes, "Eyes");
        // }

        // Apply hue shift if needed (requires custom shader or node material)
        if (customization) {
            // this.applyHueShift(this.material, customization?.baseHue);
            // this.applyHueShift(this.material_eyes, customization?.eyesHue);
            // this.applyHueShift(this.material_hair, customization?.hairHue);
            if(customization.bodyColor) this.colorizeBase(customization.bodyColor)
            if(customization.hairColor) this.colorizeHair(customization.hairColor)
            if(customization.eyesColor) this.colorizeEyes(customization.eyesColor)
        }
    }

    // public async applyEquipmentVisuals(equipmentVisuals: IEquipmentVisual[] | null) {
    //  console.log(`[SpriteSheetCharacter:${this.name}] Updating character equipment visuals.`);
    //     // -- Body
    //     if (equipmentVisuals?.bodySpriteSheet) {
    //         try {
    //             const textureUrl = equipmentVisuals.bodySpriteSheet;
    //             let newTexture: B.Texture | null = await this.loadLayerTexture(textureUrl, this.material_equip_body, "Body");
    //             if (newTexture) {
    //                 this.texture_equip_body = newTexture;
    //                 this.texture_equip_body.hasAlpha = true;
    //                 console.log(`[SpriteSheetCharacter:${this.name}] Equipment Body Texture updated.`);
    //             } else {
    //                 console.error(`[SpriteSheetCharacter:${this.name}] Equipment Body Texture failed to load: ${textureUrl}`);
    //                 this.texture_equip_body = null;
    //             }
    //         } catch (error) {
    //             console.error(`[SpriteSheetCharacter:${this.name}] Error loading Equipment Body texture: ${equipmentVisuals.bodySpriteSheet}`, error);
    //             this.texture_equip_body = null;
    //         }
    //     } else {
    //         this.texture_equip_body = null;
    //         this.texture_equip_body = await this.loadLayerTexture(null, this.material_equip_body, "Body");
    //     }

    //     // -- Legs
    //     if (equipmentVisuals?.legsSpriteSheet) {
    //         try {
    //             const textureUrl = equipmentVisuals.legsSpriteSheet;
    //             let newTexture: B.Texture | null = await this.loadLayerTexture(textureUrl, this.material_equip_legs, "Legs");
    //             if (newTexture) {
    //                 this.texture_equip_legs = newTexture;
    //                 this.texture_equip_legs.hasAlpha = true;
    //                 console.log(`[SpriteSheetCharacter:${this.name}] Equipment Legs Texture updated.`);
    //             } else {
    //                 console.error(`[SpriteSheetCharacter:${this.name}] Equipment Legs Texture failed to load: ${textureUrl}`);
    //                 this.texture_equip_legs = null;
    //             }
    //         } catch (error) {
    //             console.error(`[SpriteSheetCharacter:${this.name}] Error loading Equipment Legs texture: ${equipmentVisuals.legsSpriteSheet}`, error);
    //             this.texture_equip_legs = null;
    //         }
    //     } else {
    //         this.texture_equip_legs = null;
    //         this.texture_equip_legs = await this.loadLayerTexture(null, this.material_equip_legs, "Legs");
    //     }

    //     if (equipmentVisuals) {
    //         this.colorize(this.material_equip_body, equipmentVisuals?.bodyColor)
    //         this.applyHueShift(this.material_equip_body, equipmentVisuals?.bodyHueShift || 0)
    //         this.colorize(this.material_equip_legs, equipmentVisuals?.legsColor)
    //         this.applyHueShift(this.material_equip_legs, equipmentVisuals?.legsHueShift || 0)
    //     }
    // }

    public async setCharacter(characterSummary: ICharacterSummary | null, initialAnimation?: AnimationName) {
        // --- Final Setup ---
        if (characterSummary) { // Require at least a base texture to be visible
            // Set initial animation state if provided or default
            await this.applyCustomization(characterSummary.appearance || null);
            // await this.applyEquipmentVisuals(characterSummary.equipmentVisuals || null);
            if(this.texture_base) {
                this.setAnimationInternal(initialAnimation || this.currentFullAnimation || DEFAULT_ANIMATION, true); // Force UV update
                this.mesh.visibility = 1;
                console.log(`[SpriteSheetCharacter:${this.name}] Character setup complete. Visible.`);
                return;
            }
        }
        this.mesh.visibility = 0;
        this.stopAnimation();
        console.log(`[SpriteSheetCharacter:${this.name}] No base texture or character summary. Hidden.`);
    }

    public colorizeBase(color: IColor3, strength: number = 255.0): void {
        if (!this.material) return;
        this.colorize(this.material, color, strength);
    }

    public colorizeEyes(color: IColor3, strength: number = 255.0): void {
        if (!this.material_eyes) return;
        this.colorize(this.material_eyes, color, strength);
    }

    public colorizeHair(color: IColor3, strength: number = 255.0): void {
        if (!this.material_hair) return;
        this.colorize(this.material_hair, color, strength);
    }

    public stopAnimation(): void { this.isAnimationPlaying = false; }
    public resumeAnimation(): void { this.isAnimationPlaying = true; }
    public setPosition(position: B.Vector3): void { this.mesh.position.copyFrom(position); }
    public getPosition(): B.Vector3 { return this.mesh.position; }
    public hasTexture(): boolean { return this.texture_base !== null; } // Check base texture

    protected update = (): void => {
        // Only update if visible and has a base texture
        if (this.mesh.visibility === 0 || !this.texture_base) {
            return;
        }

        this.updateCurrentDirection();

        // Sprite Animation
        this.updateAnimationName(); // Determine correct animation based on state and direction
        this.advanceAnimationFrame(); // Advance frame if playing
    }

    // --- Direction Logic (Keep as is, seems fine) ---
    protected updateCurrentDirection(): void {
        const cam = this.scene.activeCamera;
        const charPos = this.mesh.position;

        if (!cam || !cam.getViewMatrix() || !this.mesh.rotationQuaternion) return;

        // Use temporary vectors from the pool
        const viewDirectionXZ = TmpVectors.Vector3[0]; // Use index 0
        cam.getForwardRay(999, undefined, charPos).direction.scaleToRef(-1, viewDirectionXZ); // More direct way to get view dir towards point
        viewDirectionXZ.y = 0; // Project onto XZ plane


        if (viewDirectionXZ.lengthSquared() < 0.001) {
            // Camera is directly above or below, use lookDirection
            SpriteSheetCharacter.getDirectionVector(this.lookDirection, viewDirectionXZ);
            if (viewDirectionXZ.lengthSquared() < 0.001) { viewDirectionXZ.set(0, 0, -1); } // Ultimate fallback if lookDirection is zero?
        }
        viewDirectionXZ.normalize(); // Vector FROM character TOWARDS camera (on XZ plane)

        const cameraAngle = Math.atan2(viewDirectionXZ.x, viewDirectionXZ.z);

        // --- Rotation ---
        if (this.billboard) {
            // Simple billboard (face camera directly on Y axis)
            const angleToCamera = cameraAngle + Math.PI
            Quaternion.RotationYawPitchRollToRef(angleToCamera, 0, 0, this.mesh.rotationQuaternion);
        } else {
            const targetAngle = Math.round(cameraAngle / (Math.PI / 2)) * (Math.PI / 2) + Math.PI;
            Quaternion.RotationYawPitchRollToRef(targetAngle, 0, 0, this.mesh.rotationQuaternion); // Directly set rotation based on lookDirection
        }

        const characterLookVector = TmpVectors.Vector3[1]; // Use index 1
        SpriteSheetCharacter.getDirectionVector(this.lookDirection, characterLookVector);

        // Calculate angle between where character is looking and the camera direction
        const dot = Vector3.Dot(characterLookVector, viewDirectionXZ);
        const crossY = characterLookVector.z * viewDirectionXZ.x - characterLookVector.x * viewDirectionXZ.z; // Cross product Y component
        let relativeAngle = Math.atan2(crossY, dot); // Angle from characterLookVector to viewDirectionXZ (-PI to PI)

        const PI_4 = Math.PI / 4;
        const PI_34 = 3 * Math.PI / 4;
        let newSpriteDirection = this.currentDirection;

        // Determine sprite based on camera relative angle
        if (relativeAngle >= -PI_4 && relativeAngle < PI_4) {
            newSpriteDirection = CharacterDirection.Down; // Camera is in front
        } else if (relativeAngle >= PI_4 && relativeAngle < PI_34) {
            newSpriteDirection = CharacterDirection.Right; // Camera is to the right
        } else if (relativeAngle >= PI_34 || relativeAngle < -PI_34) {
            newSpriteDirection = CharacterDirection.Up;   // Camera is behind
        } else { // angle >= -PI_34 && angle < -PI_4
            newSpriteDirection = CharacterDirection.Left;  // Camera is to the left
        }


        // Only trigger animation change if the sprite direction changes
        if (newSpriteDirection !== this.currentDirection) {
            this.currentDirection = newSpriteDirection;
            // Don't call _updateUVs directly here, let updateAnimationName handle it
            this.updateAnimationName(true); // Force update if direction changes animation
        }
    }

    public turnAtCamera(): void {
        const cam = this.scene.activeCamera;
        const charPos = this.mesh.position;

        if (!cam || !cam.getViewMatrix()) return;

        const viewDirectionXZ = TmpVectors.Vector3[4]; // Use a spare tmp vector
        cam.globalPosition.subtractToRef(charPos, viewDirectionXZ);
        viewDirectionXZ.y = 0;
        if (viewDirectionXZ.lengthSquared() < 0.001) return;

        viewDirectionXZ.normalize();

        const dot = Vector3.Dot(this.mesh.forward, viewDirectionXZ);
        const crossY = this.mesh.forward.z * viewDirectionXZ.x - this.mesh.forward.x * viewDirectionXZ.z;
        let relativeAngle = Math.atan2(crossY, dot); // Angle from characterLookVector to viewDirectionXZ (-PI to PI)

        if (this.mesh.rotationQuaternion)
            Quaternion.RotationYawPitchRollToRef(relativeAngle, 0.1, 0, this.mesh.rotationQuaternion);

    }

    public lookAtCamera(): void {
        const cam = this.scene.activeCamera;
        const charPos = this.mesh.position;

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

    public updateAnimationName(forceUpdateUV: boolean = false): void {
        // Determine the correct animation name based on the current state (e.g., 'walk') and sprite direction (e.g., 'left')
        const prefix = this.animationState || 'idle';
        const newAnimationName = `${prefix}_${this.currentDirection}` as AnimationName;

        // Update the animation only if the name actually changes, or if forced
        this.setAnimationInternal(newAnimationName, forceUpdateUV);
    }

    protected setAnimationInternal(name: AnimationName, forceUpdateUV: boolean = false): void {
        // Find the animation definition
        let animDef = ANIMATION_DEFINITIONS[name];
        if (!animDef) {
            console.warn(`[SpriteSheetCharacter:${this.name}] Animation definition not found for "${name}". Falling back to default.`);
            name = DEFAULT_ANIMATION;
            animDef = ANIMATION_DEFINITIONS[name];
            if (!animDef) {
                console.error(`[SpriteSheetCharacter:${this.name}] Default animation ${DEFAULT_ANIMATION} definition missing! Cannot set animation.`);
                this.stopAnimation();
                return;
            }
        }

        const nameChanged = this.currentFullAnimation !== name;

        // If the animation name hasn't changed and we're not forcing an update,
        // just ensure it's playing (if it wasn't already).
        if (!nameChanged && !forceUpdateUV) {
            if (!this.isAnimationPlaying) {
                this.resumeAnimation();
            }
            return;
        }

        // console.log(`[DEBUG Anim] SetAnimInternal: UPDATING Animation from ${this.currentFullAnimation} to ${name}`);
        this.currentFullAnimation = name;
        this.currentFrameDuration = (animDef.durationMultiplier || 1.0) * BASE_FRAME_DURATION * (1/this.animationSpeed);

        // Reset frame index and timer only if the base animation type changes (e.g., 'walk' to 'idle')
        const currentPrefix = this.currentFullAnimation.split('_')[0];
        if (this.animationState !== currentPrefix) {
            this.currentFrameIndex = 0;
            this.animationTimer = 0;
            // No need to set this.animationState here, it's set externally
        } else {
            // If only direction changed (e.g., 'walk_left' to 'walk_right'),
            // keep the current frame index if it's valid for the new direction's animation
            // This prevents animation "jumps" when turning while walking.
            if (this.currentFrameIndex >= animDef.frames) {
                this.currentFrameIndex = 0; // Reset if index is out of bounds for the new direction
                this.animationTimer = 0;
            }
        }


        this.resumeAnimation(); // Ensure animation plays
        this._updateUVs(); // Update UVs immediately for the new animation/frame
    }


    protected advanceAnimationFrame(): void {
        if (!this.isAnimationPlaying || !this.currentFullAnimation || !this.scene) return;

        // Check if we have textures to animate
        if (!this.texture_base && !this.texture_eyes && !this.texture_hair) {
            return;
        }

        const animDef = ANIMATION_DEFINITIONS[this.currentFullAnimation];
        if (!animDef || animDef.frames <= 1) { // No animation if definition missing or only 1 frame
            // If it's a single frame animation, ensure the UVs are set correctly once
            if (this.currentFrameIndex !== 0) {
                this.currentFrameIndex = 0;
                this._updateUVs();
            }
            this.stopAnimation(); // Stop timer for single-frame "animations"
            return;
        }


        const deltaTime = this.scene.getEngine().getDeltaTime() / 1000.0;
        this.animationTimer += deltaTime;

        if (this.animationTimer >= this.currentFrameDuration) {
            // Use while loop in case delta time is very large / frame rate very low
            while (this.animationTimer >= this.currentFrameDuration) {
                this.animationTimer -= this.currentFrameDuration;
                this.currentFrameIndex = (this.currentFrameIndex + 1) % animDef.frames;
            }
            this._updateUVs(); // Update UVs only when the frame actually changes
        }
    }


    // Corrected UV Update
    protected _updateUVs(): void {
        const animDef = ANIMATION_DEFINITIONS[this.currentFullAnimation];
        // Ensure we have an animation definition and at least one texture exists
        if (!animDef || (!this.texture_base && !this.texture_eyes && !this.texture_hair)) {
            // console.warn(`[SpriteSheetCharacter:${this.name}] Cannot update UVs. AnimDef: ${!!animDef}, BaseTex: ${!!this.texture_base}`);
            return;
        }

        // Ensure frame index is valid
        const frameIndexInSequence = this.currentFrameIndex % animDef.frames;

        const column = animDef.columnOffset + frameIndexInSequence;
        const row = animDef.startRow; // Assuming row is constant for the animation sequence

        // Calculate UV coordinates (bottom-left corner of the frame)
        const uOffset = column * this.uvScaleX;
        // V coordinate needs care: Texture origin (0,0) is often bottom-left, but UV origin is top-left for meshes.
        // If your sprite sheet rows count from top (0) to bottom (SHEET_ROWS - 1):
        // const vOffset = (SHEET_ROWS - 1 - row) * this.uvScaleY;
        // If your sprite sheet rows count from bottom (0) to top (SHEET_ROWS - 1) **OR**
        // if you are using Texture InvertY=true (default for many loaders), then:
        const vOffset = row * this.uvScaleY;


        // Apply the same UV offset and scale to all *existing* layer textures
        if (this.texture_base) {
            this.texture_base.uOffset = uOffset;
            this.texture_base.vOffset = vOffset;
            this.texture_base.uScale = this.uvScaleX;
            this.texture_base.vScale = this.uvScaleY;
        }
        if (this.texture_eyes) {
            this.texture_eyes.uOffset = uOffset;
            this.texture_eyes.vOffset = vOffset;
            this.texture_eyes.uScale = this.uvScaleX;
            this.texture_eyes.vScale = this.uvScaleY;
        }
        if (this.texture_hair) {
            this.texture_hair.uOffset = uOffset;
            this.texture_hair.vOffset = vOffset;
            this.texture_hair.uScale = this.uvScaleX;
            this.texture_hair.vScale = this.uvScaleY;
        }
        if (this.texture_equip_body) {
            this.texture_equip_body.uOffset = uOffset;
            this.texture_equip_body.vOffset = vOffset;
            this.texture_equip_body.uScale = this.uvScaleX;
            this.texture_equip_body.vScale = this.uvScaleY;
        }
        if (this.texture_equip_legs) {
            this.texture_equip_legs.uOffset = uOffset;
            this.texture_equip_legs.vOffset = vOffset;
            this.texture_equip_legs.uScale = this.uvScaleX;
            this.texture_equip_legs.vScale = this.uvScaleY;
        }
        // console.log(`[UV Update ${this.name}] Anim: ${this.currentFullAnimation}, Frame: ${this.currentFrameIndex}, UVs: (${uOffset.toFixed(2)}, ${vOffset.toFixed(2)}), Scale: (${this.uvScaleX.toFixed(2)}, ${this.uvScaleY.toFixed(2)})`);
    }


    public dispose(): void {
        console.log(`[SpriteSheetCharacter:${this.name}] Disposing...`);
        if (this.updateObserver) {
            this.scene.onBeforeRenderObservable.remove(this.updateObserver);
            this.updateObserver = null;
        }
        // Dispose mesh and materials
        this.mesh.dispose(false, true); // Dispose geometry and children, but not materials yet
        this.multiMaterial.dispose(true); // Dispose multimaterial and its submaterials
        // this.material.dispose(); // Already disposed by multiMaterial.dispose(true)
        // this.material_eyes.dispose();
        // this.material_hair.dispose();

        // Dispose textures if not managed by AssetService
        if (!this.assetService) {
            this.texture_base?.dispose();
            this.texture_eyes?.dispose();
            this.texture_hair?.dispose();
        }
        this.texture_base = null;
        this.texture_eyes = null;
        this.texture_hair = null;


        // if (this.debugArrow) this.debugArrow.dispose(); // Dispose debug arrow if used

        console.log(`[SpriteSheetCharacter:${this.name}] Disposed.`);
    }
}