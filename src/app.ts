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
import { AdvancedDynamicTexture, Button, Control, Rectangle, TextBlock } from "@babylonjs/gui";
import { Level } from "./level";
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
        this._scene = new Scene(this._engine);
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
        // clear previous scene if exists
        this._scene?.dispose();
        // Create a new scene
        const scene = new Scene(this._engine);
        scene.clearColor = SCENE_COLOR_START;

        const { camera, light } = this._addCameraAndLight(scene, "StartCamera");
        camera.lowerRadiusLimit = CAMERA_START_RADIUS_LIMIT;
        light.intensity = LIGHT_INTENSITY_START;

        // Create fullscreen UI
        const guiMenu = AdvancedDynamicTexture.CreateFullscreenUI("StartUI");

        // Create a popup rectangle for the start menu
        const popup = new Rectangle("startPopup");
        popup.width = "400px";
        popup.height = "250px";
        popup.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        popup.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        popup.background = "rgba(30, 30, 30, 0.95)";
        popup.cornerRadius = 20;
        popup.thickness = 2;
        popup.color = "white";
        guiMenu.addControl(popup);

        // Title text
        const titleText = new TextBlock();
        titleText.text = "START MENU";
        titleText.color = "white";
        titleText.fontSize = 48;
        titleText.height = "80px";
        titleText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        titleText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        popup.addControl(titleText);

        // Start button
        const startButton = Button.CreateSimpleButton("start", "START GAME");
        startButton.width = "180px";
        startButton.height = "50px";
        startButton.color = "white";
        startButton.background = "#222";
        startButton.cornerRadius = 10;
        startButton.fontSize = 24;
        startButton.top = "80px";
        startButton.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        startButton.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        popup.addControl(startButton);

        startButton.onPointerUpObservable.add(() => {
            guiMenu.dispose();
            this._goToGame();
        });

        this._scene = scene;
        this._state = State.START;
    }

    private async _goToGame(): Promise<void> {
        // Dispose previous scene if exists
        this._scene?.dispose();
        // Create a new scene for the game
        const scene = new Scene(this._engine);
        scene.clearColor = SCENE_COLOR_GAME;

        const havokInterface = await HavokPhysics();
        const havokPlugin = new HavokPlugin(undefined, havokInterface);
        scene.enablePhysics(PHYSICS_GRAVITY, havokPlugin);

        this._addCameraAndLight(scene, "GameCamera");

        const level = new Level(scene);
        console.log("Début chargement niveau")
        // const rooms = level.generateSimpleRandomLevel(4, 4, ROOM_SIZE);
        const rooms = level.generateStage(8, 4, 4, ROOM_SIZE_2);
        console.log("Fin chargement")


        const inputController = new InputController(scene);
        const player = new Player("player", scene, rooms[2][2], level);
        level.playerEnterRoom(rooms[2][2]);

        const enemyManager = new EnemyManager(scene, player);
        level.setEnemyManager(enemyManager);

        // Add a lose game button
        const guiMenu = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        const loseButton = Button.CreateSimpleButton("lose", "LOSE GAME");
        loseButton.width = BUTTON_WIDTH;
        loseButton.height = BUTTON_HEIGHT;
        loseButton.color = BUTTON_COLOR;
        loseButton.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        // guiMenu.addControl(loseButton);
        // const minimap = this._createMinimap(level, player);

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
            // minimap.update(); // Update minimap highlight
        });

        this._scene = scene;
        this._state = State.GAME;
    }

    private _loseOverlay: AdvancedDynamicTexture | null = null;

    private async _goToLose(): Promise<void> {
        // Remove previous overlay if it exists
        if (this._loseOverlay) {
            this._loseOverlay.dispose();
        }

        this._loseOverlay = AdvancedDynamicTexture.CreateFullscreenUI("LoseUI");

        // Create a popup rectangle
        const popup = new Rectangle("popup");
        popup.width = "800px";
        popup.height = "200px";
        popup.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        popup.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        popup.background = "rgba(30, 30, 30, 0.95)";
        popup.cornerRadius = 20;
        popup.thickness = 2;
        popup.color = "white";
        this._loseOverlay.addControl(popup);

        // Game Over text
        const loseText = new TextBlock();
        loseText.text = "GAME OVER";
        loseText.color = "red";
        loseText.fontSize = 48;
        loseText.height = "80px";
        loseText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        loseText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        popup.addControl(loseText);

        // Info text
        const infoText = new TextBlock();
        infoText.text = "Please refresh the browser to restart the game.";
        infoText.color = "white";
        infoText.fontSize = 24;
        infoText.height = "60px";
        infoText.top = "60px";
        infoText.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        infoText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        popup.addControl(infoText);

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