// client/src/babylon/scenes/createGameScene.ts
// Creates the main BabylonJS game scene, including setting up cameras (managed by CameraManager),
// core lighting (skybox, sun), environment helpers (fog, reflections).
// Returns the BJS Scene object, ready for managers to populate.

import * as B from '@babylonjs/core';
import { MapRenderer } from '../MapRenderer';
import { AssetService } from '../../services/AssetService';
import { useGameContext } from '../../contexts/GameContext';
import { useWorldStore } from '../../state/worldStore';
import { useGameStore } from '../../state/gameStore';
import { IMapChunkState } from 'shared';

function mapSchemaToMap<T>(schemaMap: any): Map<string, T> {
  const nativeMap = new Map<string, T>();
  for (const key in schemaMap) {
    if (schemaMap.hasOwnProperty(key)) {
      nativeMap.set(key, schemaMap[key]);
    }
  }
  return nativeMap;
}

export function createGameScene(engine: B.Engine, assetService?: AssetService): B.Scene {
    console.log("[SceneCreator] Creating Game Scene...");
    const scene = new B.Scene(engine);
    scene.metadata = {};

    let assetServiceInstance: AssetService | undefined = undefined;

    scene.onReadyObservable.addOnce(() => {
        console.log("[SceneCreator] Background scene ready. Initializing MapRenderer.");

        // --- Get AssetService from context ---
        // NOTE: This assumes createBackgroundMapScene is called where context is available.
        if (assetService) {
            assetServiceInstance = assetService;
        } else {
            try {
                assetServiceInstance = useGameContext()?.assetService; // Zustand hook style access outside component
                // OR if using direct React Context:
                // const { assetService } = useContext(GameContext) // <-- THIS ONLY WORKS IN REACT COMPONENTS/HOOKS
            } catch (e) {
                console.warn("[SceneCreator] Could not get AssetService instance for MapRenderer. Model loading disabled.");
            }
        }

        assetServiceInstance?.setScene(scene);
        // assetServiceInstance?.loadTexture('/assets/sprites/char_test.png', false);
        // assetServiceInstance?.startLoadingSync();

        // --- Create Map Renderer ---
        const mapRenderer = new MapRenderer(scene, assetServiceInstance, "game_map");
        // Note: mapRenderer adds itself to scene.metadata automatically
        try {
            useGameStore.subscribe((state, prevState) => {
                if (state.roomState?.map?.blockData !== prevState.roomState?.map?.blockData) {
                    const mapData = state.roomState?.map?.blockData;
                    if (mapData) {
                        mapRenderer.renderMap(mapData as any);
                    } else {
                        console.log("[SceneCreator] No map data found in store.");
                    }
                }
            })
            const curState = useGameStore.getState();
            if (curState.roomState?.map?.blockData) {
                const mapData = curState.roomState.map.blockData;
                if (mapData) {
                    mapRenderer.renderMap(mapData as any);
                } else {
                    console.log("[SceneCreator] No map data found in store.");
                }
            }
        } catch {
            console.log("[SceneCreator] Broken map data found in store.");
        }
        scene.metadata.mapRenderer = mapRenderer;
    });
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
    scene.activeCamera.attachControl(engine.getRenderingCanvas(), true); // Attach control for testing

    console.log("[SceneCreator] Game Scene created (Camera/Managers still needed).");
    return scene;
}