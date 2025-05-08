import { FloorModel } from "./floorModel";
import { RoofModel } from "./roofModel";
import { WallModel } from "./wallModel";
import { Color3, Vector3 } from "@babylonjs/core/Maths/math";

export class RoomModel{

    public readonly name: string;
    public readonly walls: WallModel[];
    public readonly floor: FloorModel;
    public readonly roof: RoofModel;
    public readonly size: Vector3;

    constructor(name: string, size: Vector3) {
        this.name = name;
        this.size = size;
        const wallColor = new Color3(0.5, 0.5, 0.5);
        this.walls[0] = new WallModel("north", new Vector3(this.size.x, WallModel.WALL_HEIGHT, WallModel.WALL_THICKNESS), new Vector3(this.size.x / 2, WallModel.WALL_HEIGHT / 2, 0), wallColor)
        this.walls[1] = new WallModel("south", new Vector3(this.size.x, WallModel.WALL_HEIGHT, WallModel.WALL_THICKNESS), new Vector3(this.size.x / 2, WallModel.WALL_HEIGHT / 2, this.size.z), wallColor);
        this.walls[2] =  new WallModel("east", new Vector3(WallModel.WALL_THICKNESS, WallModel.WALL_HEIGHT, this.size.z), new Vector3(this.size.x, WallModel.WALL_HEIGHT / 2, this.size.z / 2), wallColor);
        this.walls[3] = new WallModel("west", new Vector3(WallModel.WALL_THICKNESS, WallModel.WALL_HEIGHT, this.size.z), new Vector3(0, WallModel.WALL_HEIGHT / 2, this.size.z / 2), wallColor);
        this.floor = new FloorModel(`${this.name}_floor`, this.size, new Vector3(this.size.x / 2, FloorModel.FLOOR_DEPTH_OFFSET, this.size.z / 2), new Color3(0.4, 0.6, 0.4));
        this.roof = new RoofModel(`${this.name}_roof`, this.size, new Vector3(this.size.x / 2, WallModel.WALL_HEIGHT - RoofModel.ROOF_HEIGHT_OFFSET, this.size.z / 2),  new Color3(0.4, 0.4, 0.6));
    }


}