import { World } from './World';
import { IUpdatable } from '../interfaces/IUpdatable';
export declare class Ocean implements IUpdatable {
    updateOrder: number;
    material: any;
    private world;
    private vec3;
    constructor(object: any, world: World);
    update(timeStep: number): void;
}
