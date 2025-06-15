import { Scene } from "@babylonjs/core";
import * as B from "@babylonjs/core";
import { SpriteSheetPlane } from "./SpriteSheetPlane";

export class StaticProp extends SpriteSheetPlane {
    private static _propIdx = 0;
    constructor(name: string, scene: Scene, position: B.Vector3, size?: B.Vector2, pivot?: B.Vector3, customCollisionMesh?: B.Mesh) {
        super('static_prop_' + name + StaticProp._propIdx++, scene, position, size, customCollisionMesh);
        if(pivot) this.mesh.setPivotPoint(pivot);
        this.billboard = true;
    }

    public enablePhysics(): void {
        this.mesh.physicsBody = new B.PhysicsBody(
            this.mesh, B.PhysicsMotionType.STATIC, false, this.scene
        );
        this.mesh.physicsBody.setMassProperties({
            mass: 2,
            inertia: new B.Vector3(1e7, 0.5, 1e7),
        });
        this.mesh.physicsBody.setAngularDamping(1000);
        const playerShape = new B.PhysicsShape({
            type: B.PhysicsShapeType.MESH,
            parameters: { mesh: this.collisionMesh },
        }, this.scene);
        this.mesh.physicsBody.shape = playerShape;
    }
}