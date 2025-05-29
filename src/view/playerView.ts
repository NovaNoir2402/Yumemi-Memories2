import { ArcRotateCamera, Vector3, Scene, MeshBuilder, Mesh, Quaternion, Matrix } from "@babylonjs/core";
import { AdvancedDynamicTexture, Rectangle, Control, TextBlock, StackPanel } from "@babylonjs/gui";
import { Player } from "../entities/player/player";

import {
    Ray
} from "@babylonjs/core";

export class PlayerView {
    private player: Player;
    private scene: Scene;

    private healthBarBackground: Rectangle;
    private healthBarForeground: Rectangle;

    public camera: ArcRotateCamera;
    private cameraTarget: Mesh;

    private hud: AdvancedDynamicTexture;
    private healthBar: Rectangle;
    private healthText: TextBlock;

    private static readonly CAMERA_HEIGHT = 2;
    private static readonly CAMERA_Z_OFFSET = 20;
    private static readonly CAMERA_ROTATION_SPEED = Math.PI / 8;
    private static readonly CAMERA_ZOOM_SPEED = 1;
    private static readonly CAMERA_MIN_RADIUS = 0.1;
    private static readonly CAMERA_MAX_RADIUS = 15;
    private static readonly CAMERA_ROTATION_FRAMES = 30;
    private static readonly CAMERA_ROTATION_INTERVAL_MS = 8;

    constructor(player: Player, scene: Scene) {
        this.player = player;
        this.scene = scene;
    }

    public _setupHUD(): void {
        const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI", true, this.scene);

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
        this.healthBarBackground = new Rectangle();
        this.healthBarBackground.width = "200px";
        this.healthBarBackground.height = "20px";
        this.healthBarBackground.color = "white";
        this.healthBarBackground.background = "gray";
        this.healthBarBackground.thickness = 1;
        this.healthBarBackground.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        stackPanel.addControl(this.healthBarBackground);

        // Barre de vie rouge (au-dessus du fond)
        this.healthBarForeground = new Rectangle();
        this.healthBarForeground.width = "100%";
        this.healthBarForeground.height = "100%";
        this.healthBarForeground.background = "red";
        this.healthBarForeground.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.healthBarForeground.thickness = 0;
        this.healthBarBackground.addControl(this.healthBarForeground);

        // Mise à jour dynamique
        this.scene.registerBeforeRender(() => {
            const percentage = Math.max(0, this.player.health) / 100;
            this.healthBarForeground.width = `${percentage * 100}%`;
        });
    }

    private _onMouseMove: (event: MouseEvent) => void;

    public _setupCamera(): void {
        const canvas = this.scene.getEngine().getRenderingCanvas();
        canvas.addEventListener("click", () => {
            canvas.requestPointerLock();
            if (canvas.requestFullscreen) {
                canvas.requestFullscreen();
            }
        });

        // Prevent default actions for mouse buttons
        // canvas.addEventListener("mousedown", (e) => e.preventDefault());
        // canvas.addEventListener("mouseup", (e) => e.preventDefault());
        // canvas.addEventListener("contextmenu", (e) => e.preventDefault());

        this.camera = new ArcRotateCamera("Camera", 0, 0, 0, Vector3.Zero(), this.scene);
        this.camera.setPosition(new Vector3(0, PlayerView.CAMERA_HEIGHT, PlayerView.CAMERA_Z_OFFSET));
        this.camera.panningSensibility = 0;
        this.camera.wheelPrecision = 0;
        this.scene.activeCamera = this.camera;
        this.camera.beta = Math.PI / 4;

        this._onMouseMove = (event: MouseEvent) => {
            if (document.pointerLockElement === canvas) {
                const sensitivity = 0.002; // Adjust as needed
                this.camera.alpha -= event.movementX * sensitivity;
                this.camera.beta -= event.movementY * sensitivity;
                // Clamp beta to avoid flipping
                this.camera.beta = Math.max(0.5, Math.min(Math.PI / 2.5, this.camera.beta));
            }
        };
        canvas.addEventListener("mousemove", this._onMouseMove);

    }

    // --- Camera Logic ---
    private _isRotating = false;
    private _isZooming = false;

    public updateCamera(): void {
        // 1) On cible toujours le joueur
        const target = this.player._body.transformNode.position;
        this.camera.setTarget(target);

        // 2) On calcule la direction du joueur vers la caméra
        const direction = this.camera.position.subtract(target).normalize();

        // 3) On lance un rayon depuis le joueur vers la caméra
        const ray = new Ray(
            target,                        // origine = position du joueur
            direction,                     // vers la caméra
            PlayerView.CAMERA_MAX_RADIUS   // portée max = portée max autorisée
        );
        const pickInfo = this.scene.pickWithRay(
            ray,
            mesh => mesh !== this.player._mesh // on ignore le corps du joueur
        );

        // 4) On détermine la distance souhaitée
        let targetRadius = PlayerView.CAMERA_Z_OFFSET;
        if (pickInfo.hit) {
            targetRadius = Math.max(pickInfo.distance - 0.5, PlayerView.CAMERA_MIN_RADIUS);
        }

        // 5) On interpole la radius de manière fluide
        const smoothingFactor = 0.1;
        this.camera.radius += (targetRadius - this.camera.radius) * smoothingFactor;
        this.camera.radius = Math.min(this.camera.radius, PlayerView.CAMERA_MAX_RADIUS);

        // // 6) Continuous rotation while the button is pressed
        // if (this.player.controller.input.cameraRotation !== 0) {
        //     this._startContinuousRotation(this.player.controller.input.cameraRotation);
        // } else {
        //     this._stopContinuousRotation();
        // }

        // 7) Zoom manuel (molette / touches)
        if (this.player.controller.input.cameraZoom !== 0) {
            const newBeta = this.camera.beta + this.player.controller.input.cameraZoom * 0.02;
            this.camera.beta = Math.min(Math.max(newBeta, 0.5), Math.PI / 2.5);
        }
    }

    private _rotationInterval: NodeJS.Timeout | null = null;

    private _startContinuousRotation(direction: number): void {
        if (this._rotationInterval) return; // Prevent multiple intervals

        const step = direction * PlayerView.CAMERA_ROTATION_SPEED * 0.02; // Adjust speed as needed
        this._rotationInterval = setInterval(() => {
            this.camera.alpha += step;
        }, PlayerView.CAMERA_ROTATION_INTERVAL_MS);
    }

    private _stopContinuousRotation(): void {
        if (this._rotationInterval) {
            clearInterval(this._rotationInterval);
            this._rotationInterval = null;
        }
    }
}
