import {
    TransformNode,
    Scene,
    MeshBuilder,
    Vector3,
    StandardMaterial,
    Color3,
    PhysicsBody,
    PhysicsAggregate,
    PhysicsShapeType
} from "@babylonjs/core";
import { Player } from "./characterController";

export class Enemy extends TransformNode {
    public _scene: Scene;
    private _body: PhysicsBody;
    private _speed: number = 4;
    private _maxSpeed: number = 5;
    private _player: Player;
    private _isActive: boolean = true;
    private _aiBehavior: (enemy: Enemy, player: Player) => void;

    constructor(name: string, scene: Scene, player: Player, spawnPosition: Vector3) {
        super(name, scene);
        this._scene = scene;
        this._player = player;
        this._aiBehavior = this._defaultBehavior;
        this.position = spawnPosition;
        this._initialize();
    }

    private _initialize(): void {
        const bodyTransformNode = new TransformNode("enemyBodyTransform", this._scene);
        bodyTransformNode.parent = this;

        const bodyMesh = MeshBuilder.CreateSphere("enemyBody", { diameter: 2 }, this._scene);
        bodyMesh.position.y = 1;
        bodyMesh.parent = bodyTransformNode;

        const material = new StandardMaterial("enemyMaterial", this._scene);
        material.diffuseColor = new Color3(0, 0, 1);
        bodyMesh.material = material;

        const physicsAggregate = new PhysicsAggregate(
            bodyMesh,
            PhysicsShapeType.SPHERE,
            { mass: 1, restitution: 0.5 },
            this._scene
        );

        this._body = physicsAggregate.body;
    }

    public update(): void {
        if (!this._isActive || !this._body?.["_pluginData"]) {
            if (!this._body?.["_pluginData"]) {
                console.warn(`Enemy ${this.name} has an uninitialized physics body.`);
            }
            return;
        }

        this._aiBehavior(this, this._player);
    }

    private _defaultBehavior(enemy: Enemy, player: Player): void {
        if (!enemy._body?.["_pluginData"]) {
            console.warn(`Enemy ${enemy.name} has an uninitialized physics body.`);
            return;
        }

        const direction = player.position.subtract(enemy.position).normalize();
        const moveSpeed = this._speed * 0.1;

        enemy.position.addInPlace(direction.scale(moveSpeed));

        const currentVelocity = enemy._body.getLinearVelocity();
        if (currentVelocity.length() > this._maxSpeed) {
            const clampedVelocity = currentVelocity.normalize().scale(this._maxSpeed);
            enemy._body.setLinearVelocity(clampedVelocity);
        }
    }

    public toggleActiveState(): void {
        this._isActive = !this._isActive;
        console.log(`Enemy ${this.name} is now ${this._isActive ? "active" : "inactive"}`);
    }

    public setAIBehavior(behavior: (enemy: Enemy, player: Player) => void): void {
        this._aiBehavior = behavior;
    }
}
