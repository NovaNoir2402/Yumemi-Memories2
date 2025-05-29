import { Enemy } from "../enemy";

export abstract class EnemyDecorator extends Enemy {
    protected _wrapped: Enemy;

    constructor(enemy: Enemy) {
        super(enemy.name, enemy._scene, enemy._player, enemy.position, enemy.damage, enemy.health);
        this._wrapped = enemy;
    }

    public override update(): void {
        this._wrapped.update();
    }
}