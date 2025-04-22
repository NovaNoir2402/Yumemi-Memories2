import { Room } from './room.js';

export class Exit {
    public room1: Room;
    public room2: Room;

    constructor(room1: Room, room2: Room) {
        this.room1 = room1;
        this.room2 = room2;
    }
}