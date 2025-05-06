import {
    TransformNode,
    Scene,
    MeshBuilder,
    Vector3,
    StandardMaterial,
    Color3,
    PhysicsBody,
    PhysicsAggregate,
    PhysicsShapeType,
    Mesh
} from "@babylonjs/core";
import { Player } from "./characterController";

export class Enemy extends TransformNode {
    public _scene: Scene;
    private _mesh: Mesh;
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
        this._aiBehavior = this._defaultBehavior.bind(this);
        this._initialize(spawnPosition);
    }

    private _initialize(spawnPosition: Vector3): void {
        // Create visual mesh
        this._mesh = MeshBuilder.CreateSphere("enemyBody", { diameter: 2 }, this._scene);
        this._mesh.position = spawnPosition.clone().add(new Vector3(0, 1, 0)); // Center above ground
        this._mesh.parent = this;

        const material = new StandardMaterial("enemyMaterial", this._scene);
        material.diffuseColor = new Color3(0, 0, 1);
        this._mesh.material = material;

        // Apply physics
        const aggregate = new PhysicsAggregate(this._mesh, PhysicsShapeType.SPHERE, {
            mass: 1,
            restitution: 0.3,
            friction: 0.5
        }, this._scene);

        this._body = aggregate.body;
    }

    public update(): void {
        if (!this._isActive || !this._body) return;
        this._aiBehavior(this, this._player);
    }

    private _defaultBehavior(enemy: Enemy, player: Player): void {
        const enemyPos = enemy._mesh.getAbsolutePosition();
        const playerPos = player.position;

        const direction = playerPos.subtract(enemyPos);
        direction.y = 0; // optional: stay on ground
        const distance = direction.length();

        if (distance < 0.1) return; // Too close to move

        const velocity = direction.normalize().scale(this._speed);

        // Set capped linear velocity
        const currentVel = this._body.getLinearVelocity();
        if (!currentVel || currentVel.length() < this._maxSpeed) {
            this._body.setLinearVelocity(velocity);
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
