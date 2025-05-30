import { FreeCamera, Vector3, Scene, MeshBuilder, Mesh, Quaternion } from "@babylonjs/core";
import { AdvancedDynamicTexture, Rectangle, Control, TextBlock, StackPanel } from "@babylonjs/gui";
import { Player } from "../entities/player/player";

export class PlayerView {
    private player: Player;
    private scene: Scene;

    private healthBarBackground: Rectangle;
    private healthBarForeground: Rectangle;

    public camera: FreeCamera;
    private hud: AdvancedDynamicTexture;
    private healthBar: Rectangle;
    private healthText: TextBlock;

    private static readonly CAMERA_HEIGHT = 1.6; // Adjust for FPS eye level

    private _onMouseMove: (event: MouseEvent) => void;

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
        const canvas = this.scene.getEngine().getRenderingCanvas();

        canvas.addEventListener("click", () => {
            canvas.requestPointerLock();
            if (canvas.requestFullscreen) {
                canvas.requestFullscreen();
            }
        });

        // Create a FreeCamera for FPS controls
        this.camera = new FreeCamera("FpsCamera", new Vector3(0, PlayerView.CAMERA_HEIGHT, 0), this.scene);
        // Disable built-in inputs
        this.camera.inputs.clear();

        this.camera.inertia = 0;
        this.camera.angularSensibility = 500; // Adjust to taste
        this.scene.activeCamera = this.camera;

        // Set up our custom mouse movement handler
        this._onMouseMove = (event: MouseEvent) => {
            if (document.pointerLockElement === canvas) {
                const sensitivity = 0.002;
                // Update yaw and pitch regardless of mouse button state
                this.camera.rotation.y += event.movementX * sensitivity;
                this.camera.rotation.x += event.movementY * sensitivity;
                // Clamp pitch between -90° and +90° (in radians)
                const limit = Math.PI / 2 - 0.1;
                this.camera.rotation.x = Math.max(-limit, Math.min(limit, this.camera.rotation.x));
            }
        };
        canvas.addEventListener("mousemove", this._onMouseMove);
    }

    public updateCamera(): void {
        if (!this.camera || !this.player._body || !this.scene) return;
        // Position the camera at the player's head.
        const playerPos = this.player._body.transformNode.position.clone();
        playerPos.y += PlayerView.CAMERA_HEIGHT;
        this.camera.position.copyFrom(playerPos);

        // (Optional) Update the player visual (if any) to follow the camera’s yaw:
        if (this.player.controller.assets?.mesh) {
            // Only update the Y rotation from the camera so the player faces the same way
            const yaw = this.camera.rotation.y;
            this.player.controller.assets.mesh.rotationQuaternion = Quaternion.FromEulerAngles(0, yaw, 0);
        }
    }
}
