import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export class WallModel{

    public readonly name: string;
    public readonly size: Vector3;
    public readonly position: Vector3;
    public readonly color: Color3;

    public static readonly WALL_HEIGHT: number = 10;
    public static readonly WALL_THICKNESS: number = 1;
    public static readonly WALL_TRANSPARENCY: number = 0;
    
    constructor(name: string, size: Vector3, position: Vector3, color: Color3) {
        this.name = name;
        this.size = size;
        this.position = position;
        this.color = color;
    }



}

