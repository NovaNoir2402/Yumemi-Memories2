import { Scene, Vector3 } from "@babylonjs/core";
import { RoomModel } from "./model/roomModel";
import { Environment } from "./environment";
import { EnemyManager } from "./entities/enemy/enemyManager";
import { DoorModel } from "./model/doorModel";

export class Level {
    private readonly _scene: Scene;
    private readonly _environment: Environment;
    private _rooms: RoomModel[][] = [];
    public static readonly ROOMS_GAP = 10;
    public enemyManager: EnemyManager | null = null;

    constructor(scene: Scene) {
        this._scene = scene;
        this._environment = new Environment(this._scene); // Initialize Environment
    }

    public setEnemyManager(enemyManager: EnemyManager): void {
        this.enemyManager = enemyManager;
    }

    public generateSimpleRandomLevel(numberOfRoomsX: number, numberOfRoomsY: number, roomSize: Vector3): RoomModel[][] {
        this._rooms = Array.from({ length: numberOfRoomsX }, () => Array<RoomModel>(numberOfRoomsY));

        for (let x = 0; x < numberOfRoomsX; x++) {
            for (let y = 0; y < numberOfRoomsY; y++) {
                const roomPosition = new Vector3(x * Level.ROOMS_GAP, 0, y * Level.ROOMS_GAP);
                const room = new RoomModel(`Room_${x}_${y}`, roomSize, roomPosition);
                this._rooms[x][y] = room;

                // Connect adjacent rooms
                if (x > 0) this.createExit(room, this._rooms[x - 1][y], "north");
                if (y > 0) this.createExit(room, this._rooms[x][y - 1], "west");
            }
        }

        // Set the initial room for the player
        const centerX = Math.floor(numberOfRoomsX / 2);
        const centerY = Math.floor(numberOfRoomsY / 2);
        this.playerEnterRoom(this._rooms[centerX][centerY]);
        return this._rooms;
    }

    public generateGrid(gridSizeX: number, gridSizeY: number, roomSize: Vector3): void {
        this._rooms = Array.from({ length: gridSizeX }, () => Array<RoomModel>(gridSizeY));

        for (let x = 0; x < gridSizeX; x++) {
            for (let y = 0; y < gridSizeY; y++) {
                const roomPosition = new Vector3(x * Level.ROOMS_GAP, 0, y * Level.ROOMS_GAP);
                const room = new RoomModel(`Room_${x}_${y}`, roomSize, roomPosition);
                this._rooms[x][y] = room;

                // Connect adjacent rooms
                if (x > 0) this.createExit(room, this._rooms[x - 1][y], "north");
                if (y > 0) this.createExit(room, this._rooms[x][y - 1], "west");
            }
        }

        // Set the initial room for the player
        const centerX = Math.floor(gridSizeX / 2);
        const centerY = Math.floor(gridSizeY / 2);
        this.playerEnterRoom(this._rooms[centerX][centerY]);
    }

    public createExit(room1: RoomModel, room2: RoomModel, direction: "north" | "south" | "east" | "west"): void {
            switch (direction) {
                case "north":
                    room1.addDoor(DoorModel.NORTH, room2);
                    room2.addDoor(DoorModel.SOUTH, room1);
                    break;
                case "south":
                    room1.addDoor(DoorModel.SOUTH, room2);
                    room2.addDoor(DoorModel.NORTH, room1);
                    break;
                case "east":
                    room1.addDoor(DoorModel.EAST, room2);
                    room2.addDoor(DoorModel.WEST, room1);
                    break;
                case "west":
                    room1.addDoor(DoorModel.WEST, room2);
                    room2.addDoor(DoorModel.EAST, room1);
                    break;
            }
        }

    public getRooms(): RoomModel[][] {
        return this._rooms;
    }

    public playerEnterRoom(room: RoomModel): void {
        this._environment.generateRoom(room); // Dynamically generate the room when the player enters

        // Spawn enemies in the entered room, if the EnemyManager is defined
        if (this.enemyManager) {
            this.enemyManager.spawnEnemies(room, 1); // Example: spawn 1
        }
    }
}