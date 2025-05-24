import { BaseScene } from '@/babylon/scenes/BaseScene';
import { EntryScene } from '@/babylon/scenes/EntryScene';
import { TestScene } from '@/babylon/scenes/TestScene';
import * as BABYLON from '@babylonjs/core';

export class SceneDirector {
	public currentScene: BaseScene | null = null;
	private nextSceneName: string | null = null;
	private _isInitialized: boolean = false;
	private engine: BABYLON.Engine | null = null;

	constructor() {}

	public changeScene(nextScene: string | null): void {
		if (!this._isInitialized || !this.engine) {
			console.log('[SceneDirector] Cant changeScene because not initialized yet...');
			return;
		}
		this.nextSceneName = nextScene;
	}

	public getActiveScene(): BaseScene | null {
		return this.currentScene;
	}

	public disposeScene(): void {
		if (this.currentScene) {
			if (this.currentScene.metadata?.mapRenderers) {
				Array.from(Object.values(this.currentScene.metadata.mapRenderers)).forEach((mr: any) => mr.dispose());
			}
			console.log('[SceneDirector] Disposing Scene...');
			this.currentScene.dispose();
			this.currentScene = null;
		}
	}

	public isInitialized(): boolean {
		return this._isInitialized;
	}

	public initialize(engine: BABYLON.Engine): void {
		console.log('[SceneDirector] Initializing...');
		this.engine = engine;
		this.currentScene = new EntryScene(this.engine);
		this._isInitialized = true;
	}

	public _advanceScene(): void {
		if (!this._isInitialized || !this.engine) {
			console.log('[SceneDirector] Cant update because not initialized yet...');
			return;
		}

		if (this.nextSceneName) {
			const next = this.nextSceneName;

			if (this.currentScene && !this.currentScene.isDisposed) {
				console.log('[SceneDirector] Disposing Old Scene...' + this.currentScene.constructor.name);
				this.currentScene.onDisposeObservable.addOnce(() => {
					console.log('[SceneDirector] Old Scene Disposed...');
				});
				this.disposeScene();
			}

			console.log("[SceneDirector] Setting Scene to '" + next + "'...");
			switch (next) {
				case 'test':
					this.currentScene = new TestScene(this.engine);
					break;
				default:
					console.log('[GameEngine] Invalid Scene Name: ' + next + '.');
					this.currentScene = null;
					break;
			}
			if (this.currentScene) {
				console.log('Scene cameras:', this.currentScene.cameras);
				console.log('Active camera:', this.currentScene.activeCamera);
				console.log('Scene lights:', this.currentScene.lights);
				console.log('Engine canvas:', this.engine.getRenderingCanvas());
			}

			this.nextSceneName = null;
		}
	}
}
