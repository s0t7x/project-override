// client/src/B/scenes/createMenuScene.ts
// Creates a simple BJS scene, potentially with just a background or simple animation,
// used when only UI is primary (login, lobby). Returns the BJS Scene object.

import * as B from '@babylonjs/core';
import * as BGUI from '@babylonjs/gui'
import { useGameStore } from '../../state/gameStore';

export function createMenuScene(engine: B.Engine): B.Scene {
    const scene = new B.Scene(engine);

    // Environment
    scene.clearColor = new B.Color4(0.01, 0.01, 0.05, 1); // deep sci-fi blue-black

    // Camera
    const camera = new B.ArcRotateCamera("camera", -Math.PI / 2.5, Math.PI / 2.5, 8, B.Vector3.Zero(), scene);
    // camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = 1;
    camera.upperRadiusLimit = 20;

    // Lighting
    // const hdrTexture = new B.HDRCubeTexture('/assets/hdri/SPACE-1.hdr', scene, 512, false, true, false, true);
    // scene.environmentTexture = hdrTexture;
    // scene.createDefaultSkybox(hdrTexture, true, 1000, 0.1);
    const hdrTexture = B.CubeTexture.CreateFromPrefilteredData(
        "/assets/hdri/space-1.env",
        scene
    );
    scene.environmentTexture = hdrTexture;

    // Skybox with blue tint
    const skybox = scene.createDefaultSkybox(hdrTexture, true, 1000, 0.25);
    if (skybox) {
        const skyboxMat = skybox.material as B.PBRMaterial;
        skyboxMat.microSurface = 0.9;
        skyboxMat.disableLighting = true;
        skyboxMat.environmentIntensity = 1;
        skyboxMat.emissiveColor = new B.Color3(0, 1, 1);
        skyboxMat.emissiveIntensity = 0.2;
    }


    // Crystal geometry
    const crystal = B.MeshBuilder.CreatePolyhedron("crystal", { type: 3, size: 1 }, scene); // Octahedron
    crystal.position.y = 1;
    crystal.scaling = new B.Vector3(1, 2, 1);

    // Crystal material
    const crystalMat = new B.PBRMaterial("crystalMat", scene);
    crystalMat.albedoColor = new B.Color3(0.6, 1, 1);
    crystalMat.metallic = 0.9;
    crystalMat.roughness = 0.1;
    crystalMat.indexOfRefraction = 1.9;
    crystalMat.alpha = 0.8;
    crystalMat.transparencyMode = B.PBRMaterial.PBRMATERIAL_ALPHABLEND;
    crystalMat.environmentIntensity = 1.5;
    crystalMat.reflectionTexture = hdrTexture;
    crystalMat.emissiveColor = new B.Color3(1, 1, 1);
    crystalMat.emissiveIntensity = 0.1;
    crystal.material = crystalMat;

    scene.fogMode = B.Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.002;
    scene.fogColor = new B.Color3(0.01, 0.01, 0.1); // matches clearColor

    camera.radius = 1;

    const ui = BGUI.AdvancedDynamicTexture.CreateFullscreenUI("fadeUI", true, scene);
    const fadeRect = new BGUI.Rectangle("fadeRect");
    fadeRect.width = "100%";
    fadeRect.height = "100%";
    fadeRect.background = "black";
    fadeRect.alpha = 1;
    fadeRect.thickness = 0;
    ui.addControl(fadeRect);

    const fadeAnim = new B.Animation("fadeInAlpha", "alpha", 60, B.Animation.ANIMATIONTYPE_FLOAT, B.Animation.ANIMATIONLOOPMODE_CONSTANT);

    // Define the keyframes
    const keys = [
        { frame: 0, value: 1 },   // Start fully opaque
        { frame: 40, value: 0 }   // End fully transparent
    ];
    fadeAnim.setKeys(keys);

    // Attach the animation to the fadeRect
    fadeRect.animations = [fadeAnim];

    const cameraDefaultTarget = new B.Vector2(0, 0);
    const cameraCharTarget = new B.Vector2(cameraDefaultTarget.x - 1.5, cameraDefaultTarget.y - 1);
    const cameraLerpFactor = 1;
    let nextCameraTarget = cameraDefaultTarget;
    scene.registerBeforeRender(() => {
        const deltaTime = engine.getDeltaTime() / 1000.0; // Delta time in seconds
        const angleChange = .05 * deltaTime;
        camera.alpha += angleChange;
        crystal.rotation.y += angleChange * 2;
        // crystal.rotation.x += 0.5 * deltaTime;

        if (camera.radius < 10) {
            camera.radius += 12 * deltaTime;
        }

        if (useGameStore.getState().currentScreen == 'charSelect') {
            nextCameraTarget = cameraCharTarget
        } else {
            nextCameraTarget = cameraDefaultTarget
        }

        if (camera.targetScreenOffset !== nextCameraTarget) {
            camera.targetScreenOffset.x += ((nextCameraTarget.x - camera.targetScreenOffset.x) * cameraLerpFactor) * deltaTime;
            camera.targetScreenOffset.y += ((nextCameraTarget.y - camera.targetScreenOffset.y) * cameraLerpFactor) * deltaTime;

            if (nextCameraTarget.subtract(camera.targetScreenOffset).length() < 0.01) {
                camera.targetScreenOffset.x = nextCameraTarget.x
                camera.targetScreenOffset.y = nextCameraTarget.y
            }
        }
    });

    scene.onReadyObservable.add(() => {
        // Start the animation
        scene.beginAnimation(fadeRect, 0, 40, false, 1, () => {
            ui.removeControl(fadeRect); // Optional cleanup after fade
        });
    })

    return scene;

}