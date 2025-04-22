import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, Color4, PhysicsAggregate, HavokPlugin, PhysicsShapeType } from "@babylonjs/core";
import { AdvancedDynamicTexture, Button, Control } from "@babylonjs/gui";
import { Environment } from "./environment";
import { Player } from "./characterController";
import HavokPhysics from "@babylonjs/havok";
import { InputController } from "./inputController";

enum State {
    START = 0,
    GAME = 1,
    LOSE = 2,
    CUTSCENE = 3
}

class App {
    private _canvas: HTMLCanvasElement;
    private _engine: Engine;
    private _scene: Scene;
    private _state: State = State.START;

    constructor() {
        this._canvas = this._createCanvas();
        this._engine = new Engine(this._canvas, true);

        this._main();
    }

    private _createCanvas(): HTMLCanvasElement {
        const canvas = document.createElement("canvas");
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.id = "gameCanvas";
        document.body.appendChild(canvas);
        return canvas;
    }

    private async _main(): Promise<void> {
        await this._goToStart();

        this._engine.runRenderLoop(() => {
            switch (this._state) {
                case State.START:
                case State.CUTSCENE:
                case State.GAME:
                case State.LOSE:
                    this._scene.render();
                    break;
                default:
                    break;
            }
        });

        window.addEventListener("resize", () => {
            this._engine.resize();
        });
    }

    private _addCameraAndLight(scene: Scene, cameraName: string): { camera: ArcRotateCamera; light: HemisphericLight } {
        const camera = new ArcRotateCamera(cameraName, Math.PI / 2, Math.PI / 2, 10, Vector3.Zero(), scene);
        camera.attachControl(this._canvas, true);

        const light = new HemisphericLight(`${cameraName}Light`, new Vector3(0, 1, 0), scene);

        return { camera, light };
    }

    private async _goToStart(): Promise<void> {
        this._scene?.dispose();
        const scene = new Scene(this._engine);
        scene.clearColor = new Color4(0, 0, 0, 1);

        const { camera, light } = this._addCameraAndLight(scene, "StartCamera");

        camera.lowerRadiusLimit = 5;
        light.intensity = 0.8;

        const guiMenu = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        const startButton = Button.CreateSimpleButton("start", "START GAME");
        startButton.width = 0.2;
        startButton.height = "40px";
        startButton.color = "white";
        startButton.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        guiMenu.addControl(startButton);

        startButton.onPointerUpObservable.add(() => {
            this._goToGame();
        });

        this._scene = scene;
        this._state = State.START;
    }

    private async _goToGame(): Promise<void> {
        this._scene?.dispose();
        const scene = new Scene(this._engine);
        scene.clearColor = new Color4(0.015, 0.015, 0.203);

        // Load Havok plugin
        const havokInterface = await HavokPhysics();
        const havokPlugin = new HavokPlugin(undefined, havokInterface);
        scene.enablePhysics(new Vector3(0, -9.81, 0), havokPlugin);

        const { camera, light } = this._addCameraAndLight(scene, "GameCamera");

        // Create the environment
        const environment = new Environment(scene);
        // Create two rooms
        const room1 = environment.createRoom("Room1", new Vector3(40, 3, 40), new Vector3(0, 0, 0));
        const room2 = environment.createRoom("Room2", new Vector3(40, 3, 40), new Vector3(0, 0, 45));

        // Create an exit between the two rooms
        environment.createExit(room1, room2, "south");

        // Create the input controller
        const inputController = new InputController(scene);

        // Create the player
        const player = new Player("player", scene, inputController);

        // Add a lose game button
        const guiMenu = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        const loseButton = Button.CreateSimpleButton("lose", "LOSE GAME");
        loseButton.width = 0.2;
        loseButton.height = "40px";
        loseButton.color = "white";
        loseButton.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        guiMenu.addControl(loseButton);

        loseButton.onPointerUpObservable.add(() => {
            this._goToLose();
        });

        // Update the player and camera in the render loop
        this._engine.runRenderLoop(() => {
            scene.render();
            player.update();
        });

        this._scene = scene;
        this._state = State.GAME;
    }

    private async _goToLose(): Promise<void> {
        this._scene?.dispose();
        const scene = new Scene(this._engine);
        scene.clearColor = new Color4(0.5, 0, 0, 1);

        const { camera, light } = this._addCameraAndLight(scene, "LoseCamera");

        camera.lowerRadiusLimit = 2;
        light.intensity = 0.5;

        const guiMenu = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        const restartButton = Button.CreateSimpleButton("restart", "RESTART");
        restartButton.width = 0.2;
        restartButton.height = "40px";
        restartButton.color = "white";
        restartButton.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        guiMenu.addControl(restartButton);

        restartButton.onPointerUpObservable.add(() => {
            this._goToStart();
        });

        this._scene = scene;
        this._state = State.LOSE;
    }

    private async _goToCutScene(): Promise<void> {
        this._scene?.dispose();
        const scene = new Scene(this._engine);
        scene.clearColor = new Color4(0, 0, 0, 1);

        const { camera, light } = this._addCameraAndLight(scene, "CutSceneCamera");

        camera.upperRadiusLimit = 15;
        light.intensity = 0.7;

        const guiMenu = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        const nextButton = Button.CreateSimpleButton("next", "NEXT");
        nextButton.width = 0.2;
        nextButton.height = "40px";
        nextButton.color = "white";
        nextButton.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        guiMenu.addControl(nextButton);

        nextButton.onPointerUpObservable.add(() => {
            this._goToGame();
        });

        this._scene = scene;
        this._state = State.CUTSCENE;
    }
}

new App();