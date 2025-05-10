import { Scene, Vector3 } from "@babylonjs/core";
import { RoomModel } from "./model/roomModel";
import { Environment } from "./environment";
import { DoorModel } from "./model/doorModel";

export class Level {
    private readonly _scene: Scene;
    private _rooms: RoomModel[][];
    public static readonly ROOMS_GAP = 10;

    constructor(scene: Scene) {
        this._scene = scene;
    }

    // public generateSimpleRandomLevel(numberOfRoomsX:number, numberOfRoomsY:number, roomSize: Vector3): void {
    //     const environment = new Environment(this._scene);
    //     this._rooms = new RoomModel[numberOfRoomsX][numberOfRoomsY];
    //     for (let x = 0; x < this._rooms.length; x++) {
    //         for(let y = 0; y < this._rooms[x].length; y++) {
    //             const room = environment.createRoom(`Room${x}_${y}`, roomSize, new Vector3(x*Level.ROOMS_GAP, y*Level.ROOMS_GAP, 0));
    //             if(x != 0) {
    //                 const nextDoorRoom = this._rooms[x-1][y];
    //                 if(nextDoorRoom != null) {
    //                     room.addDoor(DoorModel.NORTH, nextDoorRoom);
    //                 }
    //             }
    //             if(x != this._rooms.length-1) {
    //                 const nextDoorRoom = this._rooms[x+1][y];
    //                 if(nextDoorRoom != null) {
    //                     room.addDoor(DoorModel.SOUTH, nextDoorRoom);
    //                 }
    //             }
    //             if(y != 0) {
    //                 const nextDoorRoom = this._rooms[x][y-1];
    //                 if(nextDoorRoom != null) {
    //                     room.addDoor(DoorModel.EAST, nextDoorRoom);
    //                 }
    //             }
    //             if(y != this._rooms[x].length-1) {
    //                 const nextDoorRoom = this._rooms[x][y-1];
    //                 if(nextDoorRoom != null) {
    //                     room.addDoor(DoorModel.WEST, nextDoorRoom);
    //                 }
    //             }
    //         }
    //     }

    // }

    // public generateSimpleGrid(gridSize: number, roomSize: Vector3): void {
    //     const environment = new Environment(scene);
    //             const room1 = environment.createRoom("Room1", ROOM_SIZE, ROOM1_POSITION);
    //             const room2 = environment.createRoom("Room2", ROOM_SIZE, ROOM2_POSITION);
    //             environment.createExit(room1, room2, "south");
    //     const spacing = roomSize.add(new Vector3(2, 0, 2)); // Add some space between rooms
    //     for (let x = 0; x < gridSize; x++) {
    //         for (let z = 0; z < gridSize; z++) {
    //             const center = new Vector3(x * spacing.x, 0, z * spacing.z);
    //             const room = new Room(`Room_${x}_${z}`, roomSize, center, this._scene);
    //             this._rooms.push(room);
    //         }
    //     }
    // }

    public getRooms(): RoomModel[][] {
        return this._rooms;
    }
}
