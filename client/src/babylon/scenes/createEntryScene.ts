// client/src/B/scenes/createMenuScene.ts
// Creates a simple BJS scene, potentially with just a background or simple animation,
// used when only UI is primary (login, lobby). Returns the BJS Scene object.

import * as B from '@babylonjs/core';
import * as BGUI from '@babylonjs/gui'
import { useGameStore } from '../../state/gameStore';
import { AssetService } from '../../services/AssetService';
import { useGameContext } from '../../contexts/GameContext';
import { BlockDataMap, MapRenderer } from '../MapRenderer';
import { useWorldStore } from '../../state/worldStore';
import { CharacterDirection, SpriteSheetCharacter } from '../SpriteSheetCharacter';

export function createEntryScene(engine: B.Engine, assetService?: AssetService): B.Scene {
    console.log("[SceneCreator] Creating Background Map Scene...");
    const scene = new B.Scene(engine);
    scene.metadata = {}; // Initialize metadata

    scene.clearColor = new B.Color4(0, 0, 0, 0);

    // Use onReadyObservable to ensure scene is fully initialized
    let assetServiceInstance: AssetService | undefined = undefined;

    scene.onReadyObservable.addOnce(() => {
        console.log("[SceneCreator] Background scene ready. Initializing MapRenderer.");

        // --- Get AssetService from context ---
        // NOTE: This assumes createBackgroundMapScene is called where context is available.
        if (assetService) {
            assetServiceInstance = assetService;
            characterPreview.applyAssetService(assetServiceInstance);
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
        assetServiceInstance?.loadTexture('/assets/sprites/char_test.png', false);
        assetServiceInstance?.loadTexture('/assets/sprites/char_test_2.png', false);
        assetServiceInstance?.startLoadingSync();

        // --- Create Map Renderer ---
        const mapRenderer = new MapRenderer(scene, assetServiceInstance, "entry_map");
        // Note: mapRenderer adds itself to scene.metadata automatically
        try {
            const initialMapData = useWorldStore.getState().mapChunks;
            if (initialMapData) {
                mapRenderer.renderMap(initialMapData as any);
            } else {
                console.log("[SceneCreator] No map data found in store.");
            }
        } catch {
            console.log("[SceneCreator] Broken map data found in store.");
        }
        scene.metadata.mapRenderer = mapRenderer;

    });

    const hdrTexture = B.CubeTexture.CreateFromPrefilteredData(
        "/assets/hdri/space-1.env",
        scene
    );
    scene.environmentTexture = hdrTexture;

    // Skybox with blue tint
    const skybox = scene.createDefaultSkybox(hdrTexture, true, 1000, 0.25);
    if (skybox) {
        const skyboxMat = skybox.material as B.PBRMaterial;
        skyboxMat.microSurface = 0.8;
        skyboxMat.disableLighting = true;
        skyboxMat.environmentIntensity = 1;
    }

    // --- Camera ---
    // Static or slowly rotating camera might be nice. ArcRotate is easy.
    // Centered slightly above origin, looking down a bit
    const camera = new B.ArcRotateCamera("bgMapCamera", Math.PI / 4, Math.PI / 4, 20, new B.Vector3(0, 1, 0), scene);
    camera.attachControl(true);
    camera.lowerRadiusLimit = 5;
    camera.upperRadiusLimit = 50;
    camera.wheelPrecision = 20; // Slower zoom
    camera.radius = 10;
    camera.beta = 1;
    camera.lowerBetaLimit = 1;
    camera.upperBetaLimit = 1;

    // const camera = new B.FreeCamera('bgMapCamera', new B.Vector3(), scene, true);
    // camera.attachControl(true);
    // camera.minZ = 0.1
    // camera.maxZ = 30000;

    // --- Lighting ---
    // Simple ambient lighting is often enough for a background
    const hemiLight = new B.HemisphericLight("bgMapLight", new B.Vector3(0.1, 0.7, 0.1), scene);
    hemiLight.intensity = 0.8; // Slightly brighter maybe
    hemiLight.diffuse = new B.Color3(1, 1, 1);

    // Subtle directional light for some definition
    const dirLight = new B.DirectionalLight("bgMapDirLight", new B.Vector3(0.5, -0.8, 0.3), scene);
    dirLight.intensity = 0.6;
    dirLight.diffuse = new B.Color3(1, 0.95, 0.85); // Slightly warm sunlight

    // --- Environment ---
    scene.ambientColor = new B.Color3(0.2, 0.2, 0.2);
    scene.fogMode = B.Scene.FOGMODE_EXP;
    scene.fogDensity = 0.0015;
    scene.fogColor = new B.Color3(0.01, 0.01, 0.1); // matches clearColor

    // Crystal geometry
    const crystal = B.MeshBuilder.CreatePolyhedron("crystal", { type: 3, size: 1 }, scene); // Octahedron
    crystal.position.y = 2;
    crystal.scaling = new B.Vector3(1, 2, 1);

    // Crystal material
    const crystalMat = new B.PBRMaterial("crystalMat", scene);
    crystalMat.albedoColor = new B.Color3(0.6, 1, 1);
    crystalMat.metallic = 1;
    crystalMat.roughness = 0.3;
    crystalMat.indexOfRefraction = 1.9;
    crystalMat.alpha = 0.4;
    crystalMat.transparencyMode = B.PBRMaterial.PBRMATERIAL_ALPHATESTANDBLEND;
    crystalMat.environmentIntensity = 2;
    crystalMat.reflectionTexture = hdrTexture;
    crystalMat.emissiveColor = new B.Color3(1, 1, 1);
    crystalMat.emissiveIntensity = 0.1;
    // crystalMat.needDepthPrePass = true;
    crystal.material = crystalMat;
    crystal.renderingGroupId = 1;

    const previewPosition = new B.Vector3(0, 2.4, 0); // Position in front of camera
    const characterPreview = new SpriteSheetCharacter(
        "characterPreview",
        scene,
        undefined,
        previewPosition
    );
    characterPreview.lookDirection = CharacterDirection.Up;
    characterPreview.billboard = true;
    // characterPreview.animationState = 'test'

    // Store reference in metadata
    scene.metadata.characterPreview = characterPreview;
    console.log("[SceneCreator] Character Preview instance created.");


    // const characterPreview2 = new SpriteSheetCharacter(
    //     "characterPreview2",
    //     scene,
    //     assetServiceInstance,
    //     new B.Vector3(0,1.42, 5)
    // );
    // characterPreview2.updateCharacter('/assets/sprites/char_test.png')
    // characterPreview2.lookDirection = CharacterDirection.Down;

    // const characterPreview3 = new SpriteSheetCharacter(
    //     "characterPreview3",
    //     scene,
    //     assetServiceInstance,
    //     new B.Vector3(2,1.42, 3)
    // );
    // characterPreview3.updateCharacter('/assets/sprites/char_test.png')
    // characterPreview3.lookDirection = CharacterDirection.Right;

    // const characterPreview4 = new SpriteSheetCharacter(
    //     "characterPreview4",
    //     scene,
    //     assetServiceInstance,
    //     new B.Vector3(2,1.42, -3)
    // );
    // characterPreview4.updateCharacter('/assets/sprites/char_test.png')
    // characterPreview4.lookDirection = CharacterDirection.Left;
    // characterPreview4.animationState = 'walk'


    const cameraDefaultTarget = new B.Vector2(0, 0);
    const cameraCharTarget = new B.Vector2(cameraDefaultTarget.x - 1, cameraDefaultTarget.y - 1);
    const cameraTargetLerpFactor = 1;
    const cameraRadiusLerpFactor = 1;
    let nextCameraTarget = cameraDefaultTarget;
    const cameraDefaultRadius = 10;
    let nextCameraRadius = cameraDefaultRadius;

    let lastAlpha = camera.alpha;
    let lastBeta = camera.beta;
    let userMovedCamera = false;

    scene.registerBeforeRender(() => {
        const threshold = 0.0001; // sensitivity to detect movement

        // Did user interfere?
        const alphaChanged = Math.abs(camera.alpha - lastAlpha) > threshold;
        const betaChanged = Math.abs(camera.beta - lastBeta) > threshold;

        userMovedCamera = (alphaChanged || betaChanged);
        
        const deltaTime = engine.getDeltaTime() / 1000.0; // Delta time in seconds
        const angleChange = .2 * deltaTime;
        camera.alpha += angleChange;
        
        // Store last camera angles
        lastAlpha = camera.alpha;
        lastBeta = camera.beta;

        characterPreview.billboard = false;

        const currentScreen = useGameStore.getState().currentScreen;
        if (currentScreen == 'charSelect' || currentScreen == 'charCreation') {
            nextCameraTarget = cameraCharTarget
            nextCameraRadius = 8;
            if(currentScreen == 'charCreation') {
                characterPreview.billboard = true;
                crystal.visibility = 0;
                if(!userMovedCamera)
                    characterPreview.lookAtCamera();
            } else {
                crystal.visibility = 1;
            }
        } else {
            crystal.visibility = 1;
            nextCameraTarget = cameraDefaultTarget
            nextCameraRadius = 10;
            if (characterPreview.hasTexture()) characterPreview.setCharacter(null);
        }

        if (camera.targetScreenOffset !== nextCameraTarget) {
            camera.targetScreenOffset.x += ((nextCameraTarget.x - camera.targetScreenOffset.x) * cameraTargetLerpFactor) * deltaTime;
            camera.targetScreenOffset.y += ((nextCameraTarget.y - camera.targetScreenOffset.y) * cameraTargetLerpFactor) * deltaTime;

            if (nextCameraTarget.subtract(camera.targetScreenOffset).length() < 0.01) {
                camera.targetScreenOffset.x = nextCameraTarget.x
                camera.targetScreenOffset.y = nextCameraTarget.y
            }
        }

        if (camera.radius !== nextCameraRadius) {
            camera.radius += (nextCameraRadius - camera.radius) * cameraRadiusLerpFactor * deltaTime;
        }

        // DEBUG: Char4 moving
        // const char4MoveSpeed = 1
        // const char4Pos = characterPreview4.getPosition();
        // if(char4Pos.x < -3) {
        //     characterPreview4.lookDirection = CharacterDirection.Right;
        // } else if(char4Pos.x > 3) {
        //     characterPreview4.lookDirection = CharacterDirection.Left;
        // }
        // const char4DirVec = SpriteSheetCharacter.getDirectionVector(characterPreview4.lookDirection);
        // // const char4DirVec = new B.Vector3(1, 0, 0)
        // char4DirVec.scaleInPlace(deltaTime * char4MoveSpeed)
        // char4DirVec.addInPlace(char4Pos)
        // characterPreview4.setPosition(char4DirVec);
    })

    console.log("[SceneCreator] Background Map Scene created (blocks rendered by manager).");

    return scene;
}