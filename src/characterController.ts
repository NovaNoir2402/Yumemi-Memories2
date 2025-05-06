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
    Mesh,
} from "@babylonjs/core";
import { InputController } from "./inputController";
import { Exit } from "./exit";
import { Room } from "./room";

export class Player extends TransformNode {
    public _scene: Scene;
    private _body: PhysicsBody;
    public camera: ArcRotateCamera;
    private _input: InputController;
    private _isGrounded: boolean = false;
    private _isOnSlope: boolean = false;
    private _currentRoom: Room | null = null;
    private _canTeleport: boolean = true;

    // Constants
    private static readonly BODY_HEIGHT = 2;
    private static readonly BODY_DIAMETER = 1;
    private static readonly BODY_MASS = 1;
    private static readonly BODY_COLOR = new Color3(1, 0, 0); // Red
    private static readonly BODY_Y_POSITION = Player.BODY_HEIGHT / 2;
    private static readonly ANGULAR_DAMPING = 10;

    private static readonly CAMERA_HEIGHT = 30;
    private static readonly CAMERA_Z_OFFSET = 40;
    private static readonly CAMERA_ROTATION_SPEED = Math.PI / 8;
    private static readonly CAMERA_ZOOM_SPEED = 1;
    private static readonly CAMERA_MIN_RADIUS = 0.1;
    private static readonly CAMERA_MAX_RADIUS = 50;

    private static readonly JUMP_FORCE = new Vector3(0, 10, 0);
    private static readonly MOVE_FORCE = 10;
    private static readonly MAX_SPEED = 15;
    private static readonly DAMPING_FACTOR = 0.95;
    private static readonly SLOPE_GRAVITY = 9;
    private static readonly SLOPE_ANGLE = Math.PI / 6;
    private static readonly TELEPORT_COOLDOWN_MS = 5000;
    private static readonly RAY_LENGTH = 2;
    private static readonly CAMERA_ROTATION_FRAMES = 30;
    private static readonly CAMERA_ROTATION_INTERVAL_MS = 8;

    constructor(name: string, scene: Scene, input: InputController, room: Room) {
        super(name, scene);
        this._scene = scene;
        this._input = input;
        this._currentRoom = room;

        this._initialize();
        this._setupCamera();
    }

    // --- Initialization ---
    private _initialize(): void {
        const bodyTransform = this._createTransformNode();
        const mesh = this._createBodyMesh(bodyTransform);
        this._setupPhysics(bodyTransform, mesh);
        this._setupCollisionListeners();
    }

    private _createTransformNode(): TransformNode {
        const transformNode = new TransformNode("playerBodyTransform", this._scene);
        transformNode.parent = this;
        return transformNode;
    }

    private _createBodyMesh(parent: TransformNode): Mesh {
        const mesh = MeshBuilder.CreateCylinder("playerBody", {
            diameter: Player.BODY_DIAMETER,
            height: Player.BODY_HEIGHT
        }, this._scene);
        mesh.position.y = Player.BODY_Y_POSITION;
        mesh.parent = parent;

        const material = new StandardMaterial("playerMaterial", this._scene);
        material.diffuseColor = Player.BODY_COLOR;
        mesh.material = material;

        return mesh;
    }

    private _setupPhysics(transformNode: TransformNode, mesh: Mesh): void {
        const shape = new PhysicsShapeMesh(mesh, this._scene);
        this._body = new PhysicsBody(transformNode, PhysicsMotionType.DYNAMIC, false, this._scene);
        this._body.shape = shape;
        this._body.setMassProperties({ mass: Player.BODY_MASS });
        this._body.setAngularDamping(Player.ANGULAR_DAMPING);
        this._body.setCollisionCallbackEnabled(true);
    }

    private _setupCamera(): void {
        this.camera = new ArcRotateCamera("Camera", 0, 0, 0, Vector3.Zero(), this._scene);
        this.camera.setPosition(new Vector3(0, Player.CAMERA_HEIGHT, Player.CAMERA_Z_OFFSET));
        this.camera.panningSensibility = 0;
        this.camera.wheelPrecision = 0;
        this._scene.activeCamera = this.camera;
    }

    // --- Camera Logic ---
    private _isRotating = false;
    private _isZooming = false;

    public updateCamera(): void {
        this.camera.setTarget(this._body.transformNode.position);

        if (!this._isRotating && this._input.cameraRotation !== 0) {
            const angle = this._input.cameraRotation * Player.CAMERA_ROTATION_SPEED;
            this._smoothCameraRotation(angle);
        }

        if (!this._isZooming && this._input.cameraZoom !== 0) {
            this._applyCameraZoom();
        }
    }

    private _smoothCameraRotation(angle: number): void {
        this._isRotating = true;
        const targetAlpha = this.camera.alpha + angle;
        const step = angle / Player.CAMERA_ROTATION_FRAMES;
        let currentFrame = 0;

        const interval = setInterval(() => {
            if (currentFrame++ >= Player.CAMERA_ROTATION_FRAMES) {
                clearInterval(interval);
                this.camera.alpha = targetAlpha;
                this._isRotating = false;
            } else {
                this.camera.alpha += step;
            }
        }, Player.CAMERA_ROTATION_INTERVAL_MS);
    }

    private _applyCameraZoom(): void {
        const newRadius = this.camera.radius - this._input.cameraZoom * Player.CAMERA_ZOOM_SPEED;
        this.camera.radius = Math.min(Math.max(newRadius, Player.CAMERA_MIN_RADIUS), Player.CAMERA_MAX_RADIUS);
    }

    // --- Collision ---
    private _setupCollisionListeners(): void {
        const observable = this._body.getCollisionObservable();

        observable.add(event => {
            const meta = event.collidedAgainst?.transformNode?.metadata;
            if (!meta) return;

            if (event.type === "COLLISION_STARTED" && meta.isGround) {
                this._isGrounded = true;
                this._isOnSlope = meta.isSlope ?? false;
            } else if (event.type === "COLLISION_FINISHED" && meta.isGround) {
                this._isGrounded = false;
                this._isOnSlope = false;
            }
        });

        observable.add(event => {
            const meta = event.collidedAgainst?.transformNode?.metadata;
            if (event.type === "COLLISION_STARTED" && meta?.isExit) {
                this._handleExitCollision(meta.exit);
            }
        });
    }

    private _handleExitCollision(exit: Exit): void {
        if (!this._canTeleport) return;

        const targetRoom = (exit.room1.name === this._currentRoom?.name) ? exit.room2 : exit.room1;
        this._teleportToRoom(targetRoom);

        this._canTeleport = false;
        setTimeout(() => {
            this._canTeleport = true;
        }, Player.TELEPORT_COOLDOWN_MS);
    }

    private _teleportToRoom(room: Room): void {
        this._body.disablePreStep = false;
        this._body.transformNode.position.copyFrom(room.center);

        this._currentRoom?._playerExit();
        room._playerEnter();
        this._currentRoom = room;

        this.camera.setTarget(room.center);
        this.camera.position = new Vector3(room.center.x, room.center.y + Player.CAMERA_HEIGHT, room.center.z + Player.CAMERA_Z_OFFSET);
    }

    public teleportToRoomCenter(): void {
        if (!this._currentRoom) return;

        this._body.disablePreStep = false;
        this._body.transformNode.position.copyFrom(this._currentRoom.center);
    }

    // --- Movement & Slope Logic ---
    public update(): void {
        this._input.update();
        this.updateCamera();
        if (this._input.debug) this.teleportToRoomCenter();

        this._checkIfOnSlope();

        const moveDir = new Vector3(this._input.horizontal, 0, this._input.vertical);
        if (moveDir.length() > 0 && this._body?._pluginData) {
            this._applyMovement(moveDir);
        } else if (this._body?._pluginData) {
            this._dampenVelocity();
        }

        if (this._body?._pluginData && this._isOnSlope) {
            const counterForce = Player.SLOPE_GRAVITY * Math.sin(Player.SLOPE_ANGLE);
            this._body.applyForce(new Vector3(0, counterForce, 0), this._body.getObjectCenterWorld());
        }

        if (this._input.jump && this._isGrounded) {
            this._body.applyImpulse(Player.JUMP_FORCE, this._body.getObjectCenterWorld());
            this._isGrounded = false;
        }

        if (this._body?._pluginData) {
            this._body.setAngularVelocity(Vector3.Zero());
        }
    }

    private _applyMovement(direction: Vector3): void {
        direction.normalize();

        const camForward = this.camera.getForwardRay().direction;
        camForward.y = 0;
        camForward.normalize();

        const camRight = Vector3.Cross(camForward, Vector3.Up()).normalize();
        const camRelative = camForward.scale(direction.z).add(camRight.scale(-direction.x)).normalize();

        const force = camRelative.scale(Player.MOVE_FORCE);
        this._body.applyForce(force, this._body.getObjectCenterWorld());

        const velocity = this._body.getLinearVelocity();
        if (velocity.length() > Player.MAX_SPEED) {
            this._body.setLinearVelocity(velocity.normalize().scale(Player.MAX_SPEED));
        }
    }

    private _dampenVelocity(): void {
        const velocity = this._body.getLinearVelocity();
        const damped = new Vector3(
            velocity.x * Player.DAMPING_FACTOR,
            velocity.y,
            velocity.z * Player.DAMPING_FACTOR
        );
        this._body.setLinearVelocity(this._isOnSlope ? Vector3.Zero() : damped);
    }

    private _checkIfOnSlope(): void {
        const directions = [
            new Vector3(0, -1, 0),
            new Vector3(0.5, -1, 0),
            new Vector3(-0.5, -1, 0),
            new Vector3(0, -1, 0.5),
            new Vector3(0, -1, -0.5),
        ];

        this._isOnSlope = directions.some(dir => {
            const ray = new Ray(this._body.getObjectCenterWorld(), dir, Player.RAY_LENGTH);
            const hit = this._scene.pickWithRay(ray, m => m.metadata?.isGround);
            return hit?.pickedMesh?.metadata?.isSlope;
        });
    }

    public get position(): Vector3 {
        return this._body?.transformNode?.position.clone() ?? Vector3.Zero();
    }
}