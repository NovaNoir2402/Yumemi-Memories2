import {
    Scene,
    Vector3,
    TransformNode,
    Mesh,
} from "@babylonjs/core";
import { Bullet } from "./bullet";
import { InputController } from "../../controller/inputController";
import { Player } from "./player";
import { PlayerController } from "../../controller/playerController";

/**
 * Weapon class for shooting bullets.
 */
export class Weapon {
    public _scene: Scene;
    private _bulletStyle: string;
    public player: Player;

    private static readonly SHOOT_COOLDOWN_MS = 300;
    private static readonly BULLET_DAMAGE = 30;
    private static readonly PISTOL_DAMAGE = 50;
    private static readonly SHOTGUN_DAMAGE = 20;
    private static readonly SNIPER_DAMAGE = 100;
    private static readonly AUTO_DAMAGE = 15;

    constructor(scene: Scene, bulletStyle: string, player: Player) {
        this._scene = scene;
        this.player = player;
        this._bulletStyle = bulletStyle;
    }

    public _shootBullet(): void {
        this.player._canShoot = false;
        this.shoot(this._bulletStyle);
        setTimeout(() => {
            this.player._canShoot = true;
        }, Weapon.SHOOT_COOLDOWN_MS);
    }

    private shoot(weaponType: string): void {
        switch (weaponType) {
            case "pistol":
                this._shootPistol();
                break;
            case "shotgun":
                this._shootShotgun();
                break;
            case "sniper":
                this._shootSniper();
                break;
            case "auto":
                this._shootAuto();
                break;
            default:
                this._shootPistol(); // fallback
                break;
        }
    }

    private _getShootOrigin(): Vector3 {
        const camera = this.player.view.camera;
        const forward = camera.getDirection(Vector3.Forward());
        // Start from the player's position (not the camera)
        const playerPos = this.player._body.transformNode.position;
        // Offset 1 unit in front of the player, in the camera's forward direction
        return playerPos.add(forward.scale(1));
        // const forward = this.player.view.camera.getForwardRay().direction;
        // return this.player._body.transformNode.position.add(forward.scale(1));
    }

    private _getForwardDirection(): Vector3 {
        return this.player.view.camera.getForwardRay().direction;
    }

    /** Pistolet : tir droit, unique */
    private _shootPistol(): void {
        const origin = this._getShootOrigin();
        const dir = this._getForwardDirection();
        new Bullet(this._scene, origin, dir, Weapon.PISTOL_DAMAGE);

    }

    /** Shotgun : plusieurs projectiles avec dispersion */
    private _shootShotgun(): void {
        const origin = this._getShootOrigin();
        const baseDir = this._getForwardDirection();
        const spreadAngle = 10; // degrés
        const pellets = 6;

        for (let i = 0; i < pellets; i++) {
            const dir = this._applySpread(baseDir, spreadAngle);
            new Bullet(this._scene, origin, dir, Weapon.SHOTGUN_DAMAGE); // dégâts réduits
        }

    }

    /** Sniper : tir unique très précis, dégâts élevés */
    private _shootSniper(): void {
        const origin = this._getShootOrigin();
        const dir = this._getForwardDirection();
        new Bullet(this._scene, origin, dir, Weapon.SNIPER_DAMAGE);
    }

    /** Mitraillette : tir droit mais légèrement imprécis */
    private _shootAuto(): void {
        const origin = this._getShootOrigin();
        const baseDir = this._getForwardDirection();
        const dir = this._applySpread(baseDir, 3); // léger écart
        new Bullet(this._scene, origin, dir, Weapon.AUTO_DAMAGE);
    }

    /**
     * Applique un écart angulaire aléatoire à une direction de tir.
     * @param direction Direction de base
     * @param angleMax Angle maximum de déviation (en degrés)
     */
    private _applySpread(direction: Vector3, angleMax: number): Vector3 {
        const angleRad = (angleMax * Math.PI) / 180;
        const randYaw = (Math.random() - 0.5) * angleRad;
        const randPitch = (Math.random() - 0.5) * angleRad;

        // Convert to quaternion rotation then apply
        const right = Vector3.Cross(direction, Vector3.Up()).normalize();
        const up = Vector3.Cross(right, direction).normalize();

        const spreadDir = direction
            .add(up.scale(Math.tan(randPitch)))
            .add(right.scale(Math.tan(randYaw)))
            .normalize();

        return spreadDir;
    }

}
