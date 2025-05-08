import { RoomModel } from "./roomModel";
import { FloorModel } from "./floorModel";
import { RoofModel } from "./roofModel";
import { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { PhysicsAggregate } from "@babylonjs/core/Physics/v2/physicsAggregate";
import { PhysicsShapeType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";

export class RoomView {
    
    private readonly room: RoomModel;
    private readonly scene: Scene;

    constructor(scene: Scene, room: RoomModel) {
        this.room = room;
        this.scene = scene;
        this._createRoomMesh();
    }

    protected _createRoomMesh(): void {
        this._createWalls();
        this._createFloor();
        this._createRoof();
    }

    protected _createRoof() {
        let roof = this.room.roof;
        const roofMesh = MeshBuilder.CreateBox(
            roof.name, 
            {
                width: roof.size.x,
                height: RoofModel.ROOF_THICKNESS,
                depth: roof.size.z,
            }, 
            this.scene
        );
        roofMesh.position = roof.position;
        const material = new StandardMaterial(`${roof.name}_roofMaterial`, this.scene);
        material.diffuseColor = roof.color;
        roofMesh.material = material;
        new PhysicsAggregate(roofMesh, PhysicsShapeType.BOX, { mass: 0 }, this.scene);
    }

    protected _createFloor(): void {
        let floor = this.room.floor;
        const floorMesh  = MeshBuilder.CreateBox(
            floor.name,
            {
                width: floor.size.x,
                height: FloorModel.FLOOR_THICKNESS,
                depth: floor.size.z,
            },
            this.scene
        );
        floorMesh.position = floor.position;
        const material = new StandardMaterial(`${floor.name}_floorMaterial`, this.scene);
        material.diffuseColor = floor.color;
        floorMesh.material = material;
        floorMesh.metadata = { isGround: true }
        new PhysicsAggregate(floorMesh, PhysicsShapeType.BOX, { mass: 0}, this.scene)
    }

    protected _createWalls(): void {
        const walls = this.room.walls;
        for (let wall of walls) {
            const wallMesh = MeshBuilder.CreateBox(
                wall.name,
                {
                    width: wall.size.x,
                    height: wall.size.y,
                    depth: wall.size.z
                },
                this.scene
            );
            wallMesh.position = wall.position;
            const material = new StandardMaterial(`${wall.name}_wallMaterial`, this.scene);
            material.diffuseColor = wall.color;
            wallMesh.material = material;
            wallMesh.metadata = { isObstacle: true };
            new PhysicsAggregate(wallMesh, PhysicsShapeType.BOX, { mass: 0}, this.scene)
        }
    }


    
}