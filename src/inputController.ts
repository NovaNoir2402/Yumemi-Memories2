import { Scene, ActionManager, ExecuteCodeAction } from "@babylonjs/core";

export class InputController {
    public inputMap: { [key: string]: boolean } = {};
    public vertical: number = 0; // Forward/backward movement
    public horizontal: number = 0; // Left/right movement
    public jump: boolean = false;

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
        this.vertical = (this.inputMap["w"] ? 1 : 0) - (this.inputMap["s"] ? 1 : 0);
        this.horizontal = (this.inputMap["d"] ? 1 : 0) - (this.inputMap["a"] ? 1 : 0);
        this.jump = this.inputMap[" "]; // Spacebar for jumping
    }
}