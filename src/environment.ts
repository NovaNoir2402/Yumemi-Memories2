import { Scene, Vector3 } from "@babylonjs/core";
import { Exit } from "./exit";
import { RoomModel } from "./model/roomModel";
import { DoorModel } from "./model/doorModel";
import { RoomView } from "./view/roomView";
import { RoofModel } from "./model/roofModel";
import { WallModel } from "./model/wallModel";

export class Environment {
    private readonly _scene: Scene;
    private readonly _rooms: RoomModel[] = [];
    private readonly _roomViews: RoomView[] = [];

    public static readonly FULL_OPACITY = 1;

    constructor(scene: Scene) {
        this._scene = scene;
    }

    public createRoom(name: string, size: Vector3): RoomModel {
        const room = new RoomModel(name, size);
        this._rooms.push(room);
        this._roomViews.push(new RoomView(this._scene, room));
        return room;
    }

    public createExit(room1: RoomModel, room2: RoomModel, direction: "north" | "south" | "east" | "west"): void {
        switch (direction) {
            case "north":
                room1.addDoor(DoorModel.NORTH);
                break;
            case "south":
                room1.addDoor(DoorModel.SOUTH);
                break;
            case "east": 
                room1.addDoor(DoorModel.EAST);
                break;
            case "west":
                room1.addDoor(DoorModel.WEST);
                break;
        }

        this._roomViews[0].update();

        // Automatically set the opposite exit in the connected room
        const oppositeDirection = this._getOppositeDirection(direction);
        switch (oppositeDirection) {
            case "north":
                room2.addDoor(DoorModel.NORTH);
                break;
            case "south":
                room2.addDoor(DoorModel.SOUTH);
                break;
            case "east": 
                room2.addDoor(DoorModel.EAST);
                break;
            case "west":
                room2.addDoor(DoorModel.WEST);
                break;
        }

        this._roomViews[1].update();
        
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

    public playerEnter(room: RoomModel): void {
        console.log(`Player entered room: ${room.name}`);
        let roomView = null;
        if(room.name == 'Room1') {
            roomView = this._roomViews[0];
        } else {
            roomView = this._roomViews[1];
        }
        roomView._setRoofTransparency(RoofModel.ROOF_TRANSPARENCY);
        roomView._setWallsTransparency(WallModel.WALL_TRANSPARENCY);
        roomView.update();
    }

    public playerExit(room: RoomModel): void {
        console.log(`Player exited room: ${room.name}`);
        let roomView = null;
        if(room.name == 'Room1') {
            roomView = this._roomViews[0];
        } else {
            roomView = this._roomViews[1];
        }
        roomView._setRoofTransparency(Environment.FULL_OPACITY);
        roomView._setWallsTransparency(Environment.FULL_OPACITY);
        roomView.update();
    }

}