import { Color3, Mesh, MeshBuilder, Scene, StandardMaterial, Vector3 } from "@babylonjs/core";
import { Enemy } from "./enemy";
import { Player } from "../player/player";
import { RoomModel } from "../../model/roomModel";

export class EnemyManager {
    private _scene: Scene;
    private _player: Player;
    private _enemies: Enemy[] = [];

    constructor(scene: Scene, player: Player) {
        this._scene = scene;
        this._player = player;
    }

    public spawnEnemies(
        room: RoomModel,
        amount: number,
        aiBehavior?: (enemy: Enemy, player: Player) => void
    ): void {
        for (let i = 0; i < amount; i++) {
            const spawnPos = this._getRandomSpawnPosition(room);
    
            // DEBUG VISUEL : une petite sphère rouge
            /*const marker = MeshBuilder.CreateSphere(`debug_spawn_${i}`, { diameter: 0.3 }, this._scene);
            marker.position = spawnPos.clone();
            const mat = new StandardMaterial(`debugMat_${i}`, this._scene);
            mat.diffuseColor = new Color3(1, 0, 0);
            marker.material = mat;*/
    
            const enemy = new Enemy(`enemy_${i}`, this._scene, this._player, spawnPos, 20, 100);
            aiBehavior && enemy.setAIBehavior(aiBehavior);
            this._enemies.push(enemy);
        }
    }
    
    private _getRandomSpawnPosition(room: RoomModel): Vector3 {
        // 1) Récupère le mesh du sol via metadata
        const floor = this._scene.meshes.find(m =>
            m.metadata?.isGround && m.name === `${room.name}_floor`
        ) as Mesh;
    
        if (!floor) {
            console.warn(`Floor mesh not found for room ${room.name}`);
            // fallback : on retombe sur le calcul manuel
            return this._manualSpawnPosition(room);
        }
    
        // 2) Prends son bounding box world‑space
        const bbox = floor.getBoundingInfo().boundingBox;
        const min = bbox.minimumWorld;
        const max = bbox.maximumWorld;
    
        // 3) Génère X et Z dans l’intervalle [min, max]
        const x = Math.random() * (max.x - min.x) + min.x;
        const z = Math.random() * (max.z - min.z) + min.z;
        const y = max.y + 0.5; // un peu au‑dessus du sol
    
        console.log(`Spawn enemy at (x=${x.toFixed(2)}, y=${y.toFixed(2)}, z=${z.toFixed(2)})`);
        return new Vector3(x, y, z);
    }
    
    private _manualSpawnPosition(room: RoomModel): Vector3 {
        // Même logique que précédemment, en fallback
        const y = room.position.y + 1;
        const minX = room.position.x + 1;
        const maxX = room.position.x + room.size.x - 1;
        const minZ = room.position.z + 1;
        const maxZ = room.position.z + room.size.z - 1;
        const x = Math.random() * (maxX - minX) + minX;
        const z = Math.random() * (maxZ - minZ) + minZ;
        return new Vector3(x, y, z);
    }
    

    public updateEnemies(): void {
        this._enemies.forEach((enemy) => enemy.update());
    }

    public toggleAllEnemies(): void {
        this._enemies.forEach((enemy) => enemy.toggleActiveState());
    }

    public clearEnemies(): void {
        this._enemies.forEach((enemy) => enemy.dispose());
        this._enemies = [];
    }
}
