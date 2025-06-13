import { AssetService } from '@/services/AssetService';
import { useServiceStore } from '@/stores/ServiceStore';
import * as B from '@babylonjs/core';
import { Vector3, TmpVectors, Observer, Nullable, Quaternion, Color3, Texture} from '@babylonjs/core';
import * as HueShiftSpriteMaterialSnippet from "../materials/HueShiftSpriteMaterial.json"
import { IColor3 } from '@project-override/shared/math/Color3';

const HUE_SHIFT_TEXTURE_SAMPLER_NAME = "diffuseTexture";
const HUE_SHIFT_UNIFORM_NAME = "hueShift";

export const SPRITE_PLANE_LAYER = 0x1;

// ---

export class SpriteSheetPlane {
    protected scene: B.Scene;
    protected assetService?: AssetService;
    public name: string;
    public mesh: B.Mesh;
    public collisionMesh: B.Mesh;
    protected material: B.NodeMaterial; // Renamed for clarity
    protected texture: B.Texture | null = null;
    protected planeSize: number = 1;
    
    protected updateObserver: Nullable<Observer<B.Scene>> = null;

    protected static baseHueShiftMaterial: Nullable<B.NodeMaterial> = null;

    public billboard: boolean = false;

    constructor(
        name: string,
        scene: B.Scene,
        initialPosition: B.Vector3 = Vector3.Zero(),
        planeSize: B.Vector2 = new B.Vector2(1, 1)
    ) {
        this.name = name;
        this.scene = scene;
        this.planeSize = 1.0;
        this.assetService = useServiceStore.getState().assetService || undefined;

        if (!SpriteSheetPlane.baseHueShiftMaterial) {
            const parsedMaterial = B.NodeMaterial.Parse(HueShiftSpriteMaterialSnippet, this.scene)
            parsedMaterial.backFaceCulling = false;
            // parsedMaterial.alphaMode = B.Engine.TEST_AL;
            // Store the parsed material
            SpriteSheetPlane.baseHueShiftMaterial = parsedMaterial;
            console.log("[SpriteSheetPlane] Base hue shift NodeMaterial loaded.");
        }

        this.mesh = B.MeshBuilder.CreatePlane(`${name}_plane`, { size: this.planeSize }, this.scene);
        this.mesh.position = initialPosition.clone();
        this.mesh.billboardMode = B.Mesh.BILLBOARDMODE_NONE; // Manual rotation
        this.mesh.isPickable = false;
        this.mesh.rotationQuaternion = Quaternion.Identity(); // Use Quaternion
        this.mesh.visibility = 0;
        this.mesh.receiveShadows = true;
        this.mesh.layerMask = SPRITE_PLANE_LAYER;
        // this.mesh.renderingGroupId = 1;
        this.mesh.scaling = new Vector3(planeSize.x, planeSize.y, 1.0);

        this.collisionMesh = B.MeshBuilder.CreateBox(`${name}_collision`, { size: this.planeSize }, this.scene);
        this.collisionMesh.parent = this.mesh;
        this.collisionMesh.isPickable = false;
        this.collisionMesh.visibility = 0;

        this.material = this.createLayerMaterial(`${name}_mat_base`, false);

        this.mesh.material = this.material;

        this.updateObserver = this.scene.onBeforeRenderObservable.add(this.update);
    }


    protected createLayerMaterial(name: string, disableDepthWrite: boolean): B.NodeMaterial {
        if (!SpriteSheetPlane.baseHueShiftMaterial) {
            // Handle case where material isn't loaded yet (important!)
            console.error(`[${name}] Base NodeMaterial not ready!`);
            // Return a temporary placeholder or throw error
            // ... (Placeholder logic from previous answer) ...
            const dummyMat = new B.StandardMaterial(name + "_dummy", this.scene);
            dummyMat.emissiveColor = Color3.Magenta();
            return dummyMat as any;
        }

        const material = SpriteSheetPlane.baseHueShiftMaterial.clone(name);

        // Apply instance-specific settings
        material.disableDepthWrite = disableDepthWrite;
        material.alpha = 0.0; // Start invisible
        
        // Initialize texture sampler to null
        const samplerBlock = material.getBlockByName(HUE_SHIFT_TEXTURE_SAMPLER_NAME) as Nullable<B.TextureBlock>;
        if (samplerBlock) {
            samplerBlock.texture = null; // <<< Set the .texture property of the block
        } else {
            console.warn(`[${name}] Sampler block '${HUE_SHIFT_TEXTURE_SAMPLER_NAME}' not found during init.`);
        }

        // Initialize hue shift uniform to 0
        const inputBlock = material.getBlockByName(HUE_SHIFT_UNIFORM_NAME) as Nullable<B.InputBlock>;
        if (inputBlock) {
            inputBlock.value = 0;
        }

        return material;
    }

    // --- Helper function using NodeMaterial specifics ---
    protected async loadLayerTexture(
        textureUrl: string | undefined | null,
        material: B.NodeMaterial,
        layerName: string
    ): Promise<Texture | null> {

        const samplerBlock = material.getBlockByName(HUE_SHIFT_TEXTURE_SAMPLER_NAME) as Nullable<B.TextureBlock>;
        if (!samplerBlock) {
            console.error(`[${this.name}] Cannot find sampler block '${HUE_SHIFT_TEXTURE_SAMPLER_NAME}' in material ${material.name}`);
            material.alpha = 0.0;
            return null;
        }
        // We don't necessarily need currentTexture ref here unless managing disposal carefully
        // let currentTexture: Texture | null = samplerBlock.texture ?? null;

        if (textureUrl && textureUrl.length > 0) {
            // --- Texture URL Provided ---
            // if((process as any).resourcesPath && !textureUrl.startsWith("http")) textureUrl = (process as any).resourcesPath + '/app' + textureUrl;
            try {
                let newTexture: B.Texture | null = null;
                let currentTextureInBlock = samplerBlock.texture; // Get texture currently in block
                const needsLoading = !currentTextureInBlock || currentTextureInBlock.url !== textureUrl;

                if (needsLoading) {
                    if (this.assetService) {
                        newTexture = await this.assetService.loadTexture(textureUrl);
                    } else {
                        // Dispose old manually ONLY if it exists and we loaded it (not from asset service)
                        currentTextureInBlock?.dispose();
                        newTexture = new B.Texture(textureUrl, this.scene, false, true, B.Texture.NEAREST_SAMPLINGMODE);
                    }
                } else {
                    newTexture = currentTextureInBlock; // Reuse existing texture
                }

                if (newTexture) {
                    newTexture.hasAlpha = true;
                    // --- CORRECT WAY to assign the texture ---
                    samplerBlock.texture = newTexture; // <<< Assign to the block's .texture property
                    material.alpha = 1.0;
                    console.log(`[SpriteSheetPlane:${this.name}] ${layerName} Texture updated: ${textureUrl}`);
                    // needsUVUpdate = true; // Flag this in setCharacter if needed
                    return newTexture;
                } else {
                    // Loading failed
                    console.error(`[SpriteSheetPlane:${this.name}] ${layerName} Texture failed to load: ${textureUrl}`);
                    if (needsLoading && !this.assetService) currentTextureInBlock?.dispose(); // Dispose if manually loaded
                    // --- CORRECT WAY to set null texture ---
                    samplerBlock.texture = null; // <<< Set block's texture to null
                    material.alpha = 0.0;
                    return null;
                } 
            } catch (error) {
                // Error during loading
                console.error(`[SpriteSheetPlane:${this.name}] Error loading ${layerName} texture: ${textureUrl}`, error);
                // Consider if currentTextureInBlock needs disposal here based on needsLoading/assetService
                // --- CORRECT WAY to set null texture ---
                samplerBlock.texture = null; // <<< Set block's texture to null
                material.alpha = 0.0;
                return null;
            }
        } else {
            // --- No Texture URL Provided ---
            let currentTextureInBlock = samplerBlock.texture;
            if (currentTextureInBlock && !this.assetService) {
                currentTextureInBlock.dispose();
            }
            // --- CORRECT WAY to set null texture ---
            samplerBlock.texture = null; // <<< Set block's texture to null
            material.alpha = 0.0;
            console.log(`[SpriteSheetPlane:${this.name}] ${layerName} Texture set to null. Material alpha = 0.`);
            return null;
        }
    }

    public async applyTexture(url: string | null) {
        console.log(`[SpriteSheetPlane:${this.name}] Updating character customization.`);
        if (url) {
            try {
                const textureUrl = url;
                if (!textureUrl) throw Error('naa, for ' + url);
                let newTexture: B.Texture | null = await this.loadLayerTexture(textureUrl, this.material, "Hair");
                if (newTexture) {
                    this.texture = newTexture;
                    this.texture.hasAlpha = true;
                    // this.material.diffuseTexture = this.texture;
                    // this.material.setTexture(HUE_SHIFT_TEXTURE_SAMPLER_NAME, this.texture);
                    console.log(`[SpriteSheetPlane:${this.name}] Hair Texture updated.`);
                    this.material.alpha = 1.0;
                } else {
                    console.error(`[SpriteSheetPlane:${this.name}] Hair Texture failed to load: ${textureUrl}`);
                    this.texture = null;
                    // this.material.diffuseTexture = null;
                    // this.material.setTexture(HUE_SHIFT_TEXTURE_SAMPLER_NAME, null);
                    this.material.alpha = 0.0;
                }
                this.mesh.visibility = 1;
            } catch (error) {
                console.error(`[SpriteSheetPlane:${this.name}] Error loading hair texture: ${url}`, error);
                this.texture = null;
                // this.material.diffuseTexture = null;
                // this.material.setTexture(HUE_SHIFT_TEXTURE_SAMPLER_NAME, null);
                this.material.alpha = 0.0;
            }
        } else {
            this.texture = null;
            // this.material.diffuseTexture = null;
            // this.material.setTexture(HUE_SHIFT_TEXTURE_SAMPLER_NAME, null);
            this.material.alpha = 0.0;
            this.texture = await this.loadLayerTexture(null, this.material, "Hair");
        }
    }

    public applyHueShift(material: B.NodeMaterial, hue: number): void {
        const inputBlock = material.getBlockByName(HUE_SHIFT_UNIFORM_NAME) as Nullable<B.InputBlock>;
        if (inputBlock) {
            inputBlock.value = hue;
        }
    }

    public colorize(material: B.NodeMaterial, color: IColor3, strength: number = 255.0): void {
        if(!material || !color) return;
        if(color.r + color.g + color.b == 0) return; // it never gets truly black but who the fuck will see anyway :)
        const inputBlock = material.getBlockByName("targetColor") as Nullable<B.InputBlock>;
        if (inputBlock) {
            inputBlock.value = new B.Color4(color.r, color.g, color.b, strength);
        }
    }


    /**
     * Enables shadows for this character.
     * 
     * IMPORTANT: The provided 'shadowGenerator' should be a special generator whose light
     * is configured with `light.excludeWithLayerMask = SPRITE_PLANE_LAYER`.
     * This ensures the character's collision mesh casts shadows on the environment
     * but NOT on its own sprite plane.
     *
     * @param characterShadowGenerator The shadow generator dedicated to characters.
     */
    public enableShadows(characterShadowGenerator: B.ShadowGenerator): void {        
        // Add the invisible collision mesh to the character-specific shadow caster list.
        characterShadowGenerator.addShadowCaster(this.collisionMesh);
        
        this.mesh.receiveShadows = true;
        
        console.log(`[${this.name}] Shadow setup complete.`);
    }


    public enablePhysics(): void {
        this.mesh.physicsBody = new B.PhysicsBody(
            this.mesh, B.PhysicsMotionType.DYNAMIC, false, this.scene
        );
        this.mesh.physicsBody.setMassProperties({
            mass: 2,
            inertia: new B.Vector3(1e7, 0.5, 1e7),
        });
        this.mesh.physicsBody.setAngularDamping(1000);
        const playerShape = new B.PhysicsShape({
            type: B.PhysicsShapeType.MESH,
            parameters: { mesh: this.collisionMesh },
        }, this.scene);
        this.mesh.physicsBody.shape = playerShape;
    }

    public setPosition(position: B.Vector3): void { this.mesh.position.copyFrom(position); }
    public getPosition(): B.Vector3 { return this.mesh.position; }
    public hasTexture(): boolean { return this.texture !== null; } // Check base texture

    protected update = (): void => {
        // Only update if visible and has a base texture
        if (this.mesh.visibility === 0 || !this.texture) {
            return;
        }

        this.updateCurrentDirection();
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
    }

    public applyAssetService(assetService: AssetService) {
        this.assetService = assetService;
        // Potentially reload textures if needed, or just use it for future loads
    }

    public dispose(): void {
        console.log(`[SpriteSheetPlane:${this.name}] Disposing...`);
        if (this.updateObserver) {
            this.scene.onBeforeRenderObservable.remove(this.updateObserver);
            this.updateObserver = null;
        }
        // Dispose mesh and materials
        this.mesh.dispose(false, true);
        this.material.dispose(true);

        // Dispose textures if not managed by AssetService
        if (!this.assetService) {
            this.texture?.dispose();
        }
        this.texture = null;


        // if (this.debugArrow) this.debugArrow.dispose(); // Dispose debug arrow if used

        console.log(`[SpriteSheetPlane:${this.name}] Disposed.`);
    }
}