import * as BABYLON from '@babylonjs/core';
import * as GUI from '@babylonjs/gui';
import { BaseScene } from './BaseScene';
// import { AnimationUtils } from '../utils/AnimationUtils'; // Replaced with built-in animations
import { useGeneralStore } from '@/stores/GeneralStore';
import { useServiceStore } from '@/stores/ServiceStore';
import { AnimationUtils } from '../utils/AnimationUtils';

export class TitleScreenScene extends BaseScene {
    private _advancedTexture!: GUI.AdvancedDynamicTexture;
    private _mainContainer!: GUI.Container;
    private _ctaText!: GUI.TextBlock;
    private _ctaSkipped: boolean = false;
    private _pointerDownObserver: BABYLON.Observer<BABYLON.PointerInfo> | null = null;

    private readonly FADE_IN_TIME = 0.1;
    private readonly FADE_OUT_TIME = 0.2;
    private readonly CTA_BLINK_TIME = 120;
    
    // --- Asset URLs ---
    // Using placeholders for a dynamic background and particles
    private readonly SKYBOX_TEXTURE_URL = "https://assets.babylonjs.com/textures/Space/space_";
    private readonly PARTICLE_TEXTURE_URL = "https://assets.babylonjs.com/textures/flare.png";
    // Using your original logo URL, assuming it's the text part
    private readonly LOGO_TEXT_URL = "/assets/images/Logo.png"; 

    constructor(engine: BABYLON.Engine) {
        super(engine);
        // We only need a camera. The background will be a 3D skybox.
        this.createDefaultCameraOrLight(true, false, false);
        // The camera needs to be positioned to see the 3D scene
        if (this.activeCamera) {
            this.activeCamera.position = new BABYLON.Vector3(0, 0, -20);
        }

        // Create the new dynamic visual elements
        this._createDynamicBackground();
        this._createParticleEffects();
        this._createGlowEffect();
        this._createLightRays();
        
        // Setup UI and controls
        this._setupUI();
        this._setupSkipControls();

        this.onReadyObservable.addOnce(() => {
            console.log('TitleScreenScene: Scene loaded. Starting title sequence.');
            const uiDirector = useGeneralStore.getState().gameEngine?.uiDirector;
            const bgmService = useServiceStore.getState().bgmService;
            if (!uiDirector || !bgmService) return;

            bgmService.play({ name: "menu_theme", filePath: "/assets/audio/bgm/ProjectOverride.mp3", loop: true, volume: 1.0 }, 0);
            this._runTitleSequence();
        });
    }

    /**
     * Creates a dynamic 3D background using a skybox.
     */
    private _createDynamicBackground(): void {
        const skybox = BABYLON.MeshBuilder.CreateBox("skyBox", { size: 100.0 }, this);
        const skyboxMaterial = new BABYLON.StandardMaterial("skyBoxMat", this);
        skyboxMaterial.backFaceCulling = false;
        // The CubeTexture is a set of 6 images for a cube.
        // You can replace the URL with your own nebula/space skybox.
        let files = [
            this.SKYBOX_TEXTURE_URL + "left.jpg",
            this.SKYBOX_TEXTURE_URL + "up.jpg",
            this.SKYBOX_TEXTURE_URL + "front.jpg",
            this.SKYBOX_TEXTURE_URL + "right.jpg",
            this.SKYBOX_TEXTURE_URL + "down.jpg",
            this.SKYBOX_TEXTURE_URL + "back.jpg",
        ]; 
        skyboxMaterial.reflectionTexture = BABYLON.CubeTexture.CreateFromImages(files, this);
        skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
        // Make the skybox dark to not interfere with the foreground
        skyboxMaterial.diffuseColor = new BABYLON.Color3(0.08, 0, 0.02);
        skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
        skybox.material = skyboxMaterial;

        // Optionally, add a slow rotation to the skybox for more dynamism
        this.onBeforeRenderObservable.add(() => {
            skybox.rotation.y -= 0.0001;
        });
    }

    /**
     * Creates the floating ember particle effect.
     */
    private _createParticleEffects(): void {
        const particleSystem = new BABYLON.ParticleSystem("embers", 2000, this);
        
        // Texture for each particle
        particleSystem.particleTexture = new BABYLON.Texture(this.PARTICLE_TEXTURE_URL, this);

        // Emitter settings - a box at the bottom of the screen
        particleSystem.emitter = new BABYLON.Vector3(0, -8, 0); // Start below the camera view
        particleSystem.minEmitBox = new BABYLON.Vector3(-15, 0, 0); 
        particleSystem.maxEmitBox = new BABYLON.Vector3(15, 0, 0);

        // Particle appearance and behavior
        particleSystem.color1 = new BABYLON.Color4(0.5, 0.7, 2, 0.4);
        particleSystem.color2 = new BABYLON.Color4(0.1, 0.0, 1, 0.3);
        particleSystem.colorDead = new BABYLON.Color4(0, 0, 0, 0.0); // Fades to dark and transparent

        particleSystem.minSize = 0.01;
        particleSystem.maxSize = 0.5;
        particleSystem.minLifeTime = 10;
        particleSystem.maxLifeTime = 20;
        particleSystem.emitRate = 20;

        // Blending mode for a fiery/light effect
        particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        
        // Emission direction (upwards)
        particleSystem.direction1 = new BABYLON.Vector3(-0.2, 1, 0);
        particleSystem.direction2 = new BABYLON.Vector3(0.2, 1, 0);
        
        // Speed
        particleSystem.minEmitPower = 0.3;
        particleSystem.maxEmitPower = 1.0;
        particleSystem.updateSpeed = 0.02;

        particleSystem.start();
    }

/**
     * Creates static, simulated vertical light rays behind the UI with a more natural, ethereal look.
     */
    /**
     * Creates DYNAMIC, simulated vertical light rays that drift upwards and shimmer.
     */
    private _createLightRays(): void {
        // --- Core Parameters to Tweak ---
        const RAY_COUNT = 128; // Increased for a fuller, more dynamic scene
        const MIN_VISIBILITY = 0.1; 
        const MAX_VISIBILITY = 0.3; 
        const SPREAD = 40;
        const ANIMATION_SPEED = 80.0; // Higher number = slower shimmer


        // --- New Movement Parameters ---
        const MIN_SPEED = 0.2;  // The slowest a ray can drift upwards
        const MAX_SPEED = 1.5;  // The fastest a ray can drift upwards

        const rayTextureUrl = "/assets/images/light-beam-overlay.png";

        const rayMaterial = new BABYLON.StandardMaterial("lightRayMat", this);
        rayMaterial.disableLighting = true;
        rayMaterial.emissiveTexture = new BABYLON.Texture(rayTextureUrl, this);
        rayMaterial.opacityTexture = rayMaterial.emissiveTexture;
        rayMaterial.backFaceCulling = false;
        rayMaterial.alphaMode = BABYLON.Constants.ALPHA_COMBINE;
        rayMaterial.emissiveColor = new BABYLON.Color3(0.05, 0.02, 0.2);

        const baseRayPlane = BABYLON.MeshBuilder.CreatePlane("baseRayPlane", { width: 8, height: 80 }, this);
        baseRayPlane.material = rayMaterial;
        baseRayPlane.isVisible = false;

        baseRayPlane.registerInstancedBuffer("color", 4);

        const rayInstances: BABYLON.InstancedMesh[] = [];

        // Define our desired ray color once
        const rayColor = new BABYLON.Color3(0.4, 0.0, 0.1);
        const rayColor2 = new BABYLON.Color3(0.4, 0.2, 0.8);


        for (let i = 0; i < RAY_COUNT; i++) {
            const rayInstance = baseRayPlane.createInstance(`ray_${i}`);
            
            // Randomize all properties for the initial position
            this._randomizeRayProperties(rayInstance, true, SPREAD);

            if(Math.random() > 0.5) {
                rayInstance.instancedBuffers.color = new BABYLON.Color4(rayColor.r, rayColor.g, rayColor.b, 0);
            } else {
                rayInstance.instancedBuffers.color = new BABYLON.Color4(rayColor2.r, rayColor2.g, rayColor2.b, 0);
            }

            // Store custom data (its unique speed) directly on the instance object.
            // This is a common and easy way to manage state for instanced meshes.
            (rayInstance as any).speed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);

            rayInstances.push(rayInstance);
        }

        // **FIX 2: Use ONE `onBeforeRenderObservable` outside the loop for performance.**
        // This single function will animate all rays every frame.
        this.onBeforeRenderObservable.add(() => {
            // Get frame-rate independent delta time for smooth movement
            const deltaTime = this.getEngine().getDeltaTime() / 1000.0;

            for (const ray of rayInstances) {
                // --- 1. Shimmer Animation ---
                const sineValue = Math.sin((this.getFrameId() / ANIMATION_SPEED) + ray.position.x);
                const newAlpha = MIN_VISIBILITY + (sineValue + 1) / 2 * (MAX_VISIBILITY - MIN_VISIBILITY);
                baseRayPlane.visibility = newAlpha;
                if (ray.instancedBuffers.color) { // Good practice to check if it exists
                    ray.instancedBuffers.color.a = newAlpha;
                }
                
                // --- 2. Movement Animation ---
                ray.position.x -= (ray as any).speed * deltaTime;

                // --- 3. Reset Logic ---
                if (ray.position.x < -(SPREAD / 2)) {
                    // When ray goes off-screen, reset its position to the bottom with new properties
                    this._randomizeRayProperties(ray, false, SPREAD);
                    ray.position.x = (SPREAD / 2);
                    // Give it a new speed for its next journey
                    (ray as any).speed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
                }
            }
        });
    }

    /**
     * Helper function to randomize the properties of a light ray instance.
     * This avoids code duplication and makes the reset logic cleaner.
     */
    private _randomizeRayProperties(rayInstance: BABYLON.InstancedMesh, isInitial: boolean, spread: number): void {
        const SPREAD = spread; // Must match the constant in the main function

        rayInstance.position.x = (Math.random() - 0.5) * SPREAD;
        rayInstance.position.z = (Math.random() - 0.5) * 5; // Vary depth

        // If it's the very first spawn, randomize Y position too for a staggered start.
        // Otherwise, Y position is handled by the reset logic.
        if (isInitial) {
            rayInstance.position.y = 0;
        }

        rayInstance.rotation.y = BABYLON.Tools.ToRadians(45) + (Math.random() - 0.5) * BABYLON.Tools.ToRadians(10);
        rayInstance.rotation.z = BABYLON.Tools.ToRadians(45) + (Math.random() - 0.5) * BABYLON.Tools.ToRadians(10);

        rayInstance.scaling.x = (Math.random() * 0.8) + 0.3;
        rayInstance.scaling.y = (Math.random() * 0.5) + 0.75;
    }
    
    /**
     * Creates a glow layer for a bloom effect on bright objects.
     */
    private _createGlowEffect(): void {
        // The GlowLayer makes bright areas of the scene "glow"
        const glowLayer = new BABYLON.GlowLayer("glow", this);
        // Adjust intensity to make the effect more or less prominent
        glowLayer.blurKernelSize = 20;
        glowLayer.intensity = 0.2;
    }

    /**
     * Re-creates the UI to match the FF16-style layout.
     */
    private _setupUI(): void {
        this._advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI("TitleUI", true, this);
        
        this._mainContainer = new GUI.Container("mainContainer");
        this._mainContainer.width = "100%";
        this._mainContainer.height = "100%";
        this._mainContainer.alpha = 0; // Start fully transparent
        this._advancedTexture.addControl(this._mainContainer);

        // REMOVED: The static background image is gone.

        // 2. Game Title Logo (Text)
        const titleLogo = new GUI.Image("logo", this.LOGO_TEXT_URL);
        titleLogo.width = "66%";
        titleLogo.stretch = GUI.Image.STRETCH_UNIFORM;
        // Position it slightly above the center to make space for the menu
        titleLogo.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        titleLogo.paddingBottom = "40%";
        this._mainContainer.addControl(titleLogo);

        this._ctaText = new GUI.TextBlock("cta", "Press any Key");
        this._ctaText.color = "black";
        this._ctaText.fontSize = "28px";
        this._ctaText.outlineColor = "#ffffffce";
        this._ctaText.outlineWidth = 3;
        this._ctaText.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        this._ctaText.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        this._ctaText.textVerticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        this._ctaText.paddingBottom = "25%";
        this._mainContainer.addControl(this._ctaText);

        this.onBeforeRenderObservable.add(() => {
            if(this._ctaSkipped) this._ctaText.isVisible = false;
            else if(this.getFrameId() % this.CTA_BLINK_TIME == 0) {
                this._ctaText.isVisible = !this._ctaText.isVisible
            }
        });

        const copyrightText = new GUI.TextBlock("copyright", "© 2025 Miguel Oppermann. All rights reserved. Logo Illustration © 2025 Miguel Oppermann");
        copyrightText.color = "white";
        copyrightText.fontSize = "10px";
        copyrightText.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        copyrightText.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        copyrightText.textVerticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        copyrightText.paddingBottom = "10px";
        this._mainContainer.addControl(copyrightText);
    }
    
    private async _runTitleSequence(): Promise<void> {
        // Fade in the entire UI container
        await AnimationUtils.fadeAlpha(this, this._mainContainer, 1, this.FADE_IN_TIME);
        console.log("TitleScreenScene: Fade in complete. Waiting for user input.");
    }
    
    // This handler can now be used to trigger the main menu or a default action
    private _skipHandler = (): void => {
        if (this._ctaSkipped) return;
        this._ctaSkipped = true;

        console.log("TitleScreenScene: Input received. Showing debug alert.");
        // You can add a fade-out animation here if you wish before showing the alert
        this._showDebugAlert();
    };

    private _onKeyDown = (evt: BABYLON.KeyboardInfo): void => {
        if (evt.type === BABYLON.KeyboardEventTypes.KEYDOWN) {
            this._skipHandler();
        }
    };

    private _onPointerDown = (_eventData: BABYLON.PointerInfo): void => {
        this._skipHandler();
    };

    private _setupSkipControls(): void {
        this.onKeyboardObservable.add(this._onKeyDown);
        
        // this._pointerDownObserver = this.onPointerObservable.add((pointerInfo) => {
        //     if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {
        //         this._onPointerDown(pointerInfo);
        //     }
        // });

        this.onDisposeObservable.addOnce(() => {
            console.log("TitleScreenScene: Disposing skip controls.");
            this.onKeyboardObservable.removeCallback(this._onKeyDown);
            if (this._pointerDownObserver) {
                this.onPointerObservable.remove(this._pointerDownObserver);
            }
        });
    }

    private _showDebugAlert() {
        const uiDirector = useGeneralStore.getState().gameEngine?.uiDirector;
        if (!uiDirector) return;
		uiDirector.showAlert(
				'Dev Build',
				``,
				new Map([[
						'Test Scene',
						() => {
							uiDirector.closeAlert('Dev Build');
							useGeneralStore.getState().gameEngine?.changeScene('test');
						}
					],[
						'Editor',
						() => {
							uiDirector.closeAlert('Dev Build');
							useGeneralStore.getState().gameEngine?.changeScene('testEditor');
						}
					]]
			))
	}
}