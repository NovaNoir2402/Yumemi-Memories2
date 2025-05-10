import {
    TransformNode,
    Scene,
    MeshBuilder,
    Vector3,
    StandardMaterial,
    Color3,
    PhysicsMotionType,
    Ray,
    Mesh,
} from "@babylonjs/core";

import "@babylonjs/loaders/glTF/2.0/glTFLoader";
import "@babylonjs/core/Materials/Textures/Loaders/envTextureLoader";
import "@babylonjs/core/Animations/animatable";

import { InputController } from "./inputController";
import { Bullet } from "../entities/player/bullet";
import { Environment } from "../environment";
import { RoomModel } from "../model/roomModel";
import { Player } from "../entities/player/player";

export class PlayerController {
    public scene: Scene;
    public input: InputController;
    private isGrounded: boolean = false;
    private isOnSlope: boolean = false;
    private currentRoom: RoomModel | null = null;
    private readonly _environment: Environment;
    public onDeath?: () => void;
    public assets: { mesh: Mesh; } | null = null;
    private player: Player;

    // Constants
    private static readonly BODY_HEIGHT = 2;
    private static readonly BODY_DIAMETER = 1;
    private static readonly BODY_MASS = 1;
    private static readonly BODY_COLOR = new Color3(1, 0, 0); // Red
    private static readonly BODY_Y_POSITION = 0; // PlayerController.BODY_HEIGHT / 2;
    private static readonly ANGULAR_DAMPING = 1;

    private static readonly JUMP_FORCE = new Vector3(0, 10, 0);
    private static readonly MOVE_FORCE = 10;
    private static readonly MAX_SPEED = 15;
    private static readonly DAMPING_FACTOR = 0.95;
    private static readonly SLOPE_GRAVITY = 9;
    private static readonly SLOPE_ANGLE = Math.PI / 6;
    private static readonly TELEPORT_COOLDOWN_MS = 5000;
    private static readonly RAY_LENGTH = 2;
    private static readonly BULLET_DAMAGE = 30;
    
    private static readonly SHOOT_COOLDOWN_MS = 300;
    private static readonly DAMAGE_COOLDOWN_MS = 2000;

    constructor(name: string, player: Player, scene: Scene, room: RoomModel, environment: Environment) {
        this.scene = scene;
        this.input = new InputController(scene);
        this.currentRoom = room;
        this.player = player;
        this._environment = environment;
      }

    public initialize(): void {
        const transformNode = new TransformNode("playerBodyTransform", this.scene);
        transformNode.parent = this.player;
      
        this.player._mesh = MeshBuilder.CreateCylinder("playerBody", {
            diameter: PlayerController.BODY_DIAMETER,
            height: PlayerController.BODY_HEIGHT
        }, this.scene);
        this.player._mesh.position.y = PlayerController.BODY_Y_POSITION;
        this.player._mesh.parent = transformNode;

        const material = new StandardMaterial("playerMaterial", this.scene);
        material.diffuseColor = PlayerController.BODY_COLOR;
        this.player._mesh.material = material;
        
        this.player._initPhysicsMesh(this.player._mesh, PhysicsMotionType.DYNAMIC, PlayerController.BODY_MASS, PlayerController.ANGULAR_DAMPING);
        this._setupCollisionListeners();

        this.player._body.disablePreStep = false;
        this.player._body.transformNode.position.y = PlayerController.BODY_Y_POSITION + 1;
    }
    
    private _setupCollisionListeners(): void {
        const observable = this.player._body.getCollisionObservable();

        observable.add(event => {
            const meta = event.collidedAgainst?.transformNode?.metadata;
            if (!meta) return;

            if (event.type === "COLLISION_STARTED" && meta.isGround) {
                this.isGrounded = true;
                this.isOnSlope = meta.isSlope ?? false;
            } else if (event.type === "COLLISION_FINISHED" && meta.isGround) {
                this.isGrounded = false;
                this.isOnSlope = false;
            }
        });

        observable.add(event => {
            const meta = event.collidedAgainst?.transformNode?.metadata;
            if (event.type === "COLLISION_STARTED" && meta?.isDoor) {
                this._handleDoorCollision(meta.connectedRoom);
            }
        });

        observable.add(event => {
            if (event.type !== "COLLISION_STARTED") return;
        
            const otherTransform = event.collidedAgainst?.transformNode;
            if (!otherTransform) return;
        
            const entity = otherTransform.metadata?.entity;
            if (entity && entity._isLethal) {
                const damage = (entity as any).damage ?? 10;
                this.player.takeDamage(damage);
            }
        });
    }

    private _handleDoorCollision(targetRoom: RoomModel): void {
        if (!this.player._canTeleport) return;

        this._teleportToRoom(targetRoom, this._environment);

        this.player._canTeleport = false;
        setTimeout(() => {
            this.player._canTeleport = true;
        }, PlayerController.TELEPORT_COOLDOWN_MS);
    }

    private _teleportToRoom(room: RoomModel, environment: Environment): void {
        this.player._body.disablePreStep = false;
        this.player._body.transformNode.position.copyFrom(new Vector3(0, 1, 0));

        environment.playerEnter(room);
        this.currentRoom = room;

    }

    public update(): void {
        if (!this.player._body) {
            console.warn("PlayerController body is not initialized yet.");
            return;
        }
        this.input.update();
        this._checkIfOnSlope();

        const moveDir = new Vector3(this.input.horizontal, 0, this.input.vertical);
        if (moveDir.length() > 0 && this.player._body?._pluginData) {
            this._applyMovement(moveDir);
        } else if (this.player._body?._pluginData) {
            this._dampenVelocity();
        }

        if (this.player._body?._pluginData && this.isOnSlope) {
            const counterForce = PlayerController.SLOPE_GRAVITY * Math.sin(PlayerController.SLOPE_ANGLE);
            this.player._body.applyForce(new Vector3(0, counterForce, 0), this.player._body.getObjectCenterWorld());
        }

        if (this.input.jump && this.isGrounded) {
            this.player._body.applyImpulse(PlayerController.JUMP_FORCE, this.player._body.getObjectCenterWorld());
            this.isGrounded = false;
        }

        if (this.player._body?._pluginData) {
            this.player._body.setAngularVelocity(Vector3.Zero());
        }

        if (this.input.shoot && this.player._canShoot) {
            this._shootBullet();
            setTimeout(() => {
                this.player._canShoot = true;
            }, PlayerController.SHOOT_COOLDOWN_MS);
        }
    }

    private _shootBullet(): void {
        this.input.shoot = false;
        this.player._canShoot = false;
        
        const cameraForward = this.player.view.camera.getForwardRay().direction;
        const shootOrigin = this.player._body.transformNode.position.add(cameraForward.scale(1));
        new Bullet(this.scene, shootOrigin, cameraForward, PlayerController.BULLET_DAMAGE);
    }

    private _applyMovement(direction: Vector3): void {
        direction.normalize();

        const camForward = this.player.view.camera.getForwardRay().direction;
        camForward.y = 0;
        camForward.normalize();

        const camRight = Vector3.Cross(camForward, Vector3.Up()).normalize();
        const camRelative = camForward.scale(direction.z).add(camRight.scale(-direction.x)).normalize();

        const force = camRelative.scale(PlayerController.MOVE_FORCE);
        this.player._body.applyForce(force, this.player._body.getObjectCenterWorld());

        const velocity = this.player._body.getLinearVelocity();
        if (velocity.length() > PlayerController.MAX_SPEED) {
            this.player._body.setLinearVelocity(velocity.normalize().scale(PlayerController.MAX_SPEED));
        }
    }

    protected _dampenVelocity(): void {
        const velocity = this.player._body.getLinearVelocity();
        const damped = new Vector3(
            velocity.x * PlayerController.DAMPING_FACTOR,
            velocity.y,
            velocity.z * PlayerController.DAMPING_FACTOR
        );
        this.player._body.setLinearVelocity(this.isOnSlope ? Vector3.Zero() : damped);
    }

    private _checkIfOnSlope(): void {
        const directions = [
            new Vector3(0, -1, 0),
            new Vector3(0.5, -1, 0),
            new Vector3(-0.5, -1, 0),
            new Vector3(0, -1, 0.5),
            new Vector3(0, -1, -0.5),
        ];

        this.isOnSlope = directions.some(dir => {
            const ray = new Ray(this.player._body.getObjectCenterWorld(), dir, PlayerController.RAY_LENGTH);
            const hit = this.scene.pickWithRay(ray, m => m.metadata?.isGround);
            return hit?.pickedMesh?.metadata?.isSlope;
        });
    }

    public get position(): Vector3 {
        return this.player._body?.transformNode?.position.clone() ?? Vector3.Zero();
    }

    public set position(position: Vector3) {
        this.player._body.transformNode.position = position;
    }

    /*
    private async _loadCharacterAssets(scene: Scene): Promise<void> {
        async function loadCharacter(): Promise<{ mesh: Mesh; animationGroups: AnimationGroup[] }> {
            // Create a collision mesh (invisible box)
            const outer = MeshBuilder.CreateBox("outer", { width: 2, depth: 1, height: 3 }, scene);
            outer.isVisible = false;
            outer.isPickable = false;
            outer.checkCollisions = true;

            // Move the origin of the box collider to the bottom of the mesh
            outer.bakeTransformIntoVertices(Matrix.Translation(0, 1.5, 0));

            // Configure collision ellipsoid
            outer.ellipsoid = new Vector3(1, 1.5, 1);
            outer.ellipsoidOffset = new Vector3(0, 1.5, 0);

            // Rotate the player mesh 180 degrees to face the correct direction
            outer.rotationQuaternion = new Quaternion(0, 1, 0, 0);

            // Import the player model
            return SceneLoader.ImportMeshAsync(null, "./models/", "character-human.glb", scene).then((result) => {
                const root = result.meshes[0];
                const body = root; // The main player mesh
                body.parent = outer;
                body.isPickable = false;

                // Disable picking for all child meshes
                body.getChildMeshes().forEach((m) => {
                    m.isPickable = false;
                });

                // Return the collision mesh and animation groups
                return {
                    mesh: outer,
                    animationGroups: result.animationGroups,
                };
            });
        }

        // Load the character and store the assets
        return loadCharacter().then((assets) => {
            this.assets = assets;
        });
    }
    */
}