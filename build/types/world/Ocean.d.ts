import * as THREE from 'three';
import { World } from './World';
import { IUpdatable } from '../interfaces/IUpdatable';
export declare class Ocean implements IUpdatable {
    updateOrder: number;
    material: any;
    private world;
    private vec3;
    clock: any;
    private WtrNrm;
    private WtrRep;
    private LodFlg;
    private GrdSiz;
    private segNum;
    private GrdRCs;
    private NrmSrc;
    private GrdPtr;
    private WavMZV;
    private WavMXV;
    geoWav: THREE.PlaneGeometry;
    matWav: THREE.MeshStandardMaterial;
    private gu;
    etime: any;
    constructor(object: any, world: World);
    createOcean(size: number, position: THREE.Vector3): void;
    getWaveHeightAt(x: number, z: number, t: number, isP?: boolean): number | string;
    update(timeStep: number): void;
}
