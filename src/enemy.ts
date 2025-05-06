import { TransformNode, Scene, MeshBuilder, Vector3, StandardMaterial, Color3, PhysicsBody, PhysicsMotionType, PhysicsShapeMesh, PhysicsAggregate, PhysicsShapeType } from "@babylonjs/core";
import { Player } from "./characterController";

export class Enemy extends TransformNode {
    public _scene: Scene;
    private _body: PhysicsBody;
    private _speed: number = 4; // Movement speed of the enemy
    private _maxSpeed: number = 5; // Maximum speed of the enemy
    private _player: Player; // Reference to the player
    private _isActive: boolean = true; // Active state of the enemy
    private _aiBehavior: (enemy: Enemy, player: Player) => void; // AI behavior function

    constructor(name: string, scene: Scene, player: Player, spawnPosition: Vector3) {
        super(name, scene);
        this._scene = scene;
        this._player = player;

        // Set the default AI behavior
        this._aiBehavior = this._defaultBehavior;

        // Set the spawn position
        this.position = spawnPosition;

        this._initialize();
    }

    private _initialize(): void {
        // Create a TransformNode for the enemy's body
        const bodyTransformNode = new TransformNode("enemyBodyTransform", this._scene);
        bodyTransformNode.parent = this;

        // Create the enemy's visual body (e.g., a blue sphere)
        const bodyMesh = MeshBuilder.CreateSphere("enemyBody", { diameter: 2 }, this._scene);
        bodyMesh.position.y = 1; // Adjust the Y position to center the sphere on the ground
        bodyMesh.parent = bodyTransformNode; // Parent the body mesh to the TransformNode

        // Apply a blue material to the body
        const bodyMaterial = new StandardMaterial("enemyMaterial", this._scene);
        bodyMaterial.diffuseColor = new Color3(0, 0, 1); // Blue color
        bodyMesh.material = bodyMaterial;

        // Create a physics aggregate for the enemy
        const physicsAggregate = new PhysicsAggregate(
            bodyMesh,
            PhysicsShapeType.SPHERE,
            { mass: 1, restitution: 0.5 }, // Adjust mass and restitution as needed
            this._scene
        );

        // Store the physics aggregate for later use
        this._body = physicsAggregate.body;
    }

    public update(): void {
        if (!this._isActive) {
            return; // If the enemy is not active, do nothing
        }

        // Ensure the physics body and plugin are initialized before executing AI behavior
        if (!this._body?.['_pluginData']) {
            console.warn(`Enemy ${this.name} has an uninitialized physics body.`);
            return;
        }

        // Execute the current AI behavior
        this._aiBehavior(this, this._player);
    }

    private _defaultBehavior(enemy: Enemy, player: Player): void { // THIS IS NOT WORKING FOR SOME REASON
        // Ensure the physics body and plugin are initialized
        if (!enemy._body?.['_pluginData']) {
            console.warn(`Enemy ${enemy.name} has an uninitialized physics body.`);
            return;
        }

        // Get the player's position
        const playerPosition = player.position;

        // Calculate the direction vector toward the player
        const direction = playerPosition.subtract(enemy.position).normalize();

        // Move the enemy toward the player
        const moveSpeed = this._speed * 0.1; // Adjust the speed factor as needed
        enemy.position.addInPlace(direction.scale(moveSpeed));

        // Limit the enemy's speed
        const currentVelocity = enemy._body.getLinearVelocity();

        if (currentVelocity.length() > this._maxSpeed) {
            const clampedVelocity = currentVelocity.normalize().scale(this._maxSpeed);
            enemy._body.setLinearVelocity(clampedVelocity);
        }
    }

    public toggleActiveState(): void {
        this._isActive = !this._isActive; // Toggle the active state
        console.log(`Enemy ${this.name} is now ${this._isActive ? "active" : "inactive"}`);
    }

    public setAIBehavior(behavior: (enemy: Enemy, player: Player) => void): void {
        this._aiBehavior = behavior; // Set a custom AI behavior
    }
}