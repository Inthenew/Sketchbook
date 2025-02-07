import * as THREE from 'three';
import * as CANNON from 'cannon';
import { CameraOperator } from '../core/CameraOperator';
import { Stats } from '../../lib/utils/Stats';
import { CannonDebugRenderer } from '../../lib/cannon/CannonDebugRenderer';
import { InputManager } from '../core/InputManager';
import { LoadingManager } from '../core/LoadingManager';
import { InfoStack } from '../core/InfoStack';
import { IWorldEntity } from '../interfaces/IWorldEntity';
import { IUpdatable } from '../interfaces/IUpdatable';
import { Character } from '../characters/Character';
import { Path } from './Path';
import { Vehicle } from '../vehicles/Vehicle';
import { Scenario } from './Scenario';
import { Sky } from './Sky';
export declare class World {
    renderer: THREE.WebGLRenderer;
    camera: THREE.PerspectiveCamera;
    composer: any;
    stats: Stats;
    graphicsWorld: THREE.Scene;
    sky: Sky;
    sealevel: number;
    respawnLevel: number;
    physicsWorld: CANNON.World;
    parallelPairs: any[];
    physicsFrameRate: number;
    physicsFrameTime: number;
    physicsMaxPrediction: number;
    Has_Night_Time: boolean;
    Has_Day_Night_Cycle: boolean;
    clock: THREE.Clock;
    renderDelta: number;
    logicDelta: number;
    requestDelta: number;
    sinceLastFrame: number;
    justRendered: boolean;
    params: any;
    defParams: any;
    inputManager: InputManager;
    cameraOperator: CameraOperator;
    timeScaleTarget: number;
    console: InfoStack;
    cannonDebugRenderer: CannonDebugRenderer;
    scenarios: Scenario[];
    characters: Character[];
    vehicles: Vehicle[];
    paths: Path[];
    scenarioGUIFolder: any;
    planets: {
        name: string;
        radius: number;
        position: THREE.Vector3;
        gravity: number;
    }[];
    updatables: IUpdatable[];
    isF: boolean;
    private lastScenarioID;
    gui: any;
    heading: any;
    onMoon: boolean;
    Gravity_Scale: any;
    Free_Cam_Speed: any;
    characterInControl: Character;
    isContHidden: boolean;
    private controlsHTML;
    private fttttttt;
    private lastControls;
    constructor(worldScenePath?: any);
    update(timeStep: number, unscaledTimeStep: number): void;
    updatePhysics(timeStep: number): void;
    isOutOfBounds(position: CANNON.Vec3, isBoat?: boolean): boolean;
    outOfBoundsRespawn(body: CANNON.Body, position?: CANNON.Vec3): void;
    /**
     * Rendering loop.
     * Implements fps limiter and frame-skipping
     * Calls world's "update" function before rendering.
     * @param {World} world
     */
    render(world: World): void;
    setTimeScale(value: number): void;
    add(worldEntity: IWorldEntity): void;
    registerUpdatable(registree: IUpdatable): void;
    remove(worldEntity: IWorldEntity): void;
    unregisterUpdatable(registree: IUpdatable): void;
    loadScene(loadingManager: LoadingManager, gltf: any): void;
    launchScenario(scenarioID: string, loadingManager?: LoadingManager): void;
    restartScenario(): void;
    clearEntities(): void;
    scrollTheTimeScale(scrollAmount: number): void;
    isMobile(): boolean;
    /**
     * Helper to rebuild the full controls HTML.
     * If the controls are meant to be visible, the toggle control will always say "Hide Controls".
     */
    private rebuildControlsHTML;
    /**
     * Updates the controls display.
     * Saves the full controls HTML (with the toggle text forced as "Hide Controls")
     * in this.controlsHTML for later use.
     */
    updateControls(controls: any): void;
    /**
     * Toggles the visibility of the controls.
     * When hidden, shows a minimal "Show Controls" prompt.
     */
    toggleControlsHidden(): void;
    /**
     * Adjusts the font size of the controls element responsively.
     */
    resizeControlsText(): void;
    private generateHTML;
    private createParamsGUI;
}
