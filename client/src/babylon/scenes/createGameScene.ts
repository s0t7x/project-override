// client/src/babylon/scenes/createGameScene.ts
// Creates the main BabylonJS game scene, including setting up cameras (managed by CameraManager),
// core lighting (skybox, sun), environment helpers (fog, reflections).
// Returns the BJS Scene object, ready for managers to populate.

import * as B from '@babylonjs/core';

export function createGameScene(engine: B.Engine): B.Scene {
    console.log("[SceneCreator] Creating Game Scene...");
    const scene = new B.Scene(engine);

    // --- Lighting ---
    // Ambient light
    const hemiLight = new B.HemisphericLight("hemiLight", new B.Vector3(0.1, 1, 0.1), scene);
    hemiLight.intensity = 0.7;
    hemiLight.diffuse = new B.Color3(0.9, 0.9, 1); // Slightly blueish ambient
    hemiLight.groundColor = new B.Color3(0.4, 0.3, 0.2); // Warmer ground color

    // Directional light (sun)
    const dirLight = new B.DirectionalLight("dirLight", new B.Vector3(-0.5, -1, -0.3), scene);
    dirLight.intensity = 1.0;
    dirLight.position = new B.Vector3(20, 40, 20); // Position high up
    // Add shadows later if needed: dirLight has shadow generator

    // --- Environment ---
    scene.clearColor = B.Color4.FromHexString("#304060FF"); // Example sky blueish color
    scene.ambientColor = new B.Color3(0.3, 0.3, 0.3); // Some base ambient color

    // Enable physics if you plan to use client-side physics (often server-authoritative is better)
    // scene.enablePhysics(new B.Vector3(0, -9.81, 0), new B.AmmoJSPlugin()); // Requires Ammo loaded on client

    // --- Fog (Optional) ---
    // scene.fogMode = B.Scene.FOGMODE_LINEAR; // Or EXP, EXP2
    // scene.fogColor = new B.Color3(0.8, 0.85, 0.9);
    // scene.fogStart = 20.0;
    // scene.fogEnd = 60.0;
    // scene.fogDensity = 0.01; // For EXP modes

    // --- Camera placeholder ---
    // The actual game camera will be created and managed by CameraManager later
    const tempCamera = new B.FreeCamera("tempCamera", new B.Vector3(0, 10, -20), scene);
    tempCamera.setTarget(B.Vector3.Zero());
    scene.activeCamera = tempCamera; // Set a temporary active camera

    console.log("[SceneCreator] Game Scene created (Camera/Managers still needed).");
    return scene;
}