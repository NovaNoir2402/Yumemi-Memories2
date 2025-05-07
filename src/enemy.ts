import {
    MeshBuilder,
    StandardMaterial,
    Color3,
    Vector3,
    Scene
} from "@babylonjs/core";
import { Entity } from "./entity";
import { Player } from "./characterController"; // Or wherever the Player class is

export class Enemy extends Entity {
    private readonly _speed: number = 4;
    private readonly _maxSpeed: number = 5;
    private readonly _player: Player;
    private _isActive: boolean = true;
    private _aiBehavior: (enemy: Enemy, player: Player) => void;

    constructor(name: string, scene: Scene, player: Player, spawnPosition: Vector3) {
        super(name, scene);
        this._player = player;
        this._aiBehavior = this._defaultBehavior.bind(this);
        this._initialize(spawnPosition);
    }

    private _initialize(spawnPosition: Vector3): void {
        this._mesh = MeshBuilder.CreateSphere("enemyBody", { diameter: 2 }, this._scene);
        this._mesh.position = spawnPosition.clone().add(new Vector3(0, 1, 0));
        this._mesh.parent = this;

        const material = new StandardMaterial("enemyMaterial", this._scene);
        material.diffuseColor = new Color3(0, 0, 1);
        this._mesh.material = material;

        this._initPhysicsAggregate(this._mesh, 1);
    }

    public update(): void {
        if (!this._isActive || !this._body) return;
        this._aiBehavior(this, this._player);
    }

    private _defaultBehavior(enemy: Enemy, player: Player): void {
        const enemyPos = enemy.position;
        const playerPos = player.position;

        const direction = playerPos.subtract(enemyPos);
        direction.y = 0;
        const distance = direction.length();

        if (distance < 0.1) return;

        const velocity = direction.normalize().scale(this._speed);
        this._body.setLinearVelocity(velocity);

        this._clampVelocity(this._maxSpeed);
    }

    public toggleActiveState(): void {
        this._isActive = !this._isActive;
        console.log(`Enemy ${this.name} is now ${this._isActive ? "active" : "inactive"}`);
    }

    public setAIBehavior(behavior: (enemy: Enemy, player: Player) => void): void {
        this._aiBehavior = behavior;
    }
}
