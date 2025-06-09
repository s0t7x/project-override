import * as BABYLON from '@babylonjs/core';
import * as GUI from '@babylonjs/gui';
import { BaseScene } from './BaseScene';
import { AnimationUtils } from '../utils/AnimationUtils'; // Adjust path as needed
import { useGeneralStore } from '@/stores/GeneralStore';
import { useServiceStore } from '@/stores/ServiceStore';

export class TitleScreenScene extends BaseScene {
    private _advancedTexture!: GUI.AdvancedDynamicTexture;
    private _mainContainer!: GUI.Container;
    private _logoImage!: GUI.Image;
    private _ctaSkipped: boolean = false;

    // Durations in seconds
    private readonly FADE_IN_TIME = 0.2;
    private readonly FADE_OUT_TIME = 0.2;

    // --- Replace with your actual asset URLs ---
    private readonly BACKGROUND_IMAGE_URL = "https://static.pressakey.de/gfxgames/RPG-Maker-MV-5712-1599115840.jpg"; // Placeholder background
    private readonly LOGO_IMAGE_URL = "https://i.imgur.com/gXw24hw.png"; // Placeholder logo

    constructor(engine: BABYLON.Engine) {
        super(engine);
        this.createDefaultCameraOrLight(true, false, false); // Just a camera
        this.clearColor = new BABYLON.Color4(0, 0, 0, 1); // Black background

        this._setupUI();
        this._setupSkipControls();

        this.onReadyObservable.addOnce(() => {
            console.log('TitleScreenScene: Scene loaded. Starting title sequence.');
            const uiDirector = useGeneralStore.getState().gameEngine?.uiDirector;
            const bgmService = useServiceStore.getState().bgmService;
            if (!uiDirector || !bgmService) return;

            bgmService.play({ name: "menu_theme", filePath: "/assets/audio/bgm/MainframeOfTheForgottenRealm.mp3", loop: true, volume: 0.1 }, 0);
            this._runTitleSequence();
        });
    }

    private _setupUI(): void {
        this._advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI("TitleUI", true, this);
        
        this._mainContainer = new GUI.Container("mainContainer");
        this._mainContainer.width = "100%";
        this._mainContainer.height = "100%";
        this._mainContainer.alpha = 0; // Start fully transparent
        this._advancedTexture.addControl(this._mainContainer);

        // 1. Fullscreen Background Image
        const backgroundImage = new GUI.Image("background", this.BACKGROUND_IMAGE_URL);
        backgroundImage.stretch = GUI.Image.STRETCH_UNIFORM;
        // backgroundImage.width = 1920;
        // backgroundImage.height = 1080;
        backgroundImage.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        backgroundImage.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
        this._mainContainer.addControl(backgroundImage);

        // 2. Centered Logo
        this._logoImage = new GUI.Image("logo", this.LOGO_IMAGE_URL);
        this._logoImage.width = "70%";
        this._logoImage.stretch = GUI.Image.STRETCH_UNIFORM;
        this._logoImage.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        this._logoImage.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
        this._logoImage.paddingBottom = "33%";
        this._mainContainer.addControl(this._logoImage);

        const bottomText = new GUI.TextBlock("bottomText", "Project-Override (c) s0t7x - QSecNet - 2025");
        bottomText.color = "white";
        bottomText.fontSize = "14px";
        bottomText.fontWeight = "bold";
        bottomText.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
        bottomText.textVerticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        bottomText.paddingBottom = "2%";
        this._mainContainer.addControl(bottomText);
    }
    
    private async _runTitleSequence(): Promise<void> {
        // Rapidly fade in all UI elements together.
        await AnimationUtils.fadeAlpha(this, this._mainContainer, 1, this.FADE_IN_TIME);
        console.log("TitleScreenScene: Fade in complete. Waiting for user input.");
    }
    
    private _skipHandler = (): void => {
        // If the fade-in is not complete, this will be called but the scene change
        // will wait until the fade-out is complete.
        // If a change is already in progress, do nothing.
        if (this._ctaSkipped) return;

        console.log("TitleScreenScene: Skip input received. Starting scene change.");
        this._performFadeOutLogo();
        this._showDebugAlert()
    };

    private async _performFadeOutLogo(): Promise<void> {
        if (this._ctaSkipped) return;
        this._ctaSkipped = true;
        
        // Fade out the UI
        await AnimationUtils.fadeAlpha(this, this._logoImage, 0, this.FADE_OUT_TIME);
        
        // Change ui scene and open login window
    }

    private _onKeyDown = (evt: BABYLON.KeyboardInfo): void => {
        if (evt.type === BABYLON.KeyboardEventTypes.KEYDOWN) {
            this._skipHandler();
        }
    };

    private _onPointerDown = (_eventData: BABYLON.PointerInfo): void => {
        this._skipHandler();
    };

    private _pointerDownObserver: BABYLON.Observer<BABYLON.PointerInfo> | null = null;

    private _setupSkipControls(): void {
        // Listen for any key press
        this.onKeyboardObservable.add(this._onKeyDown);
        
        // Listen for any pointer click/tap
        this._pointerDownObserver = this.onPointerObservable.add((pointerInfo) => {
            if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {
                this._onPointerDown(pointerInfo);
            }
        });

        // Cleanup on dispose
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