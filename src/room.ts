import {
    Scene,
    Vector3,
} from "@babylonjs/core";

export class Room {
    static ROOM_SIZE(arg0: string, ROOM_SIZE: any, ROOM1_POSITION: any) {
        throw new Error("Method not implemented.");
    }
    public name: string;
    public size: Vector3;
    public center: Vector3;
    public position: Vector3;
    protected readonly _scene: Scene;

    // Constants
    protected static readonly WALL_TRANSPARENCY = 0.5;

    protected static readonly FULL_OPACITY = 1;

    constructor(name: string, size: Vector3, center: Vector3, scene: Scene) {
        this.name = name;
        this.size = size;
        this.center = center;
        this.position = center.subtract(size.scale(0.5));
        this._scene = scene;
        
    }

}
