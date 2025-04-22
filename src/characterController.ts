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
    private _isInHallway: boolean = false; // Flag to track if the player is in the hallway

    constructor(name: string, scene: Scene, input: InputController) {
        super(name, scene);
        this._scene = scene;
        this._input = input;

        this._initialize();
        this._setupPlayerCamera();
    }

    private _initialize(): void {
        // Create the player's visual body (e.g., a red cylinder)
        const bodyMesh = MeshBuilder.CreateCylinder("playerBody", { diameter: 1, height: 2 }, this._scene);
        bodyMesh.position.y = 1; // Position the body above the ground
        bodyMesh.parent = this;

        // Apply a red material to the body
        const bodyMaterial = new StandardMaterial("playerMaterial", this._scene);
        bodyMaterial.diffuseColor = new Color3(1, 0, 0); // Red color
        bodyMesh.material = bodyMaterial;

        // Create a physics body for the player
        const shape = new PhysicsShapeMesh(bodyMesh, this._scene);
        this._body = new PhysicsBody(bodyMesh, PhysicsMotionType.DYNAMIC, false, this._scene);
        this._body.shape = shape;
        this._body.setMassProperties({ mass: 1 });

        // Lock rotation to keep the player upright

        this._body.setAngularDamping(10); // Dampen angular motion to prevent tilting

        // Enable collision callbacks
        this._body.setCollisionCallbackEnabled(true);

        // Listen for collision events
        const collisionObservable = this._body.getCollisionObservable();
        collisionObservable.add((collisionEvent) => {
            if (collisionEvent.type === "COLLISION_STARTED") {
                const otherObject = collisionEvent.collidedAgainst; // The other object involved in the collision
                if (otherObject?.transformNode?.metadata?.isGround) {
                    this._isGrounded = true; // Player is on the ground
                    this._isOnSlope = otherObject.transformNode.metadata.isSlope ?? false; // Check if the ground is a slope
                }
            } else if (collisionEvent.type === "COLLISION_FINISHED") {
                const otherObject = collisionEvent.collidedAgainst;
                if (otherObject?.transformNode?.metadata?.isGround) {
                    this._isGrounded = false; // Player left the ground
                    this._isOnSlope = false; // Reset slope status
                }
            }
        });
        collisionObservable.add((collisionEvent) => {
            if (collisionEvent.type === "COLLISION_STARTED") {
                const otherObject = collisionEvent.collidedAgainst; // The other object involved in the collision
                if (otherObject?.transformNode?.metadata?.isHallway) {
                    this._isInHallway = true; // Player is in the hallway
                }
            } else if (collisionEvent.type === "COLLISION_FINISHED") {
                const otherObject = collisionEvent.collidedAgainst;
                if (otherObject?.transformNode?.metadata?.isHallway) {
                    this._isInHallway = false; // Player left the hallway
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
            const force = cameraRelativeDirection.scale(5); // Adjust force for movement speed
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

        // Check if the player is on the hallway ground
        if (this._isInHallway && this._input.inputMap["j"]) {
            this._teleportToOtherRoom(); // Teleport to the other room
            this._input.inputMap["j"] = false; // Prevent continuous teleportation
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

    public updateCamera(): void {
        // Check if Q or E is pressed to rotate the camera
        if (!this._isRotating) { // Only allow rotation if the camera is not already rotating
            if (this._input.inputMap["q"]) {
                this._rotateCamera(-Math.PI / 2); // Rotate counterclockwise
                this._input.inputMap["q"] = false; // Prevent continuous rotation
            }
            if (this._input.inputMap["e"]) {
                this._rotateCamera(Math.PI / 2); // Rotate clockwise
                this._input.inputMap["e"] = false; // Prevent continuous rotation
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

    // Teleport the player to the opposite side of the hallway
    private _teleportToOtherRoom(): void {
        // Determine the current room and target room
        const currentRoomCenter = this._isInHallway ? new Vector3(0, 0, 30) : new Vector3(0, 0, 0); // Example positions
        const targetRoomCenter = this._isInHallway ? new Vector3(0, 0, 60) : new Vector3(0, 0, 30);

        // Move the player to the target room
        this.position = targetRoomCenter.clone().add(new Vector3(0, 1, 0)); // Slightly above the ground

        // Update the camera to center on the target room
        this.camera.target = targetRoomCenter;

        // Update the hallway flag
        this._isInHallway = !this._isInHallway;
    }
}