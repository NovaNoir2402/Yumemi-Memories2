import {
    TransformNode,
    Scene,
    MeshBuilder,
    Vector3,
    StandardMaterial,
    Color3,
    UniversalCamera,
    PhysicsBody,
    PhysicsMotionType,
    PhysicsShapeMesh,
    Ray,
    ArcRotateCamera,
} from "@babylonjs/core";
import { InputController } from "./inputController";
import { Exit } from "./exit";
import { Room } from "./room";

export class Player extends TransformNode {
    public _scene: Scene;
    private _body: PhysicsBody;
    private _camRoot: TransformNode;
    private _yTilt: TransformNode;
    public camera: ArcRotateCamera;
    private _input: InputController;
    private _isGrounded: boolean = false;
    private _isOnSlope: boolean = false;
    private _groundedTimeout: any;
    private _currentRoom: Room | null = null;
    private _canTeleport: boolean = true;

    constructor(name: string, scene: Scene, input: InputController, room: Room) {
        super(name, scene);
        this._scene = scene;
        this._input = input;
        this._currentRoom = room;

        this._initialize();
        this._setupPlayerCamera();
    }

    private _initialize(): void {
        // Create a TransformNode for the player's body
        const bodyTransformNode = new TransformNode("playerBodyTransform", this._scene);
        bodyTransformNode.parent = this;

        // Create the player's visual body (e.g., a red cylinder)
        const bodyMesh = MeshBuilder.CreateCylinder("playerBody", { diameter: 1, height: 2 }, this._scene);
        bodyMesh.position.y = 1; // Position the body above the ground
        bodyMesh.parent = bodyTransformNode; // Parent the body mesh to the TransformNode

        // Apply a red material to the body
        const bodyMaterial = new StandardMaterial("playerMaterial", this._scene);
        bodyMaterial.diffuseColor = new Color3(1, 0, 0); // Red color
        bodyMesh.material = bodyMaterial;

        // Create a physics body for the player
        const shape = new PhysicsShapeMesh(bodyMesh, this._scene);
        this._body = new PhysicsBody(bodyTransformNode, PhysicsMotionType.DYNAMIC, false, this._scene);
        this._body.shape = shape;
        this._body.setMassProperties({ mass: 1 });

        // Lock rotation to keep the player upright
        this._body.setAngularDamping(10); // Dampen angular motion to prevent tilting

        // Enable collision callbacks
        this._body.setCollisionCallbackEnabled(true);

        // Listen for collision events (existing logic remains unchanged)
        const collisionObservable = this._body.getCollisionObservable();
        collisionObservable.add((collisionEvent) => {
            if (collisionEvent.type === "COLLISION_STARTED") {
                const otherObject = collisionEvent.collidedAgainst;
                if (otherObject?.transformNode?.metadata?.isGround) {
                    this._isGrounded = true;
                    this._isOnSlope = otherObject.transformNode.metadata.isSlope ?? false;
                }
            } else if (collisionEvent.type === "COLLISION_FINISHED") {
                const otherObject = collisionEvent.collidedAgainst;
                if (otherObject?.transformNode?.metadata?.isGround) {
                    this._isGrounded = false;
                    this._isOnSlope = false;
                }
            }
        });
        collisionObservable.add((collisionEvent) => {
            if (collisionEvent.type === "COLLISION_STARTED") {
                const otherObject = collisionEvent.collidedAgainst; // The other object involved in the collision
                if (otherObject?.transformNode?.metadata?.isExit) {
                    const exit = otherObject.transformNode.metadata.exit; // Get the exit object
                    console.log(`Player collided with exit: ${exit.name}`); // Log the exit name
                    this._handleExitCollision(exit); // Handle the exit collision
                }
            }
        });
    }

    private _setupPlayerCamera(): void {
        // Create an ArcRotateCamera for a top-down view
        this.camera = new ArcRotateCamera("Camera", 0, 0, 0, new Vector3(0, 0, 0), this._scene);

        // Position the camera high above the scene
        //this.camera.radius = 70; // Distance from the target
        this.camera.setPosition(new Vector3(0, 30, 40));

        // Lock the camera's radius to prevent zooming
        // this.camera.lowerRadiusLimit = 30;
        // this.camera.upperRadiusLimit = 30;

        // Disable panning and zooming
        this.camera.panningSensibility = 0;
        this.camera.wheelPrecision = 0;

        // Attach the camera to the canvas
        // this.camera.attachControl(this._scene.getEngine().getRenderingCanvas(), true);

        // Set the active camera
        this._scene.activeCamera = this.camera;
    }

    public update(): void {
        this._input.update();
        this.updateCamera(); // Update camera position
        // Check if the player pressed the "M" key for teleportation
        if (this._input.debug) {
            this.teleportToRoomCenter();
        }

        // Periodically check if the player is on a slope
        this._checkIfOnSlope();

        // Movement
        const moveDirection = new Vector3(this._input.horizontal, 0, this._input.vertical);
        if (moveDirection.length() > 0 && this._body?._pluginData) {
            moveDirection.normalize();

            // Get the camera's forward and right vectors
            const cameraForward = this.camera.getForwardRay().direction;
            cameraForward.y = 0; // Ignore the Y component
            cameraForward.normalize();

            const cameraRight = Vector3.Cross(cameraForward, Vector3.Up()).normalize();

            // Calculate the movement direction relative to the camera
            const cameraRelativeDirection = cameraForward.scale(moveDirection.z).add(cameraRight.scale(-moveDirection.x));
            cameraRelativeDirection.normalize();

            // Apply force in the camera-relative direction
            const force = cameraRelativeDirection.scale(10); // Adjust force for movement speed
            this._body.applyForce(force, this._body.getObjectCenterWorld());

            // Limit the player's speed to a maximum value
            const currentVelocity = this._body.getLinearVelocity();
            const maxSpeed = 15; // Maximum speed
            if (currentVelocity.length() > maxSpeed) {
                const clampedVelocity = currentVelocity.normalize().scale(maxSpeed);
                this._body.setLinearVelocity(clampedVelocity);
            }
        } else if (this._body?._pluginData) {
            // Gradually reduce horizontal velocity if no input
            const currentVelocity = this._body.getLinearVelocity();
            const dampingFactor = 0.95; // Adjust damping factor for smooth deceleration
            this._body.setLinearVelocity(new Vector3(currentVelocity.x * dampingFactor, currentVelocity.y, currentVelocity.z * dampingFactor));

            // Check if the player is on a slope
            if (this._isOnSlope) {
                this._body.setLinearVelocity(new Vector3(0, 0, 0));
            }
        }

        // Counteract gravity on slopes
        if (this._body?._pluginData && this._isOnSlope) {
            const slopeAngle = Math.PI / 6; // Example: 30-degree slope
            const gravityForce = 9; // Gravitational acceleration
            const counterForce = gravityForce * Math.sin(slopeAngle); // Component of gravity along the slope
            this._body.applyForce(new Vector3(0, counterForce, 0), this._body.getObjectCenterWorld());
        }

        // Jumping
        if (this._input.jump && this._isGrounded) {
            const jumpForce = new Vector3(0, 10, 0); // Adjust jump force
            this._body.applyImpulse(jumpForce, this._body.getObjectCenterWorld());
            this._isGrounded = false; // Prevent double jumps
        }

        if (this._body?._pluginData) {
            this._body.setAngularVelocity(Vector3.Zero());
        }
    }

    private _checkIfOnSlope(): void {
        const rayLength = 2; // Length of the ray
        const directions = [
            new Vector3(0, -1, 0), // Directly below
            new Vector3(0.5, -1, 0), // Front-right
            new Vector3(-0.5, -1, 0), // Front-left
            new Vector3(0, -1, 0.5), // Back-right
            new Vector3(0, -1, -0.5), // Back-left
        ];

        let isSlopeDetected = false;

        for (const direction of directions) {
            const ray = new Ray(this._body.getObjectCenterWorld(), direction, rayLength);
            const hit = this._scene.pickWithRay(ray, (mesh) => mesh.metadata?.isGround);

            if (hit?.pickedMesh?.metadata?.isSlope) {
                isSlopeDetected = true;
                break; // Stop checking as soon as a slope is detected
            }
        }

        this._isOnSlope = isSlopeDetected;
    }


    private _isRotating: boolean = false; // Flag to track if the camera is rotating
    private _isZooming: boolean = false; // Flag to track if the camera is zooming
    private _zoomLimit: number = 50; // Maximum zoom limit
    private _zoomSpeed: number = 1; // Speed of zooming

    public updateCamera(): void {
        // Set the camera's target to the player's position
        this.camera.setTarget(this._body.transformNode.position);

        // Check if there is any camera rotation input
        if (!this._isRotating && this._input.cameraRotation !== 0) {
            const rotationAngle = this._input.cameraRotation * (Math.PI / 8); // Adjust rotation angle as needed
            this._rotateCamera(rotationAngle);
        }
        // Check if the camera is zooming
        if (!this._isZooming && this._input.cameraZoom !== 0) {
            const zoomAmount = this._input.cameraZoom * this._zoomSpeed; // Adjust zoom speed as needed
            const newRadius = this.camera.radius - zoomAmount; // Calculate the new radius

            // Clamp the radius to the zoom limit
            if (newRadius > 10 && newRadius < this._zoomLimit) {
                this.camera.radius = newRadius; // Update the camera's radius
            } else if (newRadius <= 0) {
                this.camera.radius = 0.1; // Prevent negative radius
            }
        }
    }

    // Smoothly rotate the camera by a given angle
    private _rotateCamera(angle: number): void {
        if (this._isRotating) return; // Prevent multiple rotations at the same time
        this._isRotating = true; // Set the flag to indicate the camera is rotating

        const targetAlpha = this.camera.alpha + angle; // Calculate the target alpha
        const animationFrames = 30; // Number of frames for the animation
        const step = (targetAlpha - this.camera.alpha) / animationFrames; // Calculate the step size

        let currentFrame = 0;

        // Create an interval to smoothly update the camera's alpha
        const interval = setInterval(() => {
            if (currentFrame >= animationFrames) {
                clearInterval(interval); // Stop the animation when done
                this.camera.alpha = targetAlpha; // Ensure the final value is set
                this._isRotating = false; // Allow rotation again
            } else {
                this.camera.alpha += step; // Incrementally update the alpha
                currentFrame++;
            }
        }, 8); // Run at ~120 FPS (8ms per frame)
    }


    private _handleExitCollision(exit: Exit): void {
        if (!this._canTeleport) {
            console.log("Teleportation is on cooldown.");
            return; // Exit early if teleportation is on cooldown
        }

        console.log(`Handling collision with exit between rooms: ${exit.room1.name} and ${exit.room2.name}`);

        // Determine the room to teleport to
        const targetRoom = exit.room1.name === this._currentRoom?.name ? exit.room2 : exit.room1;

        // Teleport the player to the target room
        this._teleportToRoom(targetRoom);

        // Set teleportation on cooldown
        this._canTeleport = false;

        // Reset the cooldown after 5 seconds
        setTimeout(() => {
            this._canTeleport = true;
            console.log("Teleportation cooldown reset.");
        }, 5000); // 5 seconds cooldown
    }

    private _teleportToRoom(room: Room): void {
        console.log(`Teleporting player to room: ${room.name}`);

        // Temporarily disable physics updates
        this._body.disablePreStep = false;

        // Move the player to the target room
        this._body.transformNode.position.copyFrom(room.center); // Update the TransformNode's position

        // Exit the current room
        if (this._currentRoom) {
            this._currentRoom._playerExit(); // Call the room's player exit method
        }

        room._playerEnter(); // Call the room's player enter method

        // Update the current room
        this._currentRoom = room;

        // Move the camera to the center of the new room
        this.camera.setTarget(room.center); // Set the camera's target to the room center
        this.camera.position = new Vector3(room.center.x, room.center.y + 30, room.center.z + 40); // Adjust the camera's position relative to the room center

    }

    public teleportToRoomCenter(): void {

        if (this._currentRoom) {

            console.log("Teleporting player to room center");
            // Temporarily disable physics updates
            this._body.disablePreStep = false;

            // Move the TransformNode to the center of the current room
            this._body.transformNode.position.copyFrom(this._currentRoom.center);

        }
    }

    public get position(): Vector3 {
        // Always return a value, even if the player is not initialized
        if (this._body?.transformNode) {
            return this._body.transformNode.position.clone(); // Return a clone of the position to avoid direct modification
        }
        return Vector3.Zero(); // Return a default position (Vector3.Zero) if uninitialized
    }
}