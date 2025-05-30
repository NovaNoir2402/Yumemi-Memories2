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

    private minimapUI?: AdvancedDynamicTexture;
    private minimapContainer?: Rectangle;
    private roomRects?: Rectangle[][];
    private minimapLevel?: any; // Level type
    private minimapPlayer?: Player;

    private enemyLeftContainer: Rectangle;
    private enemyLeftText: TextBlock;
    private enemyLeftSubText: TextBlock;

    constructor(player: Player, scene: Scene) {
        this.player = player;
        this.scene = scene;
    }

    public _setupHUD(): void {
        const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI", true, this.scene);

        // --- ENEMY LEFT HUD ---
        this.enemyLeftContainer = new Rectangle();
        this.enemyLeftContainer.width = "320px";
        this.enemyLeftContainer.height = "70px";
        this.enemyLeftContainer.thickness = 0;
        this.enemyLeftContainer.background = "transparent";
        this.enemyLeftContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        this.enemyLeftContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        this.enemyLeftContainer.top = "10px";
        advancedTexture.addControl(this.enemyLeftContainer);

        const enemyStack = new StackPanel();
        enemyStack.isVertical = true;
        this.enemyLeftContainer.addControl(enemyStack);

        this.enemyLeftText = new TextBlock();
        this.enemyLeftText.fontSize = 32;
        this.enemyLeftText.color = "red";
        this.enemyLeftText.text = "ENEMY LEFT: ?";
        this.enemyLeftText.height = "40px";
        enemyStack.addControl(this.enemyLeftText);

        this.enemyLeftSubText = new TextBlock();
        this.enemyLeftSubText.fontSize = 18;
        this.enemyLeftSubText.color = "red";
        this.enemyLeftSubText.text = "Doors are locked!";
        this.enemyLeftSubText.height = "24px";
        enemyStack.addControl(this.enemyLeftSubText);

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

        // Minimap
        this.createMinimap(this.player.controller._level, this.player);

        // Mise à jour dynamique
        this.scene.registerBeforeRender(() => {
            const percentage = Math.max(0, this.player.health) / 100;
            this.healthBarForeground.width = `${percentage * 100}%`;
        });

        // --- Dynamic update for ENEMY LEFT HUD ---
        this.scene.registerBeforeRender(() => {
            // Get the current room and enemy count
            const currentRoom = this.player.controller.currentRoom;
            let enemiesLeft = 0;
            if (currentRoom && this.player.controller._level.enemyManager) {
                enemiesLeft = this.player.controller._level.enemyManager.countEnemies();
            }
            if (enemiesLeft > 0) {
                this.enemyLeftText.text = `ENEMY LEFT: ${enemiesLeft}`;
                this.enemyLeftText.color = "red";
                this.enemyLeftSubText.text = "Doors are locked!";
                this.enemyLeftSubText.color = "red";
            } else {
                this.enemyLeftText.text = "ENEMY LEFT: 0";
                this.enemyLeftText.color = "#2196f3"; // blue
                this.enemyLeftSubText.text = "Doors are unlocked!";
                this.enemyLeftSubText.color = "#2196f3";
            }
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

    public createMinimap(level: any, player: Player): void {
        this.minimapLevel = level;
        this.minimapPlayer = player;
        this.minimapUI = AdvancedDynamicTexture.CreateFullscreenUI("MinimapUI", true, this.scene);
        this.minimapContainer = new Rectangle("minimapContainer");
        this.minimapContainer.width = "180px";
        this.minimapContainer.height = "180px";
        this.minimapContainer.thickness = 2;
        this.minimapContainer.background = "rgba(0,0,0,0.5)";
        this.minimapContainer.cornerRadius = 10;
        this.minimapContainer.color = "white";
        this.minimapContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        this.minimapContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        this.minimapContainer.top = "20px";
        this.minimapContainer.left = "-20px";
        this.minimapUI.addControl(this.minimapContainer);

        const roomsGrid = level.getRooms();
        const gridRows = roomsGrid.length;
        const gridCols = roomsGrid[0].length;
        this.roomRects = [];

        for (let y = 0; y < gridRows; y++) {
            this.roomRects[y] = [];
            for (let x = 0; x < gridCols; x++) {
                const room = roomsGrid[y][x];
                if (!room) continue;

                const roomRect = new Rectangle();
                roomRect.width = "18px";
                roomRect.height = "18px";
                roomRect.thickness = 1;
                roomRect.background = "#bbb";
                roomRect.color = "#333";
                roomRect.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
                roomRect.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
                roomRect.left = `${10 + x * 20}px`;
                roomRect.top = `${10 + y * 20}px`;
                this.minimapContainer.addControl(roomRect);
                this.roomRects[y][x] = roomRect;
            }
        }
        // Initial update
        this.updateMinimap();
    }

    public updateMinimap(): void {
        if (!this.roomRects || !this.minimapLevel || !this.minimapPlayer) return;
        const roomsGrid = this.minimapLevel.getRooms();
        const gridRows = roomsGrid.length;
        const gridCols = roomsGrid[0].length;
        let currentRoom = this.minimapPlayer.controller?.currentRoom;
        for (let y = 0; y < gridRows; y++) {
            for (let x = 0; x < gridCols; x++) {
                const rect = this.roomRects[y][x];
                if (!rect) continue;
                const room = roomsGrid[y][x];
                if (!room) continue;

                if (room === currentRoom) {
                    // Current room: yellow/orange border
                    rect.background = "#ff0";
                    rect.thickness = 3;
                    rect.color = "#f80";
                } else if (room.IS_CLEARED) {
                    // Cleared room: blue
                    rect.background = "#2196f3";
                    rect.thickness = 2;
                    rect.color = "#1976d2";
                } else {
                    // Unvisited/uncleared room: gray
                    rect.background = "#bbb";
                    rect.thickness = 1;
                    rect.color = "#333";
                }
            }
        }
    }
}
