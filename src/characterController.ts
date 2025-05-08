import {
    TransformNode,
    Scene,
    MeshBuilder,
    Vector3,
    StandardMaterial,
    Color3,
    PhysicsBody,
    PhysicsMotionType,
    PhysicsShapeMesh,
    Ray,
    ArcRotateCamera,
    Mesh,
} from "@babylonjs/core";

import {
    Control,
    PlanePanel,
    Rectangle,
    TextBlock,
    AdvancedDynamicTexture,
    StackPanel,
} from "@babylonjs/gui";

import { InputController } from "./inputController";
import { Exit } from "./exit";
import { Room } from "./room";
import { Bullet } from "./bullet";
import { Entity } from "./entity";

export class Player extends Entity  {
    public _scene: Scene;
    public camera: ArcRotateCamera;
    private readonly _input: InputController;
    private _isGrounded: boolean = false;
    private _isOnSlope: boolean = false;
    private _currentRoom: Room | null = null;
    private _canTeleport: boolean = true;
    private _hasShot: boolean = false;
    private _canShoot: boolean = true;
    public onDeath?: () => void;

    private _healthBarBackground: Rectangle;
    private _healthBarForeground: Rectangle;

    // Constants
    private static readonly BODY_HEIGHT = 2;
    private static readonly BODY_DIAMETER = 1;
    private static readonly BODY_MASS = 1;
    private static readonly BODY_COLOR = new Color3(1, 0, 0); // Red
    private static readonly BODY_Y_POSITION = 0; // Player.BODY_HEIGHT / 2;
    private static readonly ANGULAR_DAMPING = 1;

    private static readonly CAMERA_HEIGHT = 10;
    private static readonly CAMERA_Z_OFFSET = 20;
    private static readonly CAMERA_ROTATION_SPEED = Math.PI / 8;
    private static readonly CAMERA_ZOOM_SPEED = 1;
    private static readonly CAMERA_MIN_RADIUS = 0.1;
    private static readonly CAMERA_MAX_RADIUS = 10;

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
    private static readonly BULLET_DAMAGE = 30;
    
    private static readonly SHOOT_COOLDOWN_MS = 300;
    private _health: number = 100;
    private _canTakeDamage: boolean = true;
    private static readonly DAMAGE_COOLDOWN_MS = 2000;

    constructor(name: string, scene: Scene, input: InputController, room: Room) {
        super(name, scene);
        this._input = input;
        this._currentRoom = room;

        this._initialize();
        this._setupCamera();
        this._setupHUD();
    }

    // --- Initialization ---
    private _initialize(): void {
        const transformNode = new TransformNode("playerBodyTransform", this._scene);
        transformNode.parent = this;

        this._mesh = MeshBuilder.CreateCylinder("playerBody", {
            diameter: Player.BODY_DIAMETER,
            height: Player.BODY_HEIGHT
        }, this._scene);
        this._mesh.position.y = Player.BODY_Y_POSITION;
        this._mesh.parent = transformNode;

        const material = new StandardMaterial("playerMaterial", this._scene);
        material.diffuseColor = Player.BODY_COLOR;
        this._mesh.material = material;

        this._initPhysicsMesh(this._mesh, PhysicsMotionType.DYNAMIC, Player.BODY_MASS, Player.ANGULAR_DAMPING);
        this._setupCollisionListeners();
    }

    private _setupHUD(): void {
        const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI", true, this._scene);
    
        // Conteneur principal
        const healthContainer = new Rectangle();
        healthContainer.width = "220px";
        healthContainer.height = "60px";
        healthContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        healthContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        healthContainer.paddingTop = "10px";
        healthContainer.paddingLeft = "10px";
        advancedTexture.addControl(healthContainer);
    
        const stackPanel = new StackPanel();
        stackPanel.isVertical = true;
        healthContainer.addControl(stackPanel);
    
        // Fond de la barre de vie
        this._healthBarBackground = new Rectangle();
        this._healthBarBackground.width = "200px";
        this._healthBarBackground.height = "20px";
        this._healthBarBackground.color = "white";
        this._healthBarBackground.background = "gray";
        this._healthBarBackground.thickness = 1;
        this._healthBarBackground.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        stackPanel.addControl(this._healthBarBackground);
    
        // Barre de vie rouge (au-dessus du fond)
        this._healthBarForeground = new Rectangle();
        this._healthBarForeground.width = "100%";
        this._healthBarForeground.height = "100%";
        this._healthBarForeground.background = "red";
        this._healthBarForeground.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        this._healthBarForeground.thickness = 0;
        this._healthBarBackground.addControl(this._healthBarForeground);
    
        // Mise à jour dynamique
        this._scene.registerBeforeRender(() => {
            const percentage = Math.max(0, this._health) / 100;
            this._healthBarForeground.width = `${percentage * 100}%`;
        });
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
        // 1) On cible toujours le joueur
        const target = this._body.transformNode.position;
        this.camera.setTarget(target);
    
        // 2) On calcule la direction du joueur vers la caméra
        const direction = this.camera.position.subtract(target).normalize();
    
        // 3) On lance un rayon depuis le joueur vers la caméra
        const ray = new Ray(
            target,                        // origine = position du joueur
            direction,                     // vers la caméra
            Player.CAMERA_MAX_RADIUS       // portée max = portée max autorisée
        );
        const pickInfo = this._scene.pickWithRay(
            ray,
            mesh => mesh !== this._mesh      // on ignore le corps du joueur
        );
    
        // 4) On détermine la distance souhaitée
        //    - par défaut, on reste à la distance « normale » CAMERA_Z_OFFSET
        //    - si on detecte un obstacle, on se place juste devant
        let targetRadius = Player.CAMERA_Z_OFFSET;
        if (pickInfo.hit) {
            targetRadius = Math.max(pickInfo.distance - 0.5, Player.CAMERA_MIN_RADIUS);
        }
    
        // 5) On interpole la radius de manière fluide
        const smoothingFactor = 0.1;
        this.camera.radius += (targetRadius - this.camera.radius) * smoothingFactor;
        this.camera.radius = Math.min(this.camera.radius, Player.CAMERA_MAX_RADIUS);
    
        // 6) Rotation fluide autour du joueur
        if (!this._isRotating && this._input.cameraRotation !== 0) {
            const angle = this._input.cameraRotation * Player.CAMERA_ROTATION_SPEED;
            this._smoothCameraRotation(angle);
        }
    
        // 7) Zoom manuel (molette / touches)
        if (this._input.cameraZoom !== 0) {
            const newBeta = this.camera.beta + this._input.cameraZoom * 0.02;
            this.camera.beta = Math.min(Math.max(newBeta, 0.1), Math.PI / 2.5);
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

    public takeDamage(amount: number): void {
        if (!this._canTakeDamage) return;
    
        this._health -= amount;
        console.log(`Player took ${amount} damage! Remaining health: ${this._health}`);
    
        this._canTakeDamage = false;
        setTimeout(() => {
            this._canTakeDamage = true;
        }, Player.DAMAGE_COOLDOWN_MS);
    
        if (this._health <= 0) {
            this.onDeath();
        }
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

        observable.add(event => {
            if (event.type !== "COLLISION_STARTED") return;
        
            const otherTransform = event.collidedAgainst?.transformNode;
            if (!otherTransform) return;
        
            const entity = otherTransform.metadata?.entity;
            if (entity && entity._isLethal) {
                const damage = (entity as any).damage ?? 10;
                this.takeDamage(damage);
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

        if (this._input.shoot && this._canShoot) {
            this._input.shoot = false;
            this._canShoot = false;
        
            const cameraForward = this.camera.getForwardRay().direction;
            const shootOrigin = this._body.transformNode.position.add(cameraForward.scale(1));
            new Bullet(this._scene, shootOrigin, cameraForward, Player.BULLET_DAMAGE);
        
            setTimeout(() => {
                this._canShoot = true;
            }, Player.SHOOT_COOLDOWN_MS);
        }
    }

    private _shootBullet(): void {
        // Starting point at camera
        const origin = this.camera.position.clone();
        const forward = this.camera.getForwardRay().direction.clone();
        // Offset bullet start a bit forward to avoid collision with player
        const startPos = origin.add(forward.scale(2));

        // Create bullet
        new Bullet(this._scene, startPos, forward, Player.BULLET_DAMAGE);
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

    protected _dampenVelocity(): void {
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

    public get health(): number {
        return this._health;
    }
}