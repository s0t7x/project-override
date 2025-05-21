import { BaseScene } from "@/babylon/scenes/BaseScene";

export class SceneDirector {
    private currentScene: BaseScene | null = null;
    private _isInitialized: boolean = false;

    constructor() {
    }

    public changeScene(nextScene: BaseScene | null): void {
        console.log("[SceneDirector] Setting Scene...");
        if (this.currentScene) {
            this.currentScene.dispose();
        }
        this.currentScene = nextScene;
    }

    public getActiveScene(): BaseScene | null {
        return this.currentScene;
    }

    public disposeScene(): void {
        if (this.currentScene) {
            if(this.currentScene.metadata?.mapRenderers) {
                Array.from(Object.values(this.currentScene.metadata.mapRenderers)).forEach((mr: any) => mr.dispose());
            }
            console.log("[SceneDirector] Disposing Scene...");
            this.currentScene.dispose();
            this.currentScene = null;
        }
    }

    public isInitialized(): boolean {
        return this._isInitialized;
    }  

    public initialize(): void {
        console.log("[SceneDirector] Initializing...");
        this._isInitialized = true;
    }
}