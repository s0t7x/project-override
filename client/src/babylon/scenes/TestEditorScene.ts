import * as BABYLON from '@babylonjs/core';
import { BaseScene } from './BaseScene';
import { WorldMeshBuilder } from '../utils/WorldMeshBuilder';
import { IWorldBlock } from '@project-override/shared/core/WorldBlock';
import { BlockDefinition } from '../utils/BlockDefinition';
import { useGeneralStore } from '@/stores/GeneralStore';

import DEV_TESTMAP from '@/data/dev_TestMap.json'; // Still used for initial load if no import
import blockDefinitionsData from '@/data/DT_BlockDefinitions.json';

export class TestEditorScene extends BaseScene {
    private worldBuilder: WorldMeshBuilder | undefined;
    private currentBlockTypeId: string;
    private editorMode: 'add' | 'remove' = 'add';

    private availableBlockTypes: BlockDefinition[] = [];
    private currentBlockTypeIndex: number = 0;

    private previewMesh: BABYLON.Mesh | undefined;
    private previewMaterialAdd: BABYLON.StandardMaterial | undefined;
    private previewMaterialRemove: BABYLON.StandardMaterial | undefined;

    private inputMap: { [key: string]: boolean } = {};
    private cameraPanSpeed: number = 0.5;

    // For file import
    private fileInput: HTMLInputElement | undefined;

    constructor(engine: BABYLON.Engine) {
        super(engine);
        this.availableBlockTypes = blockDefinitionsData as BlockDefinition[];
        if (this.availableBlockTypes.length === 0) {
            throw new Error("No block definitions loaded for editor.");
        }
        this.currentBlockTypeIndex = 0;
        this.currentBlockTypeId = this.availableBlockTypes[this.currentBlockTypeIndex].id;
        this.initialize();
    }

    private async initialize(): Promise<void> {
        console.log("Initializing TestEditorScene...");

        const camera = new BABYLON.ArcRotateCamera('editorCam', -Math.PI / 2, Math.PI / 3, 30, new BABYLON.Vector3(8, 5, 8), this);
        camera.attachControl(true);
        camera.lowerRadiusLimit = 2;
        camera.upperRadiusLimit = 150;
        camera.upperBetaLimit = Math.PI / 2 - 0.01;
        camera.lowerBetaLimit = 0.01;
        this.activeCamera = camera;

        new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(1, 1, 0), this);
        new BABYLON.HemisphericLight('light2', new BABYLON.Vector3(-1, -1, 0), this);

        this.clearColor = new BABYLON.Color4(0.2, 0.2, 0.3, 1);

        this.worldBuilder = new WorldMeshBuilder(this, this.availableBlockTypes);
        const initialWorld: IWorldBlock[] = DEV_TESTMAP as IWorldBlock[];

        console.log("Loading initial world for editor...");
        await this.worldBuilder.loadInitialWorld(initialWorld);
        console.log("Initial world loaded.");

        this.setupPreviewMesh();
        this.setupEditorControls();
        this.setupFileInput(); // Create the hidden file input

        this.onPointerObservable.add(this.handlePointerAction);
        this.onBeforeRenderObservable.add(this.updatePreviewMeshPosition);
        this.onBeforeRenderObservable.add(this.updateCameraPositionFromInput);

        console.log("TestEditorScene setup complete. Controls:");
        console.log("  Mouse Drag: Orbit Camera");
        console.log("  Mouse Wheel: Zoom Camera");
        console.log("  WASD: Pan Camera Target");
        console.log("  Mouse Click: Add/Remove Block");
        console.log("  '1': Add Mode | '2': Remove Mode");
        console.log("  'q': Prev Block | 'e': Next Block");
        console.log("  'x': Export World | 'i': Import World");
        this.logCurrentEditorState();
    }

    private setupPreviewMesh(): void {
        // ... (same as before)
        this.previewMesh = BABYLON.MeshBuilder.CreateBox("previewMesh", { size: this.worldBuilder?.BLOCK_SIZE || 1 }, this);
        this.previewMesh.isPickable = false;
        this.previewMesh.visibility = 0.5;

        this.previewMaterialAdd = new BABYLON.StandardMaterial("previewAddMat", this);
        this.previewMaterialAdd.emissiveColor = BABYLON.Color3.Green();
        this.previewMaterialAdd.alpha = 0.3;

        this.previewMaterialRemove = new BABYLON.StandardMaterial("previewRemoveMat", this);
        this.previewMaterialRemove.emissiveColor = BABYLON.Color3.Red();
        this.previewMaterialRemove.alpha = 0.3;

        this.previewMesh.material = this.previewMaterialAdd;
    }

    private logCurrentEditorState(): void {
        // ... (same as before)
        console.log(`Editor Mode: ${this.editorMode.toUpperCase()} | Current Block Type: ${this.currentBlockTypeId}`);
        const uiDirector = useGeneralStore.getState().gameEngine?.uiDirector;
        uiDirector?.showToast(`Mode: ${this.editorMode} | Block: ${this.currentBlockTypeId}`, 2000, 'top-right');
    }

    private setupFileInput(): void {
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.accept = '.json';
        this.fileInput.style.display = 'none'; // Keep it hidden
        this.fileInput.onchange = this.handleFileSelected;
        document.body.appendChild(this.fileInput); // Add to body to function
    }

    private triggerImport(): void {
        this.fileInput?.click(); // Programmatically click the hidden file input
    }

    private handleFileSelected = async (event: Event): Promise<void> => {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            const file = input.files[0];
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const content = e.target?.result as string;
                    const importedWorldData = JSON.parse(content) as IWorldBlock[];
                    
                    if (!Array.isArray(importedWorldData)) {
                        throw new Error("Imported JSON is not an array of IWorldBlock.");
                    }
                    // Basic validation for some objects in the array
                    if (importedWorldData.length > 0 && (!importedWorldData[0].position || typeof importedWorldData[0].type === 'undefined')) {
                         throw new Error("Imported data does not seem to match IWorldBlock structure.");
                    }

                    console.log(`Successfully parsed ${importedWorldData.length} blocks from ${file.name}.`);
                    useGeneralStore.getState().gameEngine?.uiDirector?.showToast(
                        `Importing ${file.name}...`, 3000, 'top-right'
                    );

                    if (this.worldBuilder) {
                        // Clear existing world (optional, or you could merge)
                        // For simplicity, let's clear and load new
                        this.worldBuilder.dispose(); // Dispose old chunks and caches
                        this.worldBuilder = new WorldMeshBuilder(this, this.availableBlockTypes); // Re-initialize
                        
                        await this.worldBuilder.loadInitialWorld(importedWorldData);
                        console.log("New world imported and loaded.");
                        useGeneralStore.getState().gameEngine?.uiDirector?.showToast(
                            'World Imported!', 3000, 'top-right', 'success'
                        );
                    }
                } catch (error) {
                    console.error("Error importing or parsing JSON map:", error);
                    useGeneralStore.getState().gameEngine?.uiDirector?.showToast(
                        `Import Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 5000, 'top-right', 'error'
                    );
                } finally {
                    // Reset file input to allow importing the same file again if needed
                    if (this.fileInput) this.fileInput.value = '';
                }
            };

            reader.onerror = (e) => {
                console.error("Error reading file:", e);
                useGeneralStore.getState().gameEngine?.uiDirector?.showToast(
                    'Error reading file.', 3000, 'top-right', 'error'
                );
                if (this.fileInput) this.fileInput.value = '';
            }

            reader.readAsText(file);
        }
    }


    private setupEditorControls(): void {
        this.onKeyboardObservable.add((kbInfo) => {
            const key = kbInfo.event.key.toLowerCase();
            if (kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN) {
                this.inputMap[key] = true;
                switch (key) {
                    // ... (other cases: 1, 2, q, e, x)
                    case '1':
                        this.editorMode = 'add';
                        if (this.previewMesh && this.previewMaterialAdd) this.previewMesh.material = this.previewMaterialAdd;
                        this.logCurrentEditorState();
                        break;
                    case '2':
                        this.editorMode = 'remove';
                        if (this.previewMesh && this.previewMaterialRemove) this.previewMesh.material = this.previewMaterialRemove;
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
                    case 'x':
                        this.exportWorld();
                        break;
                    case 'i': // Import
                        this.triggerImport();
                        break;
                }
            } else if (kbInfo.type === BABYLON.KeyboardEventTypes.KEYUP) {
                this.inputMap[key] = false;
            }
        });
    }

    private updateCameraPositionFromInput = (): void => {
        // ... (same as before)
        if (!this.activeCamera || !(this.activeCamera instanceof BABYLON.ArcRotateCamera)) {
            return;
        }
        const camera = this.activeCamera as BABYLON.ArcRotateCamera;
        const panDirection = BABYLON.Vector3.Zero();

        const forward = camera.getDirection(BABYLON.Axis.Z).clone();
        forward.y = 0; 
        forward.normalize();

        const right = camera.getDirection(BABYLON.Axis.X).clone();
        right.y = 0; 
        right.normalize();

        if (this.inputMap['w']) panDirection.addInPlace(forward);
        if (this.inputMap['s']) panDirection.subtractInPlace(forward);
        if (this.inputMap['a']) panDirection.subtractInPlace(right);
        if (this.inputMap['d']) panDirection.addInPlace(right);

        if (panDirection.lengthSquared() > 0.01) {
            panDirection.normalize().scaleInPlace(this.cameraPanSpeed * (this.getEngine().getDeltaTime() / 16.66));
            camera.target.addInPlace(panDirection);
        }
    }
    
    private getPickRay(): BABYLON.Ray {
        // ... (same as before)
        return this.createPickingRay(this.pointerX, this.pointerY, BABYLON.Matrix.Identity(), this.activeCamera);
    }

    private updatePreviewMeshPosition = (): void => {
        // ... (same as before)
        if (!this.previewMesh || !this.worldBuilder) {
            this.previewMesh?.setEnabled(false);
            return;
        }
    
        const pickInfo = this.pickWithRay(this.getPickRay(), (mesh) => mesh.isPickable && mesh !== this.previewMesh && mesh.isVisible);
    
        if (pickInfo?.hit && pickInfo.pickedMesh) {
            const blockSize = this.worldBuilder.BLOCK_SIZE;
            let targetPos: BABYLON.Vector3;
    
            if (this.editorMode === 'add') {
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

    private handlePointerAction = async (pointerInfo: BABYLON.PointerInfo): Promise<void> => {
        // ... (same as before)
        if (!this.worldBuilder || !this.previewMesh || !this.previewMesh.isEnabled()) return;

        if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN && 
            (pointerInfo.event.button === 0 || pointerInfo.event.button === undefined) ) { 
            
            const pickInfo = this.pickWithRay(this.getPickRay(), (mesh) => mesh.isPickable && mesh !== this.previewMesh && mesh.isVisible);

            if (pickInfo?.hit && pickInfo.pickedMesh) {
                const blockSize = this.worldBuilder.BLOCK_SIZE;
                let gx: number, gy: number, gz: number;

                if (this.editorMode === 'add') {
                    const normal = pickInfo.getNormal(true, true);
                    if(!normal) return;
                    const newBlockCenter = pickInfo.pickedMesh.position.add(normal.scale(blockSize));
                    gx = Math.round(newBlockCenter.x / blockSize);
                    gy = Math.round(newBlockCenter.y / blockSize);
                    gz = Math.round(newBlockCenter.z / blockSize);

                    if (this.worldBuilder.getVoxel(gx, gy, gz)) {
                        console.log(`Block already exists at ${gx},${gy},${gz}. Cannot add.`);
                        useGeneralStore.getState().gameEngine?.uiDirector?.showToast(`Block exists at ${gx},${gy},${gz}`, 2000, 'top-right', 'error');
                        return;
                    }

                    this.worldBuilder.addBlock({ position: { x: gx, y: gy, z: gz }, type: this.currentBlockTypeId, rotation: 0 });
                    console.log(`Added block ${this.currentBlockTypeId} at ${gx},${gy},${gz}`);
                } else { 
                    const pos = pickInfo.pickedMesh.position;
                    gx = Math.round(pos.x / blockSize);
                    gy = Math.round(pos.y / blockSize);
                    gz = Math.round(pos.z / blockSize);
                    this.worldBuilder.removeBlock(gx, gy, gz);
                    console.log(`Removed block at ${gx},${gy},${gz}`);
                }
                await this.worldBuilder.update(); 
            }
        }
    }

    private exportWorld(): void {
        // ... (same as before)
        if (!this.worldBuilder) {
            console.error("WorldBuilder not initialized. Cannot export.");
            return;
        }

        const worldBlocks: IWorldBlock[] = [];
        for (const block of this.worldBuilder.voxelData.values()) {
            worldBlocks.push(block);
        }
        
        const jsonData = JSON.stringify(worldBlocks, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `edited_world_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log("World exported to JSON.");
        useGeneralStore.getState().gameEngine?.uiDirector?.showToast('World Exported!', 3000, 'top-right', 'success');
    }

    public dispose(): void {
        super.dispose();
        this.onPointerObservable.removeCallback(this.handlePointerAction);
        this.onBeforeRenderObservable.removeCallback(this.updatePreviewMeshPosition);
        this.onBeforeRenderObservable.removeCallback(this.updateCameraPositionFromInput);

        this.previewMesh?.dispose();
        this.previewMaterialAdd?.dispose();
        this.previewMaterialRemove?.dispose();
        this.worldBuilder?.dispose();

        // Clean up the file input element
        if (this.fileInput) {
            document.body.removeChild(this.fileInput);
            this.fileInput = undefined;
        }
        console.log("TestEditorScene disposed.");
    }
}