import * as BABYLON from '@babylonjs/core';
import '@babylonjs/inspector';
import { BaseScene } from './BaseScene';
import { useGeneralStore } from '@/stores/GeneralStore';
import { useServiceStore } from '@/stores/ServiceStore';
import { WORLD_BLOCK_LAYER, WorldMeshBuilder } from '../utils/WorldMeshBuilder';
import { IWorldBlock } from '@project-override/shared/core/WorldBlock';
import { BlockDefinition } from '../utils/BlockDefinition';

import DEV_TESTMAP from '@/data/dev_TestMap_Big.json';
import blockDefinitionsData from '@/data/DT_BlockDefinitions.json';
import { ICharacterSummary } from '@project-override/shared/core/CharacterSummary';
import { PlayerController } from '../prefabs/PlayerController';
import { SPRITE_PLANE_LAYER } from '../prefabs/SpriteSheetPlane';
import { Plant } from '../prefabs/Plant';
import { StaticProp } from '../prefabs/StaticProp';

// Enum for control modes for better readability and type safety.
enum ControlMode {
    PLAYER = 'PLAYER',
    EDITOR = 'EDITOR'
}

// Enum for editor modes.
enum EditorAction {
    ADD = 'add',
    REMOVE = 'remove'
}

export class TestScene extends BaseScene {
    // Core Components
    private worldBuilder: WorldMeshBuilder | undefined;
    private player: PlayerController | undefined;

    // Mode & Camera Management
    private currentControlMode: ControlMode = ControlMode.PLAYER;
    private editorCamera: BABYLON.ArcRotateCamera | undefined;

    // Editor-Specific Properties
    private editorAction: EditorAction = EditorAction.ADD;
    private availableBlockTypes: BlockDefinition[] = [];
    private currentBlockTypeIndex: number = 0;
    private currentBlockTypeId: string;
    private previewMesh: BABYLON.Mesh | undefined;
    private previewMaterialAdd: BABYLON.StandardMaterial | undefined;
    private previewMaterialRemove: BABYLON.StandardMaterial | undefined;
    private editorInputMap: { [key: string]: boolean } = {};
    private cameraPanSpeed: number = 0.5;

    // Scene Features
    private shadowGenerator: BABYLON.ShadowGenerator | undefined;
    private postProcessingPipeline: BABYLON.DefaultRenderingPipeline | undefined;
    private volumetricFog?: BABYLON.GPUParticleSystem | BABYLON.ParticleSystem;

    // Utilities
    private physicsViewer: BABYLON.PhysicsViewer | undefined;
    private isPhysicsViewerVisible: boolean = false;
    private fileInput: HTMLInputElement | undefined;

    constructor(engine: BABYLON.Engine) {
        super(engine);
        this.clearColor = new BABYLON.Color4(0.2, 0.18, 0.22, 1);
        this.availableBlockTypes = blockDefinitionsData as BlockDefinition[];
        if (this.availableBlockTypes.length === 0) {
            this.currentBlockTypeId = 'unknown';
            console.error("No block definitions loaded for editor.");
        } else {
            this.currentBlockTypeId = this.availableBlockTypes[0].id;
        }
    }

    public async initialize(): Promise<void> {
        this.debugLayer.show({ embedMode: true });
        this.setupFileInput();

        try {
            console.log("Initializing GameScene...");

            // --- Environment & Rendering Setup ---
            this.setupAtmosphericFog();
            this.shadowGenerator = this.setupLightingAndShadows();
            this.shadowsEnabled = true;

            // --- Physics ---
            const preloadedPhysics = useGeneralStore.getState().gameEngine?.physics;
            if (preloadedPhysics) {
                const physicsPlugin = new BABYLON.HavokPlugin(true, preloadedPhysics);
                this.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), physicsPlugin);
            } else {
                console.error("Physics is not loaded.");
                return;
            }
            useServiceStore.getState().assetService?.setScene(this);

            // --- Player & Cameras Setup ---
            const playerInitialPosition = new BABYLON.Vector3(0, 5, 0);
            const testCharSummary: ICharacterSummary = { id: 'char1', userId: 'user1', name: 'Player', level: 1, lastPlayed: 0, isOnline: false, isDeleted: false, deletedAt: 0, appearance: { bodyIdx: 4711, eyesIdx: 0, beardIdx: 0, hairIdx: 0, hairFrontIdx: 0, hairBackIdx: 0 }, equipmentVisuals: [] };

            this.player = new PlayerController(this, { initialPosition: playerInitialPosition, characterSummary: testCharSummary });
            await this.player.initialize(testCharSummary);

            this.editorCamera = new BABYLON.ArcRotateCamera('editorCam', -Math.PI / 2, Math.PI / 3, 30, new BABYLON.Vector3(8, 5, 8), this);
            this.editorCamera.lowerRadiusLimit = 2;
            this.editorCamera.upperRadiusLimit = 150;
            this.editorCamera.upperBetaLimit = Math.PI / 2 - 0.01;
            this.editorCamera.lowerBetaLimit = 0.01;

            this.activeCamera = this.player.camera; // Start in Player Mode
            this.postProcessingPipeline = this.setupPostProcessing(this.activeCamera);

            // --- World & Prop Setup ---
            this.worldBuilder = new WorldMeshBuilder(this, this.availableBlockTypes, this.shadowGenerator);
            await this.worldBuilder.loadInitialWorld(DEV_TESTMAP as IWorldBlock[]);

            this.setupStaticProps();
            this.player.enableShadows(this.shadowGenerator!);
            
            // --- Editor-Specific Setup ---
            this.setupPreviewMesh();
            this.setupControls();

            // --- Final Scene Setup ---
            this.setupVolumetricFog();

            this.onBeforeRenderObservable.add(this.updateEditorState);
            this.onPointerObservable.add(this.handlePointerAction);

            this.onReadyObservable.addOnce(() => {
                const uiDirector = useGeneralStore.getState().gameEngine?.uiDirector;
                uiDirector?.showToast('Press + to toggle between Player and Editor mode.', 5000, 'top-right');
                console.log("Press + to toggle Editor/Player Mode. Press 'P' to toggle physics debug shapes.");
            });

            console.log('GameScene setup complete.');

        } catch (error) {
            console.error("Error during GameScene initialization:", error);
        }
    }

    /** Toggles between Player and Editor control modes. */
    private toggleControlMode(): void {
        const canvas = this.getEngine().getRenderingCanvas();
        if (this.currentControlMode === ControlMode.PLAYER) {
            // --- Switch to EDITOR Mode ---
            this.currentControlMode = ControlMode.EDITOR;
            this.player!.mesh.setEnabled(false); // Disable player physics and visibility
            this.player!.camera.detachControl();

            this.setActiveCameraById(this.editorCamera!.id);
            if (this.postProcessingPipeline && !this.postProcessingPipeline.cameras.includes(this.editorCamera!)) this.postProcessingPipeline.addCamera(this.editorCamera!);

            // Position editor camera near the player
            this.editorCamera!.target.copyFrom(this.player!.mesh.position);
            this.editorCamera!.radius = 20;
            this.editorCamera!.attachControl(canvas, true);

            this.physicsEnabled = false;

            this.logCurrentEditorState();

        } else {
            // --- Switch to PLAYER Mode ---
            this.physicsEnabled = true;

            this.currentControlMode = ControlMode.PLAYER;
            this.editorCamera!.detachControl();
            if(this.previewMesh) this.previewMesh.setEnabled(false);

            this.activeCamera = this.player!.camera;
            if (this.postProcessingPipeline && !this.postProcessingPipeline.cameras.includes(this.player!.camera)) this.postProcessingPipeline.addCamera(this.player!.camera);

            this.player!.mesh.setEnabled(true); // Re-enable player
            this.player!.camera.attachControl(canvas, true);

            useGeneralStore.getState().gameEngine?.uiDirector?.showToast('Player Mode', 2000, 'top-right');
        }
    }

    //region Setup Methods
    private setupControls(): void {
        this.onKeyboardObservable.add((kbInfo) => {
            if (kbInfo.type !== BABYLON.KeyboardEventTypes.KEYDOWN) {
                if(this.currentControlMode === ControlMode.EDITOR) {
                    this.editorInputMap[kbInfo.event.key.toLowerCase()] = false;
                }
                return;
            }

            const key = kbInfo.event.key.toLowerCase();

            // --- Global Controls ---
            if (key === '+') this.toggleControlMode();
            if (key === 'p') this.togglePhysicsViewer();

            // --- Editor-Only Controls ---
            if (this.currentControlMode === ControlMode.EDITOR) {
                this.editorInputMap[key] = true;
                switch (key) {
                    case '1':
                        this.editorAction = EditorAction.ADD;
                        if (this.previewMesh) this.previewMesh.material = this.previewMaterialAdd!;
                        this.logCurrentEditorState();
                        break;
                    case '2':
                        this.editorAction = EditorAction.REMOVE;
                        if (this.previewMesh) this.previewMesh.material = this.previewMaterialRemove!;
                        this.logCurrentEditorState();
                        break;
                    case 'q':
                        this.currentBlockTypeIndex = (this.currentBlockTypeIndex - 1 + this.availableBlockTypes.length) % this.availableBlockTypes.length;
                        this.currentBlockTypeId = this.availableBlockTypes[this.currentBlockTypeIndex].id;
                        this.logCurrentEditorState();
                        break;
                    case 'e':
                        this.currentBlockTypeIndex = (this.currentBlockTypeIndex + 1) % this.availableBlockTypes.length;
                        this.currentBlockTypeId = this.availableBlockTypes[this.currentBlockTypeIndex].id;
                        this.logCurrentEditorState();
                        break;
                    case 'x': this.exportWorld(); break;
                    case 'i': this.triggerImport(); break;
                }
            }
        });
    }

    private async setupStaticProps() {
        const plant = new Plant('plant_test', this, new BABYLON.Vector3(6, 1, 6));
        await plant.applyTexture('/assets/textures/dev_grass.png');

        const chest = new StaticProp('chest_test', this, new BABYLON.Vector3(6, 1, 8));
        await chest.applyTexture('/assets/textures/dev_chest.png');
        chest.enablePhysics();
        chest.enableShadows(this.shadowGenerator!);

        const tree = new StaticProp('tree_test', this, new BABYLON.Vector3(-6, 2.2, 0), new BABYLON.Vector2(2.0, 4.0), new BABYLON.Vector3(0, 0.0, 0), BABYLON.MeshBuilder.CreateCylinder(`tree_test_collision`, { diameter: 0.6, height: 1 }, this));
        await tree.applyTexture('/assets/textures/dev_tree.png');
        tree.enablePhysics();
    }
    
    private setupLightingAndShadows(): BABYLON.ShadowGenerator {
        const ambientLight = new BABYLON.HemisphericLight("ambientLight", new BABYLON.Vector3(0, 1, 0), this);
        ambientLight.intensity = 0.3;
        ambientLight.specular = BABYLON.Color3.Black();

        const directionalLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(-0.5, -1, -0.7), this);
        directionalLight.position = new BABYLON.Vector3(20, 40, 20);
        directionalLight.intensity = 1.3;
        directionalLight.autoUpdateExtends = true;

        const shadowGenerator = new BABYLON.ShadowGenerator(1024, directionalLight);
        shadowGenerator.usePoissonSampling = true;
        shadowGenerator.transparencyShadow = true;
        shadowGenerator.darkness = 0.5;
        shadowGenerator.bias = 0.00008;

        return shadowGenerator;
    }

    private setupPostProcessing(camera: BABYLON.Camera): BABYLON.DefaultRenderingPipeline {
        const pipeline = new BABYLON.DefaultRenderingPipeline("defaultPipeline", false, this, [camera]);
        pipeline.samples = 4;
        pipeline.depthOfFieldEnabled = true;
        pipeline.depthOfField.focusDistance = 10000;
        pipeline.depthOfField.focalLength = 70;
        pipeline.depthOfField.fStop = 1.4;
        pipeline.bloomEnabled = true;
        pipeline.bloomThreshold = 0.5;
        pipeline.bloomWeight = 0.6;
        pipeline.imageProcessing.contrast = 1.2;
        pipeline.imageProcessing.exposure = 0.9;
        pipeline.imageProcessing.vignetteEnabled = true;
        pipeline.imageProcessing.vignetteWeight = 1.5;
        return pipeline;
    }
    
    private setupAtmosphericFog(): void {
        this.fogMode = BABYLON.Scene.FOGMODE_EXP2;
        this.fogColor = BABYLON.Color3.FromHexString(this.clearColor.toHexString());
        this.fogDensity = 0.025;
    }

    private setupVolumetricFog(): void {
        var useGPUVersion = false;

        var fogTexture = new BABYLON.Texture("https://raw.githubusercontent.com/aWeirdo/Babylon.js/master/smoke_15.png", this);

        if (this.volumetricFog) {
            this.volumetricFog.dispose();
        }

        if (useGPUVersion && BABYLON.GPUParticleSystem.IsSupported) {
            this.volumetricFog = new BABYLON.GPUParticleSystem("particles", { capacity: 50000 }, this);
            this.volumetricFog.activeParticleCount = 15000;
            this.volumetricFog.manualEmitCount = this.volumetricFog.activeParticleCount;
            this.volumetricFog.minEmitBox = new BABYLON.Vector3(-50, 2, -50); // Starting all from
            this.volumetricFog.maxEmitBox = new BABYLON.Vector3(50, 2, 50); // To..

        } else {
            this.volumetricFog = new BABYLON.ParticleSystem("particles", 2500, this);
            this.volumetricFog.manualEmitCount = this.volumetricFog.getCapacity();
            this.volumetricFog.minEmitBox = new BABYLON.Vector3(-25, 2, -25); // Starting all from
            this.volumetricFog.maxEmitBox = new BABYLON.Vector3(25, 2, 25); // To...
        }


        this.volumetricFog.particleTexture = fogTexture.clone();
        this.volumetricFog.emitter = new BABYLON.Vector3(0, 0, 0);

        this.volumetricFog.color1 = new BABYLON.Color4(0.8, 0.8, 0.8, 0.1);
        this.volumetricFog.color2 = new BABYLON.Color4(.95, .95, .95, 0.15);
        this.volumetricFog.colorDead = new BABYLON.Color4(0.9, 0.9, 0.9, 0.1);
        this.volumetricFog.minSize = 3.5;
        this.volumetricFog.maxSize = 5.0;
        this.volumetricFog.minLifeTime = Number.MAX_SAFE_INTEGER;
        this.volumetricFog.emitRate = 50000;
        this.volumetricFog.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
        this.volumetricFog.renderingGroupId = 2;
        this.volumetricFog.gravity = new BABYLON.Vector3(0, 0, 0);
        this.volumetricFog.direction1 = new BABYLON.Vector3(0, 0, 0);
        this.volumetricFog.direction2 = new BABYLON.Vector3(0, 0, 0);
        this.volumetricFog.minAngularSpeed = -2;
        this.volumetricFog.maxAngularSpeed = 2;
        this.volumetricFog.minEmitPower = .5;
        this.volumetricFog.maxEmitPower = 1;
        this.volumetricFog.updateSpeed = 0.005;

        this.volumetricFog.start();
    }

    private setupPreviewMesh(): void {
        this.previewMesh = BABYLON.MeshBuilder.CreateBox("previewMesh", { size: this.worldBuilder?.BLOCK_SIZE || 1 }, this);
        this.previewMesh.isPickable = false;
        this.previewMesh.visibility = 0.5;

        this.previewMaterialAdd = new BABYLON.StandardMaterial("previewAddMat", this);
        this.previewMaterialAdd.emissiveColor = BABYLON.Color3.Green();
        this.previewMaterialAdd.alpha = 0.4;
        this.previewMaterialAdd.disableLighting = true;

        this.previewMaterialRemove = new BABYLON.StandardMaterial("previewRemoveMat", this);
        this.previewMaterialRemove.emissiveColor = BABYLON.Color3.Red();
        this.previewMaterialRemove.alpha = 0.4;
        this.previewMaterialRemove.disableLighting = true;

        this.previewMesh.material = this.previewMaterialAdd;
        this.previewMesh.setEnabled(false); // Initially hidden
    }
    //endregion

    //region Editor Logic
    private logCurrentEditorState(): void {
        const message = `Mode: ${this.editorAction.toUpperCase()} | Block: ${this.currentBlockTypeId}`;
        useGeneralStore.getState().gameEngine?.uiDirector?.showToast(message, 2000, 'top-right');
        console.log(`Editor State - ${message}`);
    }

    private updateEditorState = (): void => {
        if (this.currentControlMode !== ControlMode.EDITOR) return;

        this.updateEditorCameraPan();
        this.updatePreviewMeshPosition();
    }

    private updatePreviewMeshPosition = (): void => {
        if (!this.previewMesh || !this.worldBuilder) {
            this.previewMesh?.setEnabled(false);
            return;
        }
    
        const pickInfo = this.pick(this.pointerX, this.pointerY, (mesh) => mesh.isPickable && mesh.layerMask === WORLD_BLOCK_LAYER);
    
        if (pickInfo?.hit && pickInfo.pickedMesh) {
            const blockSize = this.worldBuilder.BLOCK_SIZE;
            let targetPos: BABYLON.Vector3;
    
            if (this.editorAction === EditorAction.ADD) {
                const normal = pickInfo.getNormal(true, true);
                if (!normal) { this.previewMesh.setEnabled(false); return; }
                targetPos = pickInfo.pickedMesh.position.add(normal.scale(blockSize));
            } else { 
                targetPos = pickInfo.pickedMesh.position;
            }
    
            const gridX = Math.round(targetPos.x / blockSize) * blockSize;
            const gridY = Math.round(targetPos.y / blockSize) * blockSize;
            const gridZ = Math.round(targetPos.z / blockSize) * blockSize;
            
            this.previewMesh.position.set(gridX, gridY, gridZ);
            this.previewMesh.setEnabled(true);
        } else {
            this.previewMesh.setEnabled(false);
        }
    }
    
    private updateEditorCameraPan = (): void => {
        if (!this.editorCamera) return;

        const camera = this.editorCamera as BABYLON.ArcRotateCamera;
        const panDirection = BABYLON.Vector3.Zero();

        const forward = camera.getDirection(BABYLON.Axis.Z);
        forward.y = 0; 
        forward.normalize();

        const right = camera.getDirection(BABYLON.Axis.X);
        right.y = 0; 
        right.normalize();

        if (this.editorInputMap['w']) panDirection.addInPlace(forward);
        if (this.editorInputMap['s']) panDirection.subtractInPlace(forward);
        if (this.editorInputMap['a']) panDirection.subtractInPlace(right);
        if (this.editorInputMap['d']) panDirection.addInPlace(right);

        if (panDirection.lengthSquared() > 0.01) {
            panDirection.normalize().scaleInPlace(this.cameraPanSpeed * (this.getEngine().getDeltaTime() / 16.66));
            camera.target.addInPlace(panDirection);
        }
    }
    
    private handlePointerAction = async (pointerInfo: BABYLON.PointerInfo): Promise<void> => {
        if (this.currentControlMode !== ControlMode.EDITOR || !this.worldBuilder || !this.previewMesh || !this.previewMesh.isEnabled()) return;

        if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN && pointerInfo.event.button === 0) { 
            const pickInfo = this.pick(this.pointerX, this.pointerY, (mesh) => mesh.isPickable && mesh.layerMask === WORLD_BLOCK_LAYER);

            if (pickInfo?.hit && pickInfo.pickedMesh) {
                const blockSize = this.worldBuilder.BLOCK_SIZE;
                let gx: number, gy: number, gz: number;
                const pos = this.previewMesh.position;
                gx = Math.round(pos.x / blockSize);
                gy = Math.round(pos.y / blockSize);
                gz = Math.round(pos.z / blockSize);

                if (this.editorAction === EditorAction.ADD) {
                    if (this.worldBuilder.getVoxel(gx, gy, gz)) {
                        useGeneralStore.getState().gameEngine?.uiDirector?.showToast(`Block exists at ${gx},${gy},${gz}`, 2000, 'top-right', 'error');
                        return;
                    }
                    this.worldBuilder.addBlock({ position: { x: gx, y: gy, z: gz }, type: this.currentBlockTypeId, rotation: 0 });
                } else { 
                    this.worldBuilder.removeBlock(gx, gy, gz);
                }
                await this.worldBuilder.update(); 
            }
        }
    }
    //endregion

    //region Import / Export
    private setupFileInput(): void {
        const existingInput = document.getElementById('scene-file-input');
        if (existingInput) {
            this.fileInput = existingInput as HTMLInputElement;
        } else {
            this.fileInput = document.createElement('input');
            this.fileInput.id = 'scene-file-input';
            this.fileInput.type = 'file';
            this.fileInput.accept = '.json';
            this.fileInput.style.display = 'none';
            document.body.appendChild(this.fileInput);
        }
        this.fileInput.onchange = this.handleFileSelected;
    }

    private triggerImport(): void {
        this.fileInput?.click();
    }
    
    private handleFileSelected = async (event: Event): Promise<void> => {
        const input = event.target as HTMLInputElement;
        if (!input.files?.length) return;
        const file = input.files[0];
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const content = e.target?.result as string;
                const importedWorldData = JSON.parse(content) as IWorldBlock[];
                if (!Array.isArray(importedWorldData) || (importedWorldData.length > 0 && (!importedWorldData[0].position || typeof importedWorldData[0].type === 'undefined'))) {
                    throw new Error("Invalid IWorldBlock JSON structure.");
                }

                useGeneralStore.getState().gameEngine?.uiDirector?.showToast(`Importing ${file.name}...`, 3000, 'top-right');
                
                if (this.worldBuilder) {
                    this.worldBuilder.dispose();
                    this.worldBuilder = new WorldMeshBuilder(this, this.availableBlockTypes, this.shadowGenerator);
                    await this.worldBuilder.loadInitialWorld(importedWorldData);
                    useGeneralStore.getState().gameEngine?.uiDirector?.showToast('World Imported!', 3000, 'top-right', 'success');
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                console.error("Error importing map:", error);
                useGeneralStore.getState().gameEngine?.uiDirector?.showToast(`Import Error: ${message}`, 5000, 'top-right', 'error');
            } finally {
                if (this.fileInput) this.fileInput.value = '';
            }
        };
        reader.readAsText(file);
    }

    private exportWorld(): void {
        if (!this.worldBuilder) {
            console.error("WorldBuilder not initialized. Cannot export.");
            return;
        }
        const worldBlocks = Array.from(this.worldBuilder.voxelData.values());
        const jsonData = JSON.stringify(worldBlocks, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `world_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
        a.remove();
        useGeneralStore.getState().gameEngine?.uiDirector?.showToast('World Exported!', 3000, 'top-right', 'success');
    }
    //endregion

    private togglePhysicsViewer(): void {
        const physicsEngine = this.getPhysicsEngine();
        if (!physicsEngine) return;

        if (this.isPhysicsViewerVisible) {
            this.physicsViewer?.dispose();
            this.physicsViewer = undefined;
            this.isPhysicsViewerVisible = false;
        } else {
            this.physicsViewer = new BABYLON.PhysicsViewer(this);
            this.meshes.forEach(mesh => {
                if (mesh.physicsBody) {
                    this.physicsViewer?.showBody(mesh.physicsBody);
                }
            });
            this.isPhysicsViewerVisible = true;
        }
    }

    public dispose(): void {
        super.dispose();
        this.player?.dispose();
        this.worldBuilder?.dispose();
        this.physicsViewer?.dispose();
        this.previewMesh?.dispose();
        this.previewMaterialAdd?.dispose();
        this.previewMaterialRemove?.dispose();
        if (this.fileInput) {
            this.fileInput.onchange = null;
        }
        console.log("GameScene disposed.");
    }
}