import {
    Scene,
    Vector3,
    MeshBuilder,
    StandardMaterial,
    Color3,
    PhysicsAggregate,
    PhysicsShapeType,
} from "@babylonjs/core";
import { Exit } from "./exit";

export class Room {
    public name: string;
    public size: Vector3;
    public center: Vector3;
    public position: Vector3;
    protected readonly _scene: Scene;
    protected _exits: { [direction: string]: Exit | null } = {
        north: null,
        south: null,
        east: null,
        west: null,
    };

    // Constants
    protected static readonly WALL_HEIGHT = 10;
    protected static readonly WALL_THICKNESS = 1;
    protected static readonly FLOOR_THICKNESS = 0.1;
    protected static readonly FLOOR_DEPTH_OFFSET = -0.05;
    protected static readonly ROOF_THICKNESS = 0.1;
    protected static readonly ROOF_HEIGHT_OFFSET = 0.05;
    protected static readonly WALL_TRANSPARENCY = 0.5;
    protected static readonly ROOF_TRANSPARENCY = 0.1;
    protected static readonly FULL_OPACITY = 1;
    protected static readonly EXIT_WIDTH = 4;
    protected static readonly EXIT_DEPTH = 2;

    constructor(name: string, size: Vector3, center: Vector3, scene: Scene) {
        this.name = name;
        this.size = size;
        this.center = center;
        this.position = center.subtract(size.scale(0.5));
        this._scene = scene;

        this._createRoomMesh();
    }

    protected _createRoomMesh(): void {
        this._createFloor();
        this._createWalls();
        this._createRoof();
    }

    protected _createFloor(): void {
        const floor = MeshBuilder.CreateBox(
            `${this.name}_floor`,
            {
                width: this.size.x,
                height: Room.FLOOR_THICKNESS,
                depth: this.size.z,
            },
            this._scene
        );
        floor.position = this.position.add(
            new Vector3(this.size.x / 2, Room.FLOOR_DEPTH_OFFSET, this.size.z / 2)
        );
        const material = new StandardMaterial(`${this.name}_floorMaterial`, this._scene);
        material.diffuseColor = new Color3(0.4, 0.6, 0.4);
        floor.material = material;
        floor.metadata = { isGround: true };
        new PhysicsAggregate(floor, PhysicsShapeType.BOX, { mass: 0 }, this._scene);
    }

    protected _createWalls(): void {
        this._createWall("north", new Vector3(this.size.x, Room.WALL_HEIGHT, Room.WALL_THICKNESS), new Vector3(this.size.x / 2, Room.WALL_HEIGHT / 2, 0));
        this._createWall("south", new Vector3(this.size.x, Room.WALL_HEIGHT, Room.WALL_THICKNESS), new Vector3(this.size.x / 2, Room.WALL_HEIGHT / 2, this.size.z));
        this._createWall("east", new Vector3(Room.WALL_THICKNESS, Room.WALL_HEIGHT, this.size.z), new Vector3(this.size.x, Room.WALL_HEIGHT / 2, this.size.z / 2));
        this._createWall("west", new Vector3(Room.WALL_THICKNESS, Room.WALL_HEIGHT, this.size.z), new Vector3(0, Room.WALL_HEIGHT / 2, this.size.z / 2));
    }

    protected _createRoof(): void {
        const roof = MeshBuilder.CreateBox(
            `${this.name}_roof`,
            {
                width: this.size.x,
                height: Room.ROOF_THICKNESS,
                depth: this.size.z,
            },
            this._scene
        );
        roof.position = this.position.add(
            new Vector3(this.size.x / 2, Room.WALL_HEIGHT - Room.ROOF_HEIGHT_OFFSET, this.size.z / 2)
        );
        const material = new StandardMaterial(`${this.name}_roofMaterial`, this._scene);
        material.diffuseColor = new Color3(0.4, 0.4, 0.6);
        roof.material = material;
    }

    protected _createWall(name: string, size: Vector3, position: Vector3): void {
        const wall = MeshBuilder.CreateBox(
            `${this.name}_${name}_wall`,
            { width: size.x, height: size.y, depth: size.z },
            this._scene
        );
        wall.position = this.position.add(position);
        const material = new StandardMaterial(`${this.name}_${name}_wallMaterial`, this._scene);
        material.diffuseColor = new Color3(0.5, 0.5, 0.5);
        wall.material = material;
        wall.metadata = { isObstacle: true };
        new PhysicsAggregate(wall, PhysicsShapeType.BOX, { mass: 0 }, this._scene);
    }

    public setExit(exit: Exit, direction: "north" | "south" | "east" | "west"): void {
        if (this._exits[direction]) {
            throw new Error(`Exit already exists on the ${direction} wall of room ${this.name}`);
        }

        this._exits[direction] = exit;

        const isHorizontal = direction === "north" || direction === "south";
        const exitSize = isHorizontal
            ? new Vector3(Room.EXIT_WIDTH, Room.WALL_HEIGHT, Room.WALL_THICKNESS)
            : new Vector3(Room.WALL_THICKNESS, Room.WALL_HEIGHT, Room.EXIT_DEPTH);

        const exitPosition = this._getExitPosition(direction);

        const exitMesh = MeshBuilder.CreateBox(
            `${this.name}_${direction}_exit`,
            { width: exitSize.x, height: exitSize.y, depth: exitSize.z },
            this._scene
        );
        exitMesh.position = exitPosition;
        exitMesh.metadata = { isExit: true, exit };

        const material = new StandardMaterial(`${this.name}_${direction}_exitMaterial`, this._scene);
        material.diffuseColor = new Color3(1, 0, 0);
        exitMesh.material = material;

        new PhysicsAggregate(exitMesh, PhysicsShapeType.BOX, { mass: 0 }, this._scene);
    }

    protected _getExitPosition(direction: "north" | "south" | "east" | "west"): Vector3 {
        switch (direction) {
            case "north":
                return this.position.add(new Vector3(this.size.x / 2, Room.WALL_HEIGHT / 2, Room.WALL_THICKNESS / 2));
            case "south":
                return this.position.add(new Vector3(this.size.x / 2, Room.WALL_HEIGHT / 2, this.size.z - Room.WALL_THICKNESS / 2));
            case "east":
                return this.position.add(new Vector3(this.size.x - Room.WALL_THICKNESS / 2, Room.WALL_HEIGHT / 2, this.size.z / 2));
            case "west":
                return this.position.add(new Vector3(Room.WALL_THICKNESS / 2, Room.WALL_HEIGHT / 2, this.size.z / 2));
            default:
                throw new Error(`Invalid direction: ${direction}`);
        }
    }

    public _playerEnter(): void {
        console.log(`Player entered room: ${this.name}`);
        this._setRoofTransparency(Room.ROOF_TRANSPARENCY);
        this._setWallsTransparency(Room.WALL_TRANSPARENCY);
    }

    public _playerExit(): void {
        console.log(`Player exited room: ${this.name}`);
        this._setRoofTransparency(Room.FULL_OPACITY);
        this._setWallsTransparency(Room.FULL_OPACITY);
    }

    protected _setRoofTransparency(alpha: number): void {
        const roof = this._scene.getMeshByName(`${this.name}_roof`);
        if (roof?.material instanceof StandardMaterial) {
            roof.material.alpha = alpha;
        }
    }

    protected _setWallsTransparency(alpha: number): void {
        for (const dir of ["north", "south", "east", "west"]) {
            const wall = this._scene.getMeshByName(`${this.name}_${dir}_wall`);
            if (wall?.material instanceof StandardMaterial) {
                wall.material.alpha = alpha;
            }
        }
    }
}
