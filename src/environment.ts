import { Scene, Vector3 } from "@babylonjs/core";
import { Room } from "./room";
import { Exit } from "./exit";

export class Environment {
    private _scene: Scene;
    private _rooms: Room[] = [];

    constructor(scene: Scene) {
        this._scene = scene;
    }

    public createRoom(name: string, size: Vector3, position: Vector3): Room {
        const room = new Room(name, size, position, this._scene);
        this._rooms.push(room);
        return room;
    }

    public createExit(room1: Room, room2: Room, direction: "north" | "south" | "east" | "west"): void {
        const exit = new Exit(room1, room2);
        room1.setExit(exit, direction);

        // Automatically set the opposite exit in the connected room
        const oppositeDirection = this._getOppositeDirection(direction);
        room2.setExit(exit, oppositeDirection);
    }

    private _getOppositeDirection(direction: "north" | "south" | "east" | "west"): "north" | "south" | "east" | "west" {
        switch (direction) {
            case "north":
                return "south";
            case "south":
                return "north";
            case "east":
                return "west";
            case "west":
                return "east";
            default:
                throw new Error(`Invalid direction: ${direction}`);
        }
    }
}