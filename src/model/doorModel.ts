import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { WallModel } from "./wallModel";
import { Color3 } from "@babylonjs/core";

export class DoorModel {

    public readonly name: string;
    public readonly size: Vector3;
    public readonly position: Vector3;
    public readonly color: Color3 = new Color3(1, 1, 1);
    private readonly isHorizontal: boolean;

    public static readonly NORTH = 0;
    public static readonly SOUTH = 1;
    public static readonly EAST = 2;
    public static readonly WEST = 3;
    public static readonly DOOR_WIDTH = 4;
    public static readonly DOOR_DEPTH = 2;
                
    constructor(name: string, direction: 0 | 1 | 2 | 3, color: Color3) {
        this.isHorizontal = direction == DoorModel.NORTH || direction == DoorModel.SOUTH;
        this.size = this.isHorizontal? new Vector3(DoorModel.DOOR_WIDTH, WallModel.WALL_HEIGHT, WallModel.WALL_THICKNESS): new Vector3(WallModel.WALL_THICKNESS, WallModel.WALL_HEIGHT, DoorModel.DOOR_DEPTH);
        switch(direction) {
            case DoorModel.NORTH:
                this.name = `${name}_north_door`;
                this.position = new Vector3(this.size.x / 2, WallModel.WALL_HEIGHT / 2, WallModel.WALL_THICKNESS / 2);
                break;
            case DoorModel.SOUTH:
                this.name = `${name}_south_door`;
                this.position = new Vector3(this.size.x / 2, WallModel.WALL_HEIGHT / 2, this.size.z - WallModel.WALL_THICKNESS / 2);
                break;
            case DoorModel.EAST:
                this.name = `${name}_east_door`;
                this.position = new Vector3(this.size.x - WallModel.WALL_THICKNESS / 2, WallModel.WALL_HEIGHT / 2, this.size.z / 2);
                break;
            case DoorModel.WEST:
                this.name = `${name}_west_door`;
                this.position = new Vector3(WallModel.WALL_THICKNESS / 2, WallModel.WALL_HEIGHT / 2, this.size.z / 2);
                break;
            default:
                throw new Error(`Invalid direction: ${direction}`);
        }
        this.color = color;
    }

}