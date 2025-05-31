// client/src/babylon/GameEngine.ts
import * as B from '@babylonjs/core';
import { SceneDirector } from '../game/SceneDirector'; // Import the actual type now
import { UiDirector } from '@/game/UiDirector';
import HavokPhysics, { HavokPhysicsWithBindings } from '@babylonjs/havok';

export class GameEngine {
	public engine: B.Engine | null = null;
	public babylonCanvas: HTMLCanvasElement | null = null;
	public sceneDirector: SceneDirector | null = null;
	public uiDirector: UiDirector | null = null;
	private _isInitialized: boolean = false;
	private _resizeObserver: ResizeObserver | null = null; // Store observer to disconnect
	public physics: HavokPhysicsWithBindings | null = null;

	constructor() {
		// --- Setup SceneDirector ---
		this.sceneDirector = new SceneDirector();

		// --- Setup UiDirector ---
		this.uiDirector = new UiDirector();


		console.log('[GameEngine] Instance created.');
	}

	public async initialize(canvas: HTMLCanvasElement): Promise<void> {
		if (this._isInitialized) {
			console.warn('[GameEngine] Already initialized.');
			return;
		}
		console.log('[GameEngine] Initializing Engine...');
		this.babylonCanvas = canvas;

		B.Logger.LogLevels = B.Logger.WarningLogLevel;
		this.engine = new B.Engine(canvas, true, {
			preserveDrawingBuffer: true,
			stencil: true,
			alpha: true,
			audioEngine: true,
		});

		this.engine.loadingScreen = new B.DefaultLoadingScreen(canvas, '');
		this.engine.loadingScreen.displayLoadingUI = () => {
			canvas.style.display = 'none';
		}; // no-op
		this.engine.loadingScreen.hideLoadingUI = () => {
			canvas.style.display = 'block';
		};

		if (!this.engine) {
			throw new Error('Failed to initialize Babylon Engine');
		}

		// --- Engine Resize Handling ---
		this._resizeObserver = new ResizeObserver(() => {
			this.engine?.resize();
		});
		this._resizeObserver.observe(this.babylonCanvas);

		this.sceneDirector!.initialize(this.engine);
		this.uiDirector!.initialize();

		// @ts-except-error
		this.physics = await HavokPhysics({
			locateFile: (_path) => `/HavokPhysics.wasm`,
		});
	
		// --- Start Render Loop ---
		this.engine!.runRenderLoop(() => {
			if (!this.engine) {
				console.error('[GameEngine] Engine is null during render loop.');
				return;
			}
			if (!this.sceneDirector) {
				console.error('[GameEngine] SceneDirector is null during render loop.');
				return;
			}
			this.sceneDirector._advanceScene();
			const activeScene = this.sceneDirector.getActiveScene();
			if (activeScene && activeScene.isReady()) {
				// console.log("[GameEngine] Rendering scene...", activeScene.constructor.name)
				try {
					activeScene.render();
				} catch (error: any) {
					console.error(error);
				}
			}
		});

		this._isInitialized = true;
		console.log('[GameEngine] Engine initialized and render loop started.');
	}

	public dispose(): void {
		if (!this._isInitialized || !this.engine) return;
		console.log('[GameEngine] Disposing Engine...');
		this.engine.stopRenderLoop();
		// Disconnect observer
		if (this._resizeObserver && this.babylonCanvas) {
			this._resizeObserver.unobserve(this.babylonCanvas);
			this._resizeObserver = null;
		}
		// SceneDirector should handle scene disposal before engine disposal
		this.engine.dispose();
		this.engine = null;
		this.babylonCanvas = null;
		this._isInitialized = false;
		console.log('[GameEngine] Engine disposed.');
	}

	public getEngine(): B.Engine | null {
		return this.engine;
	}

	public changeScene(sceneName: string | null): void {
		if (!this.sceneDirector || !this.engine) return;
		if (!sceneName) {
			this.sceneDirector.changeScene(null);
			return;
		}
		this.sceneDirector.changeScene(sceneName);
	}

	public isInitialized(): boolean {
		return this._isInitialized;
	}
}
