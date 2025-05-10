import { Scene, Vector3 } from "@babylonjs/core";
import { RoomModel } from "./model/roomModel";
import { DoorModel } from "./model/doorModel";
import { RoomView } from "./view/roomView";
import { RoofModel } from "./model/roofModel";
import { WallModel } from "./model/wallModel";
import { Level } from "./level";

export class Environment {
    private readonly _scene: Scene;
    private _rooms: RoomModel[][];
    private _currentRoomView: RoomView | null = null;

    public static readonly FULL_OPACITY = 1;

    constructor(scene: Scene) {
        this._scene = scene;
    }

    // public createRoom(name: string, size: Vector3, position: Vector3): RoomModel {
    //     const room = new RoomModel(name, size, position);
    //     this._rooms.push(room);
    //     // this._roomViews.push(new RoomView(this._scene, room));

    //     if (!this._currentRoomView) {
    //         this._currentRoomView = new RoomView(this._scene, room);
    //     }
        
    //     return room;
    // }

    // public createRoom(name: string, size: Vector3, position: Vector3): RoomModel {
    //     const room = new RoomModel(name, size, position);
    //     this._rooms.push(room);
    //     // this._roomViews.push(new RoomView(this._scene, room));

    //     if (!this._currentRoomView) {
    //         this._currentRoomView = new RoomView(this._scene, room);
    //     }
        
    //     return room;
    // }

    // public generateSimpleRandomLevel(numberOfRoomsX:number, numberOfRoomsY:number, roomSize: Vector3): RoomModel[][] {
    //     this._rooms = Array.from({ length: numberOfRoomsX }, () => Array<RoomModel>(numberOfRoomsY));
    //     for (let x = 0; x < this._rooms.length; x++) {
    //         let room = null;
    //         for(let y = 0; y < this._rooms[x].length; y++) {
    //             const room = new RoomModel(`Room${x}_${y}`, roomSize, new Vector3(x*Level.ROOMS_GAP, y*Level.ROOMS_GAP, 0));
    //             console.log(`x_${x}, y_${y}`);
    //             if(x != 0) {
    //                 const nextDoorRoom = this._rooms[x-1][y];
    //                 if(nextDoorRoom != null) {
    //                     this.createExit(room, nextDoorRoom, DoorModel.NORTH);
    //                 }
    //             }
    //             if(x != this._rooms.length-1) {
    //                 const nextDoorRoom = this._rooms[x+1][y];
    //                 if(nextDoorRoom != null) {
    //                     this.createExit(room, nextDoorRoom, DoorModel.SOUTH);
    //                 }
    //             }
    //             if(y != 0) {
    //                 const nextDoorRoom = this._rooms[x][y-1];
    //                 if(nextDoorRoom != null) {
    //                     this.createExit(room, nextDoorRoom, DoorModel.EAST);
    //                 }
    //             }
    //             if(y != this._rooms[x].length-1) {
    //                 const nextDoorRoom = this._rooms[x][y-1];
    //                 if(nextDoorRoom != null) {
    //                     this.createExit(room, nextDoorRoom, DoorModel.WEST);
    //                 }
    //             }
    //             this._rooms[x][y] = room;
    //         }
    //     }
    //     if (!this._currentRoomView) {
    //         const centerX = Math.floor(numberOfRoomsX / 2);
    //         const centerY = Math.floor(numberOfRoomsY / 2);
    //         this._currentRoomView = new RoomView(this._scene, this._rooms[centerX][centerY]);
    //     }
    //     return this._rooms;
    // }

    public generateSimpleRandomLevel(numberOfRoomsX: number, numberOfRoomsY: number, roomSize: Vector3): RoomModel[][] {
        this.initializeRoomsGrid(numberOfRoomsX, numberOfRoomsY);
        this.populateRooms(numberOfRoomsX, numberOfRoomsY, roomSize);
        this.setInitialRoomView(numberOfRoomsX, numberOfRoomsY);
        return this._rooms;
    }

    private initializeRoomsGrid(numberOfRoomsX: number, numberOfRoomsY: number): void {
        this._rooms = Array.from({ length: numberOfRoomsX }, () => Array<RoomModel>(numberOfRoomsY));
    }

    private populateRooms(numberOfRoomsX: number, numberOfRoomsY: number, roomSize: Vector3): void {
        for (let x = 0; x < numberOfRoomsX; x++) {
            for (let y = 0; y < numberOfRoomsY; y++) {
                const roomPosition = new Vector3(x * Level.ROOMS_GAP, y * Level.ROOMS_GAP, 0);
                const room = new RoomModel(`Room${x}_${y}`, roomSize, roomPosition);
                console.log(`x_${x}, y_${y}`);
                this.createAdjacentExits(x, y, room);
                this._rooms[x][y] = room;
            }
        }
    }

    private createAdjacentExits(x: number, y: number, room: RoomModel): void {
        if (x > 0) this.tryCreateExit(room, this._rooms[x - 1][y], DoorModel.NORTH);
        if (x < this._rooms.length - 1) this.tryCreateExit(room, this._rooms[x + 1][y], DoorModel.SOUTH);
        if (y > 0) this.tryCreateExit(room, this._rooms[x][y - 1], DoorModel.EAST);
        if (y < this._rooms[x].length - 1) this.tryCreateExit(room, this._rooms[x][y + 1], DoorModel.WEST);
    }

    private tryCreateExit(room: RoomModel, adjacentRoom: RoomModel | undefined, direction: 0 | 1 | 2 | 3): void {
        if (adjacentRoom) {
            this.createExit(room, adjacentRoom, direction);
        }
    }

    private setInitialRoomView(numberOfRoomsX: number, numberOfRoomsY: number): void {
        if (!this._currentRoomView) {
            const centerX = Math.floor(numberOfRoomsX / 2);
            const centerY = Math.floor(numberOfRoomsY / 2);
            this._currentRoomView = new RoomView(this._scene, this._rooms[centerX][centerY]);
        }
    }


    public createExit(room1: RoomModel, room2: RoomModel, direction: 0 | 1 | 2 | 3): void {
        switch (direction) {
            case 0:
                room1.addDoor(DoorModel.NORTH, room2);
                break;
            case 1:
                room1.addDoor(DoorModel.SOUTH, room2);
                break;
            case 2: 
                room1.addDoor(DoorModel.EAST, room2);
                break;
            case 3:
                room1.addDoor(DoorModel.WEST, room2);
                break;
        }

        // this._roomViews[0].update();

        // Automatically set the opposite exit in the connected room
        const oppositeDirection = this._getOppositeDirection(direction);
        switch (oppositeDirection) {
            case 0:
                room2.addDoor(DoorModel.NORTH, room1);
                break;
            case 1:
                room2.addDoor(DoorModel.SOUTH, room1);
                break;
            case 2: 
                room2.addDoor(DoorModel.EAST, room1);
                break;
            case 3:
                room2.addDoor(DoorModel.WEST, room1);
                break;
        }

        // this._roomViews[1].update();
        
    }

    private _getOppositeDirection(direction: 0 | 1 | 2 | 3): 0 | 1 | 2 | 3 {
        switch (direction) {
            case 0:
                return 1;
            case 1:
                return 0;
            case 2:
                return 3;
            case 3:
                return 2;
            default:
                throw new Error(`Invalid direction: ${direction}`);
        }
    }

    public playerEnter(room: RoomModel): void {
        console.log(`Player entered room: ${room.name}`);

        // Dispose of the current room view if it exists
        if (this._currentRoomView) {
            this._currentRoomView.dispose();
        }

        // Create a new RoomView for the entered room
        this._currentRoomView = new RoomView(this._scene, room);

        // Set transparency for the roof and walls
        this._currentRoomView._setRoofTransparency(RoofModel.ROOF_TRANSPARENCY);
        this._currentRoomView._setWallsTransparency(WallModel.WALL_TRANSPARENCY);

        // Update the room view
        this._currentRoomView.update();
    }

    // public playerExit(room: RoomModel): void {
    //     console.log(`Player exited room: ${room.name}`);

    //     // Reset transparency for the roof and walls
    //     // if (this._currentRoomView) {
    //     //     this._currentRoomView._setRoofTransparency(Environment.FULL_OPACITY);
    //     //     this._currentRoomView._setWallsTransparency(Environment.FULL_OPACITY);
    //     //     this._currentRoomView.update();
    //     // }
    // }

}