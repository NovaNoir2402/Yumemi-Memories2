import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { DoorModel } from "./doorModel";
import { FloorModel } from "./floorModel";
import { RoofModel } from "./roofModel";
import { WallModel } from "./wallModel";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { int } from "@babylonjs/core/types";

export class RoomModel{

    public readonly name: string;
    public readonly walls: WallModel[];
    public readonly floor: FloorModel;
    public readonly roof: RoofModel;
    public readonly size: Vector3;
    public readonly doors: { [direction: int]: DoorModel | null } = {
        0: null,
        1: null,
        2: null,
        3: null,
    };
    public static readonly MAX_DOORS = 4;

    constructor(name: string, size: Vector3) {
        this.name = name;
        this.size = size;
        const wallColor = new Color3(0.5, 0.5, 0.5);
        this.walls[DoorModel.NORTH] = new WallModel(`${this.name}_north_wall`, new Vector3(this.size.x, WallModel.WALL_HEIGHT, WallModel.WALL_THICKNESS), new Vector3(this.size.x / 2, WallModel.WALL_HEIGHT / 2, 0), wallColor)
        this.walls[DoorModel.SOUTH] = new WallModel(`${this.name}_south_wall`, new Vector3(this.size.x, WallModel.WALL_HEIGHT, WallModel.WALL_THICKNESS), new Vector3(this.size.x / 2, WallModel.WALL_HEIGHT / 2, this.size.z), wallColor);
        this.walls[DoorModel.EAST] =  new WallModel(`${this.name}_east_wall`, new Vector3(WallModel.WALL_THICKNESS, WallModel.WALL_HEIGHT, this.size.z), new Vector3(this.size.x, WallModel.WALL_HEIGHT / 2, this.size.z / 2), wallColor);
        this.walls[DoorModel.WEST] = new WallModel(`${this.name}_west_wall`, new Vector3(WallModel.WALL_THICKNESS, WallModel.WALL_HEIGHT, this.size.z), new Vector3(0, WallModel.WALL_HEIGHT / 2, this.size.z / 2), wallColor);
        this.floor = new FloorModel(`${this.name}_floor`, this.size, new Vector3(this.size.x / 2, FloorModel.FLOOR_DEPTH_OFFSET, this.size.z / 2), new Color3(0.4, 0.6, 0.4));
        this.roof = new RoofModel(`${this.name}_roof`, this.size, new Vector3(this.size.x / 2, WallModel.WALL_HEIGHT - RoofModel.ROOF_HEIGHT_OFFSET, this.size.z / 2),  new Color3(0.4, 0.4, 0.6));
    }

    public addDoor(direction: 0 | 1 | 2 | 3) {
        this.doors[direction] = new DoorModel(this.name, direction, new Color3(1, 0, 0));
    }

}