import { Item } from "./items";

export class Inventory {
    private _items: { [key: string]: Item } = {};
    private _capacity: number;

    constructor(capacity: number) {
        this._capacity = capacity;
    }

    public addItem(item: Item): boolean {
        if (Object.keys(this._items).length < this._capacity) {
            this._items[item.name] = item;
            return true;
        }
        return false;
    }

    public removeItem(itemName: string): boolean {
        if (this._items[itemName]) {
            delete this._items[itemName];
            return true;
        }
        return false;
    }

    public getItems(): { [key: string]: Item } {
        return this._items;
    }
}