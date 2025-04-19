// client/src/babylon/managers/CameraManager.ts
// Controls the BabylonJS camera(s) in the active game scene
// (e.g., follow player character, free camera mode).

import * as B from '@babylonjs/core';

export class CameraManager {
    private scene: B.Scene;
    public camera: B.Camera | null = null; // The main game camera

    constructor(scene: B.Scene) {
        this.scene = scene;
        console.log("[CameraManager] Initialized.");
        this.createFollowCamera(); // Create default camera
    }

    private createFollowCamera(): void {
        console.log("[CameraManager] Creating Follow Camera...");
        // Use ArcRotateCamera for typical 3rd person follow cam
        const camera = new B.ArcRotateCamera("followCam", -Math.PI / 2, Math.PI / 4, 20, B.Vector3.Zero(), this.scene);
        camera.attachControl(this.scene.getEngine().getRenderingCanvas(), true); // Allow user control (zoom, rotate)

        // Configure camera limits and behavior
        camera.lowerRadiusLimit = 5;
        camera.upperRadiusLimit = 50;
        camera.wheelPrecision = 15; // Lower value = faster zoom
        camera.checkCollisions = true; // Prevent camera going through walls
        camera.collisionRadius = new B.Vector3(0.5, 0.5, 0.5); // Size for collision checking

        this.camera = camera;
        this.scene.activeCamera = this.camera; // Set as the active camera
        console.log("[CameraManager] Follow Camera created and set active.");
    }

    public setTarget(targetMesh: B.AbstractMesh): void {
        if (this.camera instanceof B.ArcRotateCamera) {
            console.log(`[CameraManager] Setting camera target to mesh: ${targetMesh.name}`);
            this.camera.setTarget(targetMesh);
            // Or lock target center if mesh moves: this.camera.lockedTarget = targetMesh;
        } else {
            console.warn("[CameraManager] Cannot set target: Active camera is not an ArcRotateCamera.");
        }
    }

    public update(deltaTime: number): void {
        // Add any custom camera logic here (e.g., smoothing, adjustments)
    }

    public dispose(): void {
        console.log("[CameraManager] Disposing camera...");
        this.camera?.dispose();
        this.camera = null;
    }
}