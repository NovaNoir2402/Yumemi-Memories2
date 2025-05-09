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

    public _setupCamera(): void {
        this.camera = new ArcRotateCamera("Camera", 0, 0, 0, Vector3.Zero(), this.scene);
        this.camera.setPosition(new Vector3(0, PlayerView.CAMERA_HEIGHT, PlayerView.CAMERA_Z_OFFSET));
        this.camera.panningSensibility = 0;
        this.camera.wheelPrecision = 0;
        this.scene.activeCamera = this.camera;
    }

    // --- Camera Logic ---
    private _isRotating = false;
    private _isZooming = false;

    public updateCamera(): void {
        // 1) On cible toujours le joueur
        const target = this.player._body.transformNode.position;//.add(new Vector3(2, PlayerController.CAMERA_HEIGHT, 0));
        this.camera.setTarget(target);
    
        // 2) On calcule la direction du joueur vers la caméra
        const direction = this.camera.position.subtract(target).normalize();
    
        // 3) On lance un rayon depuis le joueur vers la caméra
        const ray = new Ray(
            target,                        // origine = position du joueur
            direction,                     // vers la caméra
            PlayerView.CAMERA_MAX_RADIUS       // portée max = portée max autorisée
        );
        const pickInfo = this.scene.pickWithRay(
            ray,
            mesh => mesh !== this.player._mesh      // on ignore le corps du joueur
        );
    
        // 4) On détermine la distance souhaitée
        //    - par défaut, on reste à la distance « normale » CAMERA_Z_OFFSET
        //    - si on detecte un obstacle, on se place juste devant
        let targetRadius = PlayerView.CAMERA_Z_OFFSET;
        if (pickInfo.hit) {
            targetRadius = Math.max(pickInfo.distance - 0.5, PlayerView.CAMERA_MIN_RADIUS);
        }
    
        // 5) On interpole la radius de manière fluide
        const smoothingFactor = 0.1;
        this.camera.radius += (targetRadius - this.camera.radius) * smoothingFactor;
        this.camera.radius = Math.min(this.camera.radius, PlayerView.CAMERA_MAX_RADIUS);
    
        // 6) Rotation fluide autour du joueur
        if (!this._isRotating && this.player.controller.input.cameraRotation !== 0) {
            const angle = this.player.controller.input.cameraRotation * PlayerView.CAMERA_ROTATION_SPEED;
            this._smoothCameraRotation(angle);
        }
    
        // 7) Zoom manuel (molette / touches
        if (this.player.controller.input.cameraZoom !== 0) {
            const newBeta = this.camera.beta + this.player.controller.input.cameraZoom * 0.02;
            this.camera.beta = Math.min(Math.max(newBeta, 0.5), Math.PI / 2.5);
        }
    }
    

    private _smoothCameraRotation(angle: number): void {
        this._isRotating = true;
        const targetAlpha = this.camera.alpha + angle;
        const step = angle / PlayerView.CAMERA_ROTATION_FRAMES;
        let currentFrame = 0;
    
        const interval = setInterval(() => {
            if (currentFrame++ >= PlayerView.CAMERA_ROTATION_FRAMES) {
                clearInterval(interval);
                this.camera.alpha = targetAlpha;
                this._isRotating = false;
            } else {
                this.camera.alpha += step;
            }
        }, PlayerView.CAMERA_ROTATION_INTERVAL_MS);
    }
}
