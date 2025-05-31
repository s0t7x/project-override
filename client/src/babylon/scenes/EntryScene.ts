import * as BABYLON from '@babylonjs/core';
import * as GUI from '@babylonjs/gui';
import { BaseScene } from './BaseScene';
import { useGeneralStore } from '@/stores/GeneralStore';
import { useNetworkStore } from '@/stores/NetworkStore';
import { useServiceStore } from '@/stores/ServiceStore';

export class EntryScene extends BaseScene {
	private _advancedTexture!: GUI.AdvancedDynamicTexture;
	private _mainContainer!: GUI.Container;
	
	private _isSkippable: boolean = false;
	private _skipRequested: boolean = false;
	private _sceneChangeInitiated: boolean = false;
	private _currentAnimation: BABYLON.Animatable | null = null;

	// Durations in seconds
	private readonly FADE_IN_TIME = 2;
	private readonly HOLD_TIME = 4.0;
	private readonly FADE_OUT_TIME = 1;

	// Placeholder logo URLs - replace with actuals
	private readonly LOGO_URLS = [
		"https://upload.wikimedia.org/wikipedia/de/thumb/1/14/Havoklogo.svg/1200px-Havoklogo.svg.png",
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
				// Fallback: try to change scene directly if intro fails catastrophically
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

		// Centered Grid for logos
		const logoGrid = new GUI.Grid("logoGrid");
		logoGrid.width = "60%"; // Adjust as needed for logo sizes
		logoGrid.height = "50%"; // Adjust as needed
		logoGrid.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
		logoGrid.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
		logoGrid._automaticSize = true;
		
		for (let i = 0; i < this.NUM_LOGO_COLS; i++) {
			logoGrid.addColumnDefinition(1 / this.NUM_LOGO_COLS);
		}
		for (let i = 0; i < this.NUM_LOGO_ROWS; i++) {
			logoGrid.addRowDefinition(1 / this.NUM_LOGO_ROWS);
		}
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
					// Optional: Add image load/error logging
					logoImage.onImageLoadedObservable.addOnce(() => {
						console.log(`EntryScene: Logo ${logoImage.name} loaded successfully from ${logoImage.source}`);
					});
					// --- End of optional logging

					logoGrid.addControl(logoImage, r, c);
					logoIndex++;
				}
			}
		}

		// Bottom Text
		const bottomText = new GUI.TextBlock("bottomText", "Project-Override (c) s0t7x - QSecNet - 2025"); // Replace with actual text
		bottomText.textVerticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
		bottomText.color = "white";
		bottomText.fontSize = "14px";
		bottomText.fontWeight = "bold";
		bottomText.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
		bottomText.paddingBottom = "2%";
		this._mainContainer.addControl(bottomText);

		// --- STATIC VISIBILITY TEST (Step 3) ---
		// Uncomment the line below and comment out the fade-in animation in _runFullIntroSequence
		// this._mainContainer.alpha = 1; 
		// console.log(`EntryScene: STATIC ALPHA TEST in _setupUI. _mainContainer.alpha is now: ${this._mainContainer.alpha}`);
		// if (this._mainContainer.alpha !== 1) {
		// 	console.error("EntryScene: CRITICAL - _mainContainer.alpha was set to 1 but is not 1 immediately after in _setupUI!");
		// }
		// Ensure it's initially 0 if not doing the static test, so fade-in starts correctly.
	}

	private _handleSceneChange = (): void => {
		if (this._sceneChangeInitiated) return;
		this._sceneChangeInitiated = true;
		
		if (this._currentAnimation) {
			this._currentAnimation.stop();
			this._currentAnimation = null;
		}
		if (this._mainContainer) this._mainContainer.alpha = 0;

		console.log("EntryScene: Changing scene.");
		useGeneralStore.getState().gameEngine?.changeScene('firstTimeSetup');
	}

	private async _runFullIntroSequence(): Promise<void> {
		useServiceStore.getState().networkService?.initialize()
		if( !useServiceStore.getState().networkService?.isInitialized()) {
				console.warn("EntryScene: Network initialization failed.");
				return; 
			};

		// --- STATIC VISIBILITY TEST (Step 3) ---
		// If you uncommented `this._mainContainer.alpha = 1;` in _setupUI,
		// comment out the following 3 lines:
		this._mainContainer.alpha = 0;
		console.log("EntryScene: Starting fade in...");
		await this._animateAlpha(this._mainContainer, 1, this.FADE_IN_TIME);
		console.log("EntryScene: Fade in complete.");
		// --- End of lines to comment for static test
		console.log(`EntryScene: _mainContainer.alpha after fade-in attempt: ${this._mainContainer.alpha}`);
		if (this._skipRequested && this._isSkippable) {
			console.log("EntryScene: Skipping after fade in (already skippable).");
			await this._performFadeOutAndChangeScene();
			return;
		}
		
		if (useNetworkStore.getState().networkService?.isInitialized()) {
			this._isSkippable = true;
			console.log("EntryScene: Network initialized. Intro is now skippable.");
			if (this._skipRequested) {
				console.log("EntryScene: Skipping (pending request processed after network init).");
				await this._performFadeOutAndChangeScene();
				return;
			}
		} else {
			console.warn("EntryScene: Network service not initialized after attempt.");
		}

		console.log("EntryScene: Starting hold time...");
		const holdEndTime = Date.now() + this.HOLD_TIME * 1000;
		while (Date.now() < holdEndTime) {
			if (this._skipRequested && this._isSkippable) {
				console.log("EntryScene: Skipping during hold time.");
				await this._performFadeOutAndChangeScene();
				return;
			}
			await new Promise(resolve => setTimeout(resolve, 50)); 
		}
		if (this._skipRequested && this._isSkippable) {
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
		await this._animateAlpha(this._mainContainer, 0, this.FADE_OUT_TIME);
		console.log("EntryScene: Fade out complete.");
		
		this._handleSceneChange();
	}

	private _animateAlpha(control: GUI.Control, toAlpha: number, durationSeconds: number): Promise<void> {
		console.log(`_animateAlpha: Called for control '${control.name || "UnnamedControl"}' to alpha ${toAlpha} over ${durationSeconds}s. Current alpha: ${control.alpha}`);
		return new Promise<void>((resolve) => {
			// Capture the current animation before creating a new one.
			const oldAnimatable = this._currentAnimation;

			if (oldAnimatable && oldAnimatable.target === control && oldAnimatable.animationStarted) {
				console.log(`_animateAlpha: An existing animation is running on ${control.name || "UnnamedControl"}. It will be stopped.`);
				// We will stop it after the new one starts or if the new one fails to start.
			}
			const currentAlpha = control.alpha;
			const animation = new BABYLON.Animation(
				`guiAlphaFade_${control.name || "UnnamedControl"}_${Date.now()}`, // More unique animation name
				"alpha", 
				60, 
				BABYLON.Animation.ANIMATIONTYPE_FLOAT, 
				BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
			);
			animation.setKeys([{ frame: 0, value: currentAlpha }, { frame: durationSeconds * 60, value: toAlpha }]);

			const targetToFrame = durationSeconds * 60;
			console.log(`_animateAlpha: Beginning direct animation for ${control.name || "UnnamedControl"} from ${currentAlpha} to ${toAlpha}. Target frames: 0 to ${targetToFrame}.`);
			
			const newAnimatable = this.beginDirectAnimation(
				control,
				[animation],
				0, // from frame
				targetToFrame, // to frame
				false, // loop
				1.0,   // speedRatio
				() => { // onAnimationEnd
					console.log(`_animateAlpha: Direct animation COMPLETED for ${control.name || "UnnamedControl"}. Final control.alpha: ${control.alpha}`);
					// The animation system should set the final value. If it doesn't, uncommenting the next line can force it.
					// control.alpha = toAlpha; 
					if (this._currentAnimation === newAnimatable) {
						this._currentAnimation = null;
					}
					resolve();
				}
			);

			if (!newAnimatable) {
				console.error(`_animateAlpha: Failed to begin direct animation for ${control.name || "UnnamedControl"}. Resolving promise to prevent hanging.`);
				if (oldAnimatable && oldAnimatable.target === control && oldAnimatable.animationStarted) oldAnimatable.stop(); // Stop old if new failed
				resolve(); // Resolve to prevent hanging if animation doesn't start
			} else {
				// If a new animation started successfully, stop the old one if it exists and was running on the same target.
				if (oldAnimatable && oldAnimatable.target === control && oldAnimatable !== newAnimatable && oldAnimatable.animationStarted) {
					console.log(`_animateAlpha: Stopping PREVIOUS animation on ${control.name || "UnnamedControl"}.`);
					oldAnimatable.stop();
				}
				this._currentAnimation = newAnimatable;
				console.log(`_animateAlpha: New animatable stored for ${control.name}. Animatable toFrame: ${newAnimatable.toFrame}, SpeedRatio: ${newAnimatable.speedRatio}`);
			}
		});
	}
	
	private _skipHandler = (): void => {
		if (this._skipRequested) return;
		this._skipRequested = true;
		console.log("EntryScene: Skip input received. Skip requested flag set.");

		if (this._isSkippable) {
			console.log("EntryScene: Intro is skippable. Attempting to interrupt current stage for skip.");
			if (this._currentAnimation) {
				console.log("EntryScene: Stopping current animation due to skip.");
				this._currentAnimation.stop(); 
			}
		} else {
			console.log("EntryScene: Intro not skippable yet. Skip will be processed when/if possible.");
		}
	};

	private _onKeyDown = (evt: BABYLON.KeyboardInfo): void => {
		if (evt.type === BABYLON.KeyboardEventTypes.KEYDOWN && (evt.event.key === "Escape" || evt.event.key === "Enter")) this._skipHandler();
	};

	private _onPointerDown = (_eventData: BABYLON.PointerInfo): void => this._skipHandler();

	private _pointerDownObserver: BABYLON.Observer<BABYLON.PointerInfo> | null = null;
	private _keyDownAction: BABYLON.IAction | null = null;

	private _setupSkipControls(): void {
		this.onKeyboardObservable.add(this._onKeyDown);
		
		this._pointerDownObserver = this.onPointerObservable.add((pointerInfo) => {
			if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) this._onPointerDown(pointerInfo);
		});

		this.onDisposeObservable.addOnce(() => {
			console.log("EntryScene: Disposing skip controls.");
			if (this._pointerDownObserver) this.onPointerObservable.remove(this._pointerDownObserver);
			if (this.actionManager && this._keyDownAction) {
				// This part for _keyDownAction might not be necessary if you're not using ActionManager for it.
				 const index = this.actionManager.actions.indexOf(this._keyDownAction);
				 if (index > -1) this.actionManager.actions.splice(index, 1);
			}
			if (this._currentAnimation) this._currentAnimation.stop();
		});
	}
}
