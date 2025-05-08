import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { WallModel } from "./wallModel";

export class DoorModel {

    public readonly name: string;
    public readonly size: Vector3;
    public readonly position: Vector3;

    public static readonly NORTH = 0;
    public static readonly SOUTH = 1;
    public static readonly EAST = 2;
    public static readonly WEST = 3;

    constructor(direction: 0 | 1 | 2 | 3, size: Vector3) {
        this.size = size;
        switch(direction) {
            case DoorModel.NORTH:
                this.name = "north";
                this.position = new Vector3(this.size.x / 2, WallModel.WALL_HEIGHT / 2, WallModel.WALL_THICKNESS / 2);
                break;
            case DoorModel.SOUTH:
                this.name = "south";
                this.position = new Vector3(this.size.x / 2, WallModel.WALL_HEIGHT / 2, this.size.z - WallModel.WALL_THICKNESS / 2);
                break;
            case DoorModel.EAST:
                this.name = "east";
                this.position = new Vector3(this.size.x - WallModel.WALL_THICKNESS / 2, WallModel.WALL_HEIGHT / 2, this.size.z / 2);
                break;
            case DoorModel.WEST:
                this.name = "west";
                this.position = new Vector3(WallModel.WALL_THICKNESS / 2, WallModel.WALL_HEIGHT / 2, this.size.z / 2);
                break;
            default:
                throw new Error(`Invalid direction: ${direction}`);
        }
    }

    
}