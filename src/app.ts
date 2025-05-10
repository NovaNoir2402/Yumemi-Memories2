import HavokPhysics from "@babylonjs/havok";
import { Environment } from "./environment";
import { HavokPlugin } from "@babylonjs/core/Physics";
import { Scene } from "@babylonjs/core/scene";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Color4, Vector3 } from "@babylonjs/core/Maths";
import { Engine } from "@babylonjs/core/Engines";
import { InputController } from "./controller/inputController";
import { Player } from "./entities/player/player";
import { EnemyManager } from "./entities/enemy/enemyManager";
import { AdvancedDynamicTexture, Button, Control } from "@babylonjs/gui";
// Constants
const CANVAS_ID = "gameCanvas";
const CAMERA_RADIUS = 10;
const CAMERA_START_RADIUS_LIMIT = 5;
const CAMERA_LOSE_RADIUS_LIMIT = 2;
const CAMERA_CUTSCENE_UPPER_RADIUS_LIMIT = 15;

const LIGHT_INTENSITY_START = 0.8;
const LIGHT_INTENSITY_LOSE = 0.5;
const LIGHT_INTENSITY_CUTSCENE = 0.7;

const ROOM_SIZE = new Vector3(40, 3, 40);
const ROOM_SIZE_2 = new Vector3(50, 3, 100);
const ENEMY_COUNT_ROOM1 = 2;

const BUTTON_WIDTH = 0.2;
const BUTTON_HEIGHT = "40px";
const BUTTON_COLOR = "white";

const SCENE_COLOR_START = new Color4(0, 0, 0, 1);
const SCENE_COLOR_GAME = new Color4(0.015, 0.015, 0.203);
const SCENE_COLOR_LOSE = new Color4(0.5, 0, 0, 1);

const PHYSICS_GRAVITY = new Vector3(0, -9.81, 0);

enum State {
    START = 0,
    GAME = 1,
    LOSE = 2,
    CUTSCENE = 3
}

// App Class
class App {
    private readonly _canvas: HTMLCanvasElement;
    private readonly _engine: Engine;
    private _scene: Scene;
    private _state: State = State.START;

    constructor() {
        this._canvas = this._createCanvas();
        this._engine = new Engine(this._canvas, true);
        this._main();
    }

    private _createCanvas(): HTMLCanvasElement {
        const canvas = document.createElement("canvas");
        canvas.id = CANVAS_ID;
        canvas.style.position = "absolute";
        canvas.style.top = "0";
        canvas.style.left = "0";
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        document.body.style.margin = "0";
        document.body.style.overflow = "hidden";
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
            }
        });

        window.addEventListener("resize", () => {
            this._canvas.width = window.innerWidth;
            this._canvas.height = window.innerHeight;
            this._engine.resize();
        });
    }

    private _addCameraAndLight(scene: Scene, cameraName: string): { camera: ArcRotateCamera; light: HemisphericLight } {
        const camera = new ArcRotateCamera(cameraName, Math.PI / 2, Math.PI / 2, CAMERA_RADIUS, Vector3.Zero(), scene);
        camera.attachControl(this._canvas, true);

        const light = new HemisphericLight(`${cameraName}Light`, new Vector3(0, 1, 0), scene);

        return { camera, light };
    }

    private async _goToStart(): Promise<void> {
        this._scene?.dispose();
        const scene = new Scene(this._engine);
        scene.clearColor = SCENE_COLOR_START;

        const { camera, light } = this._addCameraAndLight(scene, "StartCamera");
        camera.lowerRadiusLimit = CAMERA_START_RADIUS_LIMIT;
        light.intensity = LIGHT_INTENSITY_START;

        const guiMenu = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        const startButton = Button.CreateSimpleButton("start", "START GAME");
        startButton.width = BUTTON_WIDTH;
        startButton.height = BUTTON_HEIGHT;
        startButton.color = BUTTON_COLOR;
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
        scene.clearColor = SCENE_COLOR_GAME;

        const havokInterface = await HavokPhysics();
        const havokPlugin = new HavokPlugin(undefined, havokInterface);
        scene.enablePhysics(PHYSICS_GRAVITY, havokPlugin);

        this._addCameraAndLight(scene, "GameCamera");

        const environment = new Environment(scene);
        console.log("Début chargement niveau")
        const rooms = environment.generateSimpleRandomLevel(4, 4, ROOM_SIZE);
        console.log("Fin chargement")
        // const environment = new Environment(scene);
        // const room1 = environment.createRoom("Room1", ROOM_SIZE);
        // const room2 = environment.createRoom("Room2", ROOM_SIZE_2);
        // environment.createExit(room1, room2, "north");

        const inputController = new InputController(scene);
        const player = new Player("player", scene, rooms[2][2], environment);
        environment.playerEnter(rooms[2][2]);

        const enemyManager = new EnemyManager(scene, player);
        // enemyManager.spawnEnemies(room1, 1); // Spawn 1 enemy in room1
        // enemyManager.toggleAllEnemies(); // Deactivate all enemies
    
        // Add a lose game button
        const guiMenu = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        const loseButton = Button.CreateSimpleButton("lose", "LOSE GAME");
        loseButton.width = BUTTON_WIDTH;
        loseButton.height = BUTTON_HEIGHT;
        loseButton.color = BUTTON_COLOR;
        loseButton.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        guiMenu.addControl(loseButton);

        player.onDeath = () => {
            this._goToLose();
        };

        loseButton.onPointerUpObservable.add(() => {
            this._goToLose();
        });

        this._engine.runRenderLoop(() => {
            scene.render();
            player.update();
            enemyManager.updateEnemies();
        });

        this._scene = scene;
        this._state = State.GAME;
    }

    private async _goToLose(): Promise<void> {
        this._scene?.dispose();
        const scene = new Scene(this._engine);
        scene.clearColor = SCENE_COLOR_LOSE;

        const { camera, light } = this._addCameraAndLight(scene, "LoseCamera");
        camera.lowerRadiusLimit = CAMERA_LOSE_RADIUS_LIMIT;
        light.intensity = LIGHT_INTENSITY_LOSE;

        const guiMenu = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        const restartButton = Button.CreateSimpleButton("restart", "RESTART");
        restartButton.width = BUTTON_WIDTH;
        restartButton.height = BUTTON_HEIGHT;
        restartButton.color = BUTTON_COLOR;
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
        scene.clearColor = SCENE_COLOR_START;

        const { camera, light } = this._addCameraAndLight(scene, "CutSceneCamera");
        camera.upperRadiusLimit = CAMERA_CUTSCENE_UPPER_RADIUS_LIMIT;
        light.intensity = LIGHT_INTENSITY_CUTSCENE;

        const guiMenu = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        const nextButton = Button.CreateSimpleButton("next", "NEXT");
        nextButton.width = BUTTON_WIDTH;
        nextButton.height = BUTTON_HEIGHT;
        nextButton.color = BUTTON_COLOR;
        nextButton.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        guiMenu.addControl(nextButton);

        nextButton.onPointerUpObservable.add(() => {
            this._goToGame();
        });

        this._scene = scene;
        this._state = State.CUTSCENE;
    }
}

let app = new App();
