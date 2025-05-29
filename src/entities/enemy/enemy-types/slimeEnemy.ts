import { Enemy } from "../enemy";
import { EnemyDecorator } from "./enemyDecorator";
import { Player } from "../../player/player";
import { Vector3 } from "@babylonjs/core";

export class SlimeEnemyDecorator extends EnemyDecorator {
    private _bounceTimer: number = 0;
    private _bounceInterval: number = 1.5; // seconds between bounces
    private _bounceStrength: number = 6;   // upward force
    // change threat level to 0.5
    public override threatLevel: number = 0.5;

    public override update(): void {
        // Call base update (could be empty or handle other decorators)
        super.update();

        // Bouncing logic
        this._bounceTimer += this._scene.getEngine().getDeltaTime() / 1000;
        if (this._bounceTimer >= this._bounceInterval) {
            this._bounceTimer = 0;

            // Calculate direction to player
            const direction = this._wrapped._player.position.subtract(this.position);
            direction.y = 0;
            direction.normalize();

            // Apply a slow forward and upward velocity (bounce)
            const bounceVelocity = direction.scale(1.5).add(new Vector3(0, this._bounceStrength, 0));
            this._wrapped._body.setLinearVelocity(bounceVelocity);
        }
    }
}