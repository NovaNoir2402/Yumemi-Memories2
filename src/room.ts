import { Vector3, MeshBuilder, StandardMaterial, Color3, Scene, PhysicsAggregate, PhysicsShapeType } from "@babylonjs/core";
import { Exit } from "./exit";

export class Room {
    public name: string;
    public size: Vector3;
    public center: Vector3;
    public position: Vector3; // Calculated based on center and size
    private readonly _scene: Scene;
    private _exits: { [direction: string]: Exit | null } = { north: null, south: null, east: null, west: null };

    // Wall size variables
    private readonly wallHeight: number = 10;
    private readonly wallThickness: number = 1;

    constructor(name: string, size: Vector3, center: Vector3, scene: Scene) {
        this.name = name;
        this.size = size;
        this.center = center;
        this.position = center.subtract(size.scale(0.5)); // Calculate position based on center and size
        this._scene = scene;

        this._createRoomMesh();
    }

    private _createRoomMesh(): void {
        // Create the room's floor
        const floor = MeshBuilder.CreateBox(`${this.name}_floor`, { width: this.size.x, height: 0.1, depth: this.size.z }, this._scene);
        floor.position = this.position.add(new Vector3(this.size.x / 2, -0.05, this.size.z / 2));
        const floorMaterial = new StandardMaterial(`${this.name}_floorMaterial`, this._scene);
        floorMaterial.diffuseColor = new Color3(0.4, 0.6, 0.4); // Greenish
        floor.material = floorMaterial;

        floor.metadata = { isGround: true }; // Add metadata for the floor
        new PhysicsAggregate(floor, PhysicsShapeType.BOX, { mass: 0 }, this._scene); // Add physics to the floor

        // Create the room's walls
        this._createWall("north", new Vector3(this.size.x, this.wallHeight, this.wallThickness), new Vector3(this.size.x / 2, this.wallHeight / 2, 0));
        this._createWall("south", new Vector3(this.size.x, this.wallHeight, this.wallThickness), new Vector3(this.size.x / 2, this.wallHeight / 2, this.size.z));
        this._createWall("east", new Vector3(this.wallThickness, this.wallHeight, this.size.z), new Vector3(this.size.x, this.wallHeight / 2, this.size.z / 2));
        this._createWall("west", new Vector3(this.wallThickness, this.wallHeight, this.size.z), new Vector3(0, this.wallHeight / 2, this.size.z / 2));
    }

    private _createWall(name: string, size: Vector3, position: Vector3): void {
        const wall = MeshBuilder.CreateBox(`${this.name}_${name}_wall`, { width: size.x, height: size.y, depth: size.z }, this._scene);
        wall.position = this.position.add(position);
        const wallMaterial = new StandardMaterial(`${this.name}_${name}_wallMaterial`, this._scene);
        wallMaterial.diffuseColor = new Color3(0.5, 0.5, 0.5); // Gray
        wall.material = wallMaterial;

        wall.metadata = { isObstacle: true }; // Add metadata for the wall
        new PhysicsAggregate(wall, PhysicsShapeType.BOX, { mass: 0 }, this._scene); // Add physics to the wall
    }

    public setExit(exit: Exit, direction: "north" | "south" | "east" | "west"): void {
        if (this._exits[direction]) {
            throw new Error(`Exit already exists on the ${direction} wall of room ${this.name}`);
        }

        this._exits[direction] = exit;

        // Create the exit mesh
        const exitSize = direction === "north" || direction === "south" ? new Vector3(4, this.wallHeight, this.wallThickness) : new Vector3(this.wallThickness, this.wallHeight, 2);
        const exitPosition = this._getExitPosition(direction);
        const exitMesh = MeshBuilder.CreateBox(`${this.name}_${direction}_exit`, { width: exitSize.x, height: exitSize.y, depth: exitSize.z }, this._scene);
        exitMesh.position = exitPosition;

        // Add metadata to the exit mesh
        exitMesh.metadata = {
            isExit: true,
            exit: exit,
        };

        const exitMaterial = new StandardMaterial(`${this.name}_${direction}_exitMaterial`, this._scene);
        exitMaterial.diffuseColor = new Color3(1, 0, 0); // Red
        exitMesh.material = exitMaterial;

        new PhysicsAggregate(exitMesh, PhysicsShapeType.BOX, { mass: 0 }, this._scene); // Add physics to the exit
    }

    private _getExitPosition(direction: "north" | "south" | "east" | "west"): Vector3 {
        switch (direction) {
            case "north":
                // Exit on the north wall, positioned slightly inside the room
                return this.position.add(new Vector3(this.size.x / 2, this.wallHeight / 2, this.wallThickness / 2));
            case "south":
                // Exit on the south wall, positioned slightly inside the room
                return this.position.add(new Vector3(this.size.x / 2, this.wallHeight / 2, this.size.z - this.wallThickness / 2));
            case "east":
                // Exit on the east wall, positioned slightly inside the room
                return this.position.add(new Vector3(this.size.x - this.wallThickness / 2, this.wallHeight / 2, this.size.z / 2));
            case "west":
                // Exit on the west wall, positioned slightly inside the room
                return this.position.add(new Vector3(this.wallThickness / 2, this.wallHeight / 2, this.size.z / 2));
            default:
                throw new Error(`Invalid direction: ${direction}`);
        }
    }
}