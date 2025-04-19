// server/src/physics/AmmoPhysicsEngine.ts
// Wrapper class managing an Ammo.js dynamics world instance for a GameRoom.
// Handles body creation, removal, simulation stepping, and collision event reporting.
// NOTE: This requires AmmoJS to be loaded and initialized BEFORE creating an instance.

// --- IMPORTANT ---
// You need to load AmmoJS first, usually asynchronously in your server startup.
// Example (in index.ts or a dedicated setup file):
/*
import Ammo from 'ammojs'; // Use the correct import based on your ammojs setup
let ammoInstance: typeof Ammo;
async function initializeAmmo() {
    ammoInstance = await Ammo(); // Or however your specific Ammo setup works
    console.log("[AmmoJS] Initialized successfully.");
}
// Call initializeAmmo() before starting the GameServer or creating GameRooms.
*/
// --- END IMPORTANT ---


// Placeholder types - replace with actual Ammo types once initialized
type AmmoInstance = any;
type BtDiscreteDynamicsWorld = any;
type BtCollisionShape = any;
type BtRigidBody = any;
type BtVector3 = any;
type BtQuaternion = any;
type BtDefaultCollisionConfiguration = any;
type BtCollisionDispatcher = any;
type BtDbvtBroadphase = any;
type BtSequentialImpulseConstraintSolver = any;
type BtTransform = any;
type BtMotionState = any;
// --- End Placeholder Types ---

import { GameRoom } from "@/rooms/GameRoom"; // Needed for context/callbacks
import { Entity } from "@/entities/core/Entity"; // For linking bodies to entities
import { TransformComponent } from "@/entities/components/TransformComponent"; // Assuming it exists

export class AmmoPhysicsEngine {
    private ammo: AmmoInstance; // The initialized AmmoJS instance
    private dynamicsWorld: BtDiscreteDynamicsWorld | null = null;
    private collisionConfiguration: BtDefaultCollisionConfiguration | null = null;
    private dispatcher: BtCollisionDispatcher | null = null;
    private broadphase: BtDbvtBroadphase | null = null;
    private solver: BtSequentialImpulseConstraintSolver | null = null;

    // Map to link entity IDs to their physics bodies
    private bodies: Map<string, BtRigidBody> = new Map();
    // Temporary Ammo objects to avoid allocations in the loop
    private btTransform: BtTransform | null = null;

    // Pass the initialized Ammo instance here
    constructor(ammoInstance: AmmoInstance, private room: GameRoom) {
        this.ammo = ammoInstance;
        console.log("[PhysicsEngine] Initializing...");
        this.initWorld();
    }

    private initWorld(): void {
        if (!this.ammo) {
            console.error("[PhysicsEngine] Cannot initialize world: AmmoJS instance not provided!");
            return;
        }
        try {
            this.collisionConfiguration = new this.ammo.btDefaultCollisionConfiguration();
            this.dispatcher = new this.ammo.btCollisionDispatcher(this.collisionConfiguration);
            this.broadphase = new this.ammo.btDbvtBroadphase();
            this.solver = new this.ammo.btSequentialImpulseConstraintSolver();

            this.dynamicsWorld = new this.ammo.btDiscreteDynamicsWorld(
                this.dispatcher,
                this.broadphase,
                this.solver,
                this.collisionConfiguration
            );

            // Set gravity (example: Y-axis downwards)
            this.dynamicsWorld.setGravity(new this.ammo.btVector3(0, -9.81, 0));

            this.btTransform = new this.ammo.btTransform(); // Initialize reusable transform

            console.log("[PhysicsEngine] Dynamics world created.");
        } catch (error) {
            console.error("[PhysicsEngine] Error initializing Ammo dynamics world:", error);
            this.dynamicsWorld = null; // Ensure world is null if init failed
        }
    }

    /** Steps the physics simulation forward in time. */
    stepSimulation(deltaTime: number, maxSubSteps = 10, fixedTimeStep = 1 / 60): void {
        if (!this.dynamicsWorld) return;

        try {
            this.dynamicsWorld.stepSimulation(deltaTime, maxSubSteps, fixedTimeStep);
            // --- Collision Detection (Basic Example) ---
            const numManifolds = this.dispatcher.getNumManifolds();
            for (let i = 0; i < numManifolds; i++) {
                const contactManifold = this.dispatcher.getManifoldByIndexInternal(i);
                const body0 = this.ammo.btRigidBody.prototype.upcast(contactManifold.getBody0());
                const body1 = this.ammo.btRigidBody.prototype.upcast(contactManifold.getBody1());

                // Find corresponding entity IDs (you need a way to map body back to entityId)
                // const entityId0 = this.findEntityIdForBody(body0);
                // const entityId1 = this.findEntityIdForBody(body1);

                const numContacts = contactManifold.getNumContacts();
                for (let j = 0; j < numContacts; j++) {
                     const pt = contactManifold.getContactPoint(j);
                     if (pt.getDistance() < 0) { // Penetration means collision
                        // Handle collision event: dispatch to room or entities involved
                        // console.log(`Collision detected between ${entityId0} and ${entityId1}`);
                        // this.room.handleCollision(entityId0, entityId1, pt);
                        break; // Often only need one contact point per pair
                     }
                }
            }
             // --- Update Entity Transforms ---
             this.updateEntityTransforms();

        } catch (error) {
            console.error("[PhysicsEngine] Error during stepSimulation:", error);
        }
    }

    /** Reads simulated positions/rotations and updates corresponding Entity TransformComponents. */
    private updateEntityTransforms(): void {
        if (!this.dynamicsWorld || !this.btTransform) return;

        for (const [entityId, body] of this.bodies.entries()) {
            const motionState = body.getMotionState();
            if (motionState) {
                 motionState.getWorldTransform(this.btTransform);
                 const origin = this.btTransform.getOrigin();
                 const rotation = this.btTransform.getRotation(); // btQuaternion

                 const entity = this.room.entityManager.getEntity(entityId);
                 const transformComp = entity?.getComponent(TransformComponent);

                 if (transformComp) {
                     transformComp.position.x = origin.x();
                     transformComp.position.y = origin.y();
                     transformComp.position.z = origin.z();
                     // Update rotation - convert quaternion to simpler Y rotation if needed
                     // transformComp.rotationY = this.quaternionToYaw(rotation); // Implement this helper
                 }
            }
        }
    }


    /** Adds a physics body associated with an entity to the world. */
    addBody(entity: Entity, body: BtRigidBody, bodyUserIndex?: number): void {
        if (!this.dynamicsWorld || this.bodies.has(entity.id)) return;

        // Optional: Store entity ID on the body for easier lookup during collisions
        if (bodyUserIndex !== undefined) {
            body.setUserIndex(bodyUserIndex); // You'll need to map this index back to entity ID
        } else {
            // Alternative: Add custom property if Ammo object allows (might not)
            // (body as any).entityId = entity.id;
        }

        this.dynamicsWorld.addRigidBody(body);
        this.bodies.set(entity.id, body);
        console.log(`[PhysicsEngine] Added body for entity ${entity.id}`);
    }

    /** Removes a physics body associated with an entity ID from the world. */
    removeBody(entityId: string): void {
        if (!this.dynamicsWorld) return;
        const body = this.bodies.get(entityId);
        if (body) {
            this.dynamicsWorld.removeRigidBody(body);
            this.ammo.destroy(body); // IMPORTANT: Free Ammo object memory
            this.bodies.delete(entityId);
             console.log(`[PhysicsEngine] Removed body for entity ${entityId}`);
        }
    }

    /** Cleans up all physics resources. Call when the room disposes. */
    dispose(): void {
        console.log("[PhysicsEngine] Disposing...");
        if (!this.ammo) return; // Already disposed or never initialized

        // Remove and destroy all bodies
        for (const body of this.bodies.values()) {
            this.dynamicsWorld?.removeRigidBody(body);
            this.ammo.destroy(body);
        }
        this.bodies.clear();

        // Destroy the world and its components in reverse order of creation
        if (this.dynamicsWorld) this.ammo.destroy(this.dynamicsWorld);
        if (this.solver) this.ammo.destroy(this.solver);
        if (this.broadphase) this.ammo.destroy(this.broadphase);
        if (this.dispatcher) this.ammo.destroy(this.dispatcher);
        if (this.collisionConfiguration) this.ammo.destroy(this.collisionConfiguration);
        if (this.btTransform) this.ammo.destroy(this.btTransform);


        this.dynamicsWorld = null;
        this.solver = null;
        this.broadphase = null;
        this.dispatcher = null;
        this.collisionConfiguration = null;
        this.btTransform = null;
        // Note: We don't destroy the main 'ammo' instance here, as it might be shared or managed globally.
        console.log("[PhysicsEngine] Disposed.");
    }

     // --- Helper Functions (Example) ---
    // You'll need to implement functions to create shapes, bodies, etc.
    // createBoxShape(halfExtents: BtVector3): BtCollisionShape { ... }
    // createRigidBody(mass: number, transform: BtTransform, shape: BtCollisionShape): BtRigidBody { ... }
    // findEntityIdForBody(body: BtRigidBody): string | undefined { /* Use user index or other mapping */ }
    // quaternionToYaw(q: BtQuaternion): number { /* Math to extract Y rotation */ }
}