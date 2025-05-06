import { Scene, Vector3 } from "@babylonjs/core";
import { Enemy } from "./enemy";
import { Room } from "./room";
import { Player } from "./characterController";

export class EnemyManager {
    private _scene: Scene;
    private _player: Player;
    private _enemies: Enemy[] = [];

    constructor(scene: Scene, player: Player) {
        this._scene = scene;
        this._player = player;
    }

    public spawnEnemies(
        room: Room,
        amount: number,
        aiBehavior?: (enemy: Enemy, player: Player) => void
    ): void {
        for (let i = 0; i < amount; i++) {
            const spawnPosition = this._getRandomSpawnPosition(room);
            const enemy = new Enemy(`enemy_${i}`, this._scene, this._player, spawnPosition);

            if (aiBehavior) {
                enemy.setAIBehavior(aiBehavior);
            }

            this._enemies.push(enemy);
        }
    }

    private _getRandomSpawnPosition(room: Room): Vector3 {
        const y = 1;
        const corners = [
            new Vector3(room.position.x + 1, y, room.position.z + 1),
            new Vector3(room.position.x + room.size.x - 1, y, room.position.z + 1),
            new Vector3(room.position.x + 1, y, room.position.z + room.size.z - 1),
            new Vector3(room.position.x + room.size.x - 1, y, room.position.z + room.size.z - 1),
        ];

        const randomIndex = Math.floor(Math.random() * corners.length);
        return corners[randomIndex];
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
