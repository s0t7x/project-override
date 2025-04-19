// client/src/babylon/managers/InputManager.ts
// Attaches input listeners (keyboard, pointer) to the BabylonJS scene/canvas.
// Translates raw input into game actions, potentially performs client-side checks,
// and sends formatted input messages via NetworkService.

import * as B from '@babylonjs/core';
import { NetworkService } from '@/services/NetworkService';
import { InputActions, IPlayerInputPayload, IVector3 } from '@shared/types'; // Import shared enums/types

export class InputManager {
    private scene: B.Scene;
    private networkService: NetworkService;
    private inputMap: Record<string, boolean> = {}; // Tracks pressed keys/buttons
    private movementInput: IVector3 = { x: 0, y: 0, z: 0 };
    private lookRotation: number = 0; // Simple Yaw rotation for now

    // Actions triggered this frame
    private actions: Set<InputActions> = new Set();

    private actionObserver: B.Observer<B.KeyboardInfo> | null = null;
    // Add pointer observers if needed for mouse look / clicking

    constructor(scene: B.Scene, networkService: NetworkService) {
        this.scene = scene;
        this.networkService = networkService;
        console.log("[InputManager] Initialized.");
        this.setupKeyboardInput();
    }

    private setupKeyboardInput(): void {
        console.log("[InputManager] Setting up keyboard listeners...");
        this.actionObserver = this.scene.onKeyboardObservable.add((kbInfo) => {
            const key = kbInfo.event.key.toLowerCase();
            const isPressed = kbInfo.type === B.KeyboardEventTypes.KEYDOWN;

            this.inputMap[key] = isPressed;

            // Handle discrete actions on key down
            if (isPressed) {
                this.handleDiscreteAction(key);
            }

            // Prevent default browser actions for certain keys (space, arrows etc.)
             if ([' ', 'w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'e'].includes(key)) {
                 kbInfo.event.preventDefault();
             }
        });
    }

    // Map keys to discrete actions (triggered once on press)
    private handleDiscreteAction(key: string): void {
        switch (key) {
            case ' ':
                this.actions.add(InputActions.JUMP);
                break;
            case 'e':
                this.actions.add(InputActions.INTERACT);
                break;
            // Add mappings for other actions (toggle UI, etc.)
        }
    }

    /** Called every frame before the scene render, likely from SceneDirector or GameEngine. */
    public update(deltaTime: number): void {
        this.updateMovement();
        this.updateLook(); // Add mouse look logic here if needed
        this.sendInputToServer();

        // Clear discrete actions after sending
        this.actions.clear();
    }

    private updateMovement(): void {
        this.movementInput.x = 0;
        this.movementInput.z = 0; // Assuming Y is up/down

        if (this.inputMap['w'] || this.inputMap['arrowup']) {
            this.movementInput.z = 1;
        } else if (this.inputMap['s'] || this.inputMap['arrowdown']) {
            this.movementInput.z = -1;
        }

        if (this.inputMap['a'] || this.inputMap['arrowleft']) {
            this.movementInput.x = -1;
        } else if (this.inputMap['d'] || this.inputMap['arrowright']) {
            this.movementInput.x = 1;
        }

        // Normalize diagonal movement (optional but good practice)
        const len = Math.sqrt(this.movementInput.x * this.movementInput.x + this.movementInput.z * this.movementInput.z);
        if (len > 0) {
            this.movementInput.x /= len;
            this.movementInput.z /= len;
        }
    }

    // Placeholder - implement mouse look if needed
    private updateLook(): void {
        // Example: Update this.lookRotation based on mouse movement
        // Requires pointer lock and listening to pointer events on the canvas
    }


    private sendInputToServer(): void {
        // Basic example: Send if moving or discrete actions occurred
        const hasMovement = this.movementInput.x !== 0 || this.movementInput.z !== 0;
        const hasActions = this.actions.size > 0;

        // Could optimize to only send changes, or send periodically regardless
        if (hasMovement || hasActions) {
            const payload: IPlayerInputPayload = {
                movementInput: { ...this.movementInput }, // Send a copy
                lookRotation: this.lookRotation, // Send current rotation
                actions: Array.from(this.actions), // Convert Set to array
                // sequence: sequenceNumber // Add sequence number for prediction/reconciliation
            };
            this.networkService.sendMessage("playerInput", payload);
        }
    }

    public dispose(): void {
        console.log("[InputManager] Disposing keyboard listeners...");
        if (this.actionObserver) {
            this.scene.onKeyboardObservable.remove(this.actionObserver);
            this.actionObserver = null;
        }
        // Remove pointer observers
        this.inputMap = {};
        this.actions.clear();
    }
}