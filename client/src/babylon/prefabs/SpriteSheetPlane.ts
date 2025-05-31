import { AssetService } from '@/services/AssetService';
import { useServiceStore } from '@/stores/ServiceStore';
import * as B from '@babylonjs/core';
import { Vector3, TmpVectors, Observer, Nullable, Quaternion, Color3, Texture} from '@babylonjs/core';
import * as HueShiftSpriteMaterialSnippet from "../materials/HueShiftSpriteMaterial.json"

const HUE_SHIFT_TEXTURE_SAMPLER_NAME = "diffuseTexture";
const HUE_SHIFT_UNIFORM_NAME = "hueShift";

// ---

export class SpriteSheetPlane {
    private scene: B.Scene;
    private assetService?: AssetService;
    public name: string;
    public plane: B.Mesh;
    private material: B.NodeMaterial; // Renamed for clarity
    private texture: B.Texture | null = null;
    
    private updateObserver: Nullable<Observer<B.Scene>> = null;

    private static baseHueShiftMaterial: Nullable<B.NodeMaterial> = null;

    public billboard: boolean = false;

    constructor(
        name: string,
        scene: B.Scene,
        initialPosition: B.Vector3 = Vector3.Zero()
    ) {
        this.name = name;
        this.scene = scene;
        this.assetService = useServiceStore.getState().assetService || undefined;

        if (!SpriteSheetPlane.baseHueShiftMaterial) {
            const parsedMaterial = B.NodeMaterial.Parse(HueShiftSpriteMaterialSnippet, this.scene)
            parsedMaterial.backFaceCulling = false;
            parsedMaterial.alphaMode = B.Engine.ALPHA_COMBINE;
            // Store the parsed material
            SpriteSheetPlane.baseHueShiftMaterial = parsedMaterial;
            console.log("[SpriteSheetPlane] Base hue shift NodeMaterial loaded.");
        }

          // 1. Create the Plane Mesh
        this.plane = B.MeshBuilder.CreatePlane(`${name}_plane`, { size: 1 }, this.scene);
        this.plane.position = initialPosition.clone();
        this.plane.billboardMode = B.Mesh.BILLBOARDMODE_NONE; // Manual rotation
        this.plane.isPickable = false;
        this.plane.rotationQuaternion = Quaternion.Identity(); // Use Quaternion
        this.plane.visibility = 0;

        this.material = this.createLayerMaterial(`${name}_mat_base`, false);

        this.plane.material = this.material;

        this.updateObserver = this.scene.onBeforeRenderObservable.add(this.update);
        console.log(`[SpriteSheetPlane:${this.name}] Initialized with MultiMaterial.`);
    }

    private createLayerMaterial(name: string, disableDepthWrite: boolean): B.NodeMaterial {
        if (!SpriteSheetPlane.baseHueShiftMaterial) {
            // Handle case where material isn't loaded yet (important!)
            console.error(`[${name}] Base NodeMaterial not ready!`);
            // Return a temporary placeholder or throw error
            // ... (Placeholder logic from previous answer) ...
            const dummyMat = new B.StandardMaterial(name + "_dummy", this.scene);
            dummyMat.emissiveColor = Color3.Magenta();
            return dummyMat as any;
        }

        // <<< CLONE the base material >>>
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
    private async loadLayerTexture(
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
                this.plane.visibility = 1;
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

    // private applyHueShift(material: B.NodeMaterial, hue: number): void {
    //     const inputBlock = material.getBlockByName(HUE_SHIFT_UNIFORM_NAME) as Nullable<B.InputBlock>;
    //     if (inputBlock) {
    //         inputBlock.value = hue;
    //     }
    // }

    // private colorize(material: B.NodeMaterial, color: IColor3, strength: number = 255.0): void {
    //     if(!material || !color) return;
    //     if(color.r + color.g + color.b == 0) return; // it never gets truly black but who the fuck will see anyway :)
    //     const inputBlock = material.getBlockByName("targetColor") as Nullable<B.InputBlock>;
    //     if (inputBlock) {
    //         inputBlock.value = new B.Color4(color.r, color.g, color.b, strength);
    //     }
    // }
    
    public setPosition(position: B.Vector3): void { this.plane.position.copyFrom(position); }
    public getPosition(): B.Vector3 { return this.plane.position; }
    public hasTexture(): boolean { return this.texture !== null; } // Check base texture

    private update = (): void => {
        // Only update if visible and has a base texture
        if (this.plane.visibility === 0 || !this.texture) {
            return;
        }

        this.updateCurrentDirection();
    }

    // --- Direction Logic (Keep as is, seems fine) ---
    private updateCurrentDirection(): void {
        const cam = this.scene.activeCamera;
        const charPos = this.plane.position;

        if (!cam || !cam.getViewMatrix() || !this.plane.rotationQuaternion) return;

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
            Quaternion.RotationYawPitchRollToRef(angleToCamera, 0, 0, this.plane.rotationQuaternion);
        } else {
            const targetAngle = Math.round(cameraAngle / (Math.PI / 2)) * (Math.PI / 2) + Math.PI;
            Quaternion.RotationYawPitchRollToRef(targetAngle, 0, 0, this.plane.rotationQuaternion); // Directly set rotation based on lookDirection
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
        this.plane.dispose(false, true); // Dispose geometry and children, but not materials yet
        this.material.dispose(true); // Dispose multimaterial and its submaterials
        // this.material_base.dispose(); // Already disposed by multiMaterial.dispose(true)
        // this.material_eyes.dispose();
        // this.material.dispose();

        // Dispose textures if not managed by AssetService
        if (!this.assetService) {
            this.texture?.dispose();
        }
        this.texture = null;


        // if (this.debugArrow) this.debugArrow.dispose(); // Dispose debug arrow if used

        console.log(`[SpriteSheetPlane:${this.name}] Disposed.`);
    }
}