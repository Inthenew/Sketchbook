import * as THREE from 'three';
import * as CANNON from 'cannon';
import { Vehicle } from './Vehicle';
import { IControllable } from '../interfaces/IControllable';
import { IWorldEntity } from '../interfaces/IWorldEntity';
import { EntityType } from '../enums/EntityType';
export declare class RocketShip extends Vehicle implements IControllable, IWorldEntity {
    entityType: EntityType;
    rotors: THREE.Object3D[];
    private enginePower;
    private justBlasted;
    private balancing;
    private landing;
    private smokeSystem;
    private totalDown;
    private firstTime;
    private goingDown;
    private clock;
    constructor(gltf: any);
    noDirectionPressed(): boolean;
    update(timeStep: number): void;
    onInputChange(): void;
    private initSmoke;
    private createParticle;
    private updateSmoke;
    physicsPreStep(body: CANNON.Body, heli: RocketShip): void;
    readHelicopterData(gltf: any): void;
    inputReceiverInit(): void;
}
