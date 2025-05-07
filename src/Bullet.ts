import {
    TransformNode,
    Scene,
    MeshBuilder,
    Vector3,
    StandardMaterial,
    Color3,
    ArcRotateCamera,
    Mesh,
    PhysicsBody,
    PhysicsMotionType,
    PhysicsShapeMesh,
    PhysicsShapeSphere,
} from "@babylonjs/core";
import { InputController } from "./inputController";
import { Exit } from "./exit";
import { Room } from "./room";

/**
 * Bullet projectile class.
 */
export class Bullet {
    private _scene: Scene;
    private _mesh: Mesh;
    private _body: PhysicsBody;

    constructor(scene: Scene, position: Vector3, direction: Vector3) {
        this._scene = scene;
        // Create bullet mesh
        this._mesh = MeshBuilder.CreateSphere("bullet", { diameter: Bullet.DIAMETER }, this._scene);
        this._mesh.position.copyFrom(position);
        
        // Material
        const mat = new StandardMaterial("bulletMat", this._scene);
        mat.diffuseColor = Bullet.COLOR;
        this._mesh.material = mat;

        // Physics
        const shape = new PhysicsShapeSphere(Vector3.Zero() ,Bullet.DIAMETER / 2, this._scene);
        this._body = new PhysicsBody(this._mesh, PhysicsMotionType.DYNAMIC, false, this._scene);
        this._body.shape = shape;
        this._body.setMassProperties({ mass: Bullet.MASS });
        
        // Launch
        const impulse = direction.normalize().scale(Bullet.SPEED);
        this._body.applyImpulse(impulse, this._mesh.getAbsolutePosition());

        // Schedule disposal
        setTimeout(() => this.dispose(), Bullet.LIFETIME);
    }

    public dispose(): void {
        this._body.dispose();
        this._mesh.dispose();
    }

    // Constants
    private static readonly SPEED = 50;
    private static readonly LIFETIME = 3000; // ms
    private static readonly DIAMETER = 0.2;
    private static readonly MASS = 0.1;
    private static readonly COLOR = new Color3(1, 1, 0);
}