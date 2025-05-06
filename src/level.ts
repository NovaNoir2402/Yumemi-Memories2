import { Scene, Vector3 } from "@babylonjs/core";
import { Room } from "./room";

export class Level {
    private readonly _scene: Scene;
    private _rooms: Room[] = [];

    constructor(scene: Scene) {
        this._scene = scene;
    }

    public generateSimpleGrid(gridSize: number, roomSize: Vector3): void {
        const spacing = roomSize.add(new Vector3(2, 0, 2)); // Add some space between rooms
        for (let x = 0; x < gridSize; x++) {
            for (let z = 0; z < gridSize; z++) {
                const center = new Vector3(x * spacing.x, 0, z * spacing.z);
                const room = new Room(`Room_${x}_${z}`, roomSize, center, this._scene);
                this._rooms.push(room);
            }
        }
    }

    public getRooms(): Room[] {
        return this._rooms;
    }
}
