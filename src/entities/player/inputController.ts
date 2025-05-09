import { Scene, ActionManager, ExecuteCodeAction } from "@babylonjs/core";

export class InputController {
    public inputMap: { [key: string]: boolean } = {};
    public vertical: number = 0; // Forward/backward movement
    public horizontal: number = 0; // Left/right movement
    public jump: boolean = false;
    public cameraRotation: number = 0; // Camera rotation
    public cameraZoom: number = 0; // Camera zoom
    public debug: number = 0 // Debug mode for teleportation
    public shoot: boolean = false; // Shooting action

    constructor(scene: Scene) {
        scene.actionManager = new ActionManager(scene);

        // Register keydown and keyup events
        scene.actionManager.registerAction(
            new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, (evt) => {
                this.inputMap[evt.sourceEvent.key] = true;
            })
        );
        scene.actionManager.registerAction(
            new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, (evt) => {
                this.inputMap[evt.sourceEvent.key] = false;
            })
        );
    }

    public update(): void {
        // Map inputs to movement directions
        this.vertical = (this.inputMap["z"] ? 1 : 0) - (this.inputMap["s"] ? 1 : 0);
        this.horizontal = (this.inputMap["d"] ? 1 : 0) - (this.inputMap["q"] ? 1 : 0);
        this.jump = this.inputMap[" "]; // Spacebar for jumping
        this.cameraRotation = (this.inputMap["ArrowLeft"] ? -1 : 0) + (this.inputMap["ArrowRight"] ? 1 : 0); // Arrow keys for camera rotation
        this.cameraZoom = (this.inputMap["ArrowUp"] ? 1 : 0) - (this.inputMap["ArrowDown"] ? 1 : 0); // Arrow keys for camera zoom
        // M button for debug teleport
        this.debug = this.inputMap["m"] ? 1 : 0;
        this.shoot = this.inputMap["f"]; // F key for shooting
    }
}