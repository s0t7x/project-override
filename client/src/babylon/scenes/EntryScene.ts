import * as BABYLON from '@babylonjs/core';
import * as GUI from '@babylonjs/gui';
import { BaseScene } from './BaseScene';
import { useGeneralStore } from '@/stores/GeneralStore';
import { useServiceStore } from '@/stores/ServiceStore';
import { AnimationUtils } from '../utils/AnimationUtils'; // Adjust path as needed

export class EntryScene extends BaseScene {
	private _advancedTexture!: GUI.AdvancedDynamicTexture;
	private _mainContainer!: GUI.Container;
	
	private _isSkippable: boolean = false;
	private _skipRequested: boolean = false;
	private _sceneChangeInitiated: boolean = false;
	// No longer need _currentAnimation property, as the promise-based utility handles it.

	// Durations in seconds
	private readonly FADE_IN_TIME = 2;
	private readonly HOLD_TIME = 4.0;
	private readonly FADE_OUT_TIME = 1;

	// Placeholder logo URLs - replace with actuals
	private readonly LOGO_URLS = [
		"https://www.havok.com/wp-content/uploads/2020/06/havok-logo-flat.png",
		"https://www.babylonjs.com/assets/logo-babylonjs-social-twitter.png",
		"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSGrqsoP9f7Wyo5mKW-WFIcpyaSwLY-_lIVS_W14ZJ1IZvON-p0pUgIxSbXzgqF84RJXA&usqp=CAU"
	];
	private readonly NUM_LOGO_ROWS = 1;
	private readonly NUM_LOGO_COLS = 3;


	constructor(engine: BABYLON.Engine) {
		super(engine);
		this.createDefaultCameraOrLight(true, true, true);
		this.clearColor = new BABYLON.Color4(0, 0, 0, 1); // Black background

		this._setupUI();
		this._setupSkipControls();

		this.onReadyObservable.addOnce(() => {
			console.log('EntryScene: Scene loaded. Starting intro sequence.');
			this._runFullIntroSequence().catch(error => {
				console.error("EntryScene: Error during intro sequence:", error);
				if (!this._sceneChangeInitiated) {
					this._handleSceneChange();
				}
			});
		});
	}

	private _setupUI(): void {
		this._advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI("EntryUI", true, this);
		
		this._mainContainer = new GUI.Container("mainContainer");
		this._mainContainer.width = "100%";
		this._mainContainer.height = "100%";
		this._mainContainer.alpha = 0; // Start fully transparent
		this._advancedTexture.addControl(this._mainContainer);

		const logoGrid = new GUI.Grid("logoGrid");
		logoGrid.width = "60%";
		logoGrid.height = "50%";
		logoGrid.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
		logoGrid.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
		
		for (let i = 0; i < this.NUM_LOGO_COLS; i++) logoGrid.addColumnDefinition(1 / this.NUM_LOGO_COLS);
		for (let i = 0; i < this.NUM_LOGO_ROWS; i++) logoGrid.addRowDefinition(1 / this.NUM_LOGO_ROWS);
		this._mainContainer.addControl(logoGrid);

		let logoIndex = 0;
		for (let r = 0; r < this.NUM_LOGO_ROWS; r++) {
			for (let c = 0; c < this.NUM_LOGO_COLS; c++) {
				if (logoIndex < this.LOGO_URLS.length) {
					const logoImage = new GUI.Image(`logo${logoIndex}`, this.LOGO_URLS[logoIndex]);
					logoImage.stretch = GUI.Image.STRETCH_UNIFORM;
					logoImage.paddingLeftInPixels = 15;
					logoImage.paddingRightInPixels = 15;
					logoImage.paddingTopInPixels = 15;
					logoImage.paddingBottomInPixels = 15;
					logoGrid.addControl(logoImage, r, c);
					logoIndex++;
				}
			}
		}

		const bottomText = new GUI.TextBlock("bottomText", "Havok™ is a trademark of Microsoft Corporation. Colyseus is copyright © Lucid Sight, Inc.\nReact is a trademark of Meta Platforms, Inc. Electron is a trademark of the OpenJS Foundation. Powered by Babylon.js.");
		bottomText.textVerticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
		bottomText.color = "white";
		bottomText.fontSize = "10px";
		// bottomText.fontWeight = "bold";
		bottomText.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
		bottomText.paddingBottom = "10px";
		this._mainContainer.addControl(bottomText);
	}

	private _handleSceneChange = (): void => {
		if (this._sceneChangeInitiated) return;
		this._sceneChangeInitiated = true;
		
		// No need to manually stop animation; the scene/engine will handle it on dispose.
		// If the container exists, ensure it's hidden before changing scene.
		if (this._mainContainer) this._mainContainer.alpha = 0;

		console.log("EntryScene: Changing scene.");
		// --- Make sure this scene key is correct for your game flow ---
		useGeneralStore.getState().gameEngine?.changeScene('firstTimeSetup'); 
	}

	private async _runFullIntroSequence(): Promise<void> {
		useServiceStore.getState().networkService?.initialize();
		if(!useServiceStore.getState().networkService?.isInitialized()) {
			console.warn("EntryScene: Network initialization failed.");
			// Decide what to do here. Maybe show an error and halt, or proceed.
			// For now, we proceed to fade in.
		};

		this._mainContainer.alpha = 0;
		console.log("EntryScene: Starting fade in...");
		// Use the new AnimationUtils
		await AnimationUtils.fadeAlpha(this, this._mainContainer, 1, this.FADE_IN_TIME);
		console.log("EntryScene: Fade in complete.");

		if (this._skipRequested) {
			console.log("EntryScene: Skipping after fade in.");
			await this._performFadeOutAndChangeScene();
			return;
		}
		
		this._isSkippable = true; // Intro is now skippable after fade-in
		console.log("EntryScene: Intro is now skippable.");
		if (this._skipRequested) {
			console.log("EntryScene: Skipping (pending request processed after fade-in).");
			await this._performFadeOutAndChangeScene();
			return;
		}

		console.log("EntryScene: Starting hold time...");
		const holdEndTime = Date.now() + this.HOLD_TIME * 1000;
		while (Date.now() < holdEndTime) {
			if (this._skipRequested) {
				console.log("EntryScene: Skipping during hold time.");
				await this._performFadeOutAndChangeScene();
				return;
			}
			await new Promise(resolve => setTimeout(resolve, 50)); 
		}
		
		if (this._skipRequested) {
			console.log("EntryScene: Skipping at the end of hold time.");
			await this._performFadeOutAndChangeScene();
			return;
		}

		console.log("EntryScene: Hold time complete.");
		await this._performFadeOutAndChangeScene();
	}

	private async _performFadeOutAndChangeScene(): Promise<void> {
		if (this._sceneChangeInitiated) return;
		if (this._mainContainer.alpha === 0) {
			this._handleSceneChange();
			return;
		}

		console.log("EntryScene: Starting fade out...");
		// Use the new AnimationUtils
		await AnimationUtils.fadeAlpha(this, this._mainContainer, 0, this.FADE_OUT_TIME);
		console.log("EntryScene: Fade out complete.");
		
		this._handleSceneChange();
	}

	// The complex _animateAlpha method is now gone!
	
	private _skipHandler = (): void => {
		if (this._skipRequested) return;
		console.log("EntryScene: Skip input received.");

		if (this._isSkippable) {
			this._skipRequested = true;
			console.log("EntryScene: Intro is skippable. Skip request will be processed.");
			// The main loop will now detect this flag and trigger the fade-out.
		} else {
			console.log("EntryScene: Intro not skippable yet. Skip will be processed when possible.");
			// We still set the flag so the intro can skip as soon as it becomes skippable.
			this._skipRequested = true;
		}
	};

	private _onKeyDown = (evt: BABYLON.KeyboardInfo): void => {
		if (evt.type === BABYLON.KeyboardEventTypes.KEYDOWN && (evt.event.key === "Escape" || evt.event.key === "Enter")) {
            this._skipHandler();
        }
	};

	private _onPointerDown = (_eventData: BABYLON.PointerInfo): void => this._skipHandler();

	private _pointerDownObserver: BABYLON.Observer<BABYLON.PointerInfo> | null = null;
	
	private _setupSkipControls(): void {
		this.onKeyboardObservable.add(this._onKeyDown);
		
		this._pointerDownObserver = this.onPointerObservable.add((pointerInfo) => {
			if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) this._onPointerDown(pointerInfo);
		});

		this.onDisposeObservable.addOnce(() => {
			console.log("EntryScene: Disposing skip controls.");
			this.onKeyboardObservable.removeCallback(this._onKeyDown);
			if (this._pointerDownObserver) this.onPointerObservable.remove(this._pointerDownObserver);
		});
	}
}