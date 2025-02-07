import * as THREE from 'three';
import * as CANNON from 'cannon';
import Swal from 'sweetalert2';
import * as $ from 'jquery';

import { CameraOperator } from '../core/CameraOperator';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader';

import { Detector } from '../../lib/utils/Detector';
import { Stats } from '../../lib/utils/Stats';
import * as GUI from '../../lib/utils/dat.gui';
import { CannonDebugRenderer } from '../../lib/cannon/CannonDebugRenderer';
import * as _ from 'lodash';

import { InputManager } from '../core/InputManager';
import * as Utils from '../core/FunctionLibrary';
import { LoadingManager } from '../core/LoadingManager';
import { InfoStack } from '../core/InfoStack';
import { UIManager } from '../core/UIManager';
import { IWorldEntity } from '../interfaces/IWorldEntity';
import { IUpdatable } from '../interfaces/IUpdatable';
import { Character } from '../characters/Character';
import { Path } from './Path';
import { CollisionGroups } from '../enums/CollisionGroups';
import { BoxCollider } from '../physics/colliders/BoxCollider';
import { TrimeshCollider } from '../physics/colliders/TrimeshCollider';
import { SwimIdle } from '../characters/character_states/SwimIdle';
import { Vehicle } from '../vehicles/Vehicle'
import { Boat } from '../vehicles/Boat';
import { Scenario } from './Scenario';
import { Sky } from './Sky';
import { Ocean } from './Ocean';
import { Console } from 'console';
import { Falling } from '../characters/character_states/Falling';
globalThis.didS = false;
globalThis.canDO23 = true;
globalThis.canDO234 = true;
export class World {
    public renderer: THREE.WebGLRenderer;
    public camera: THREE.PerspectiveCamera;
    public composer: any;
    public stats: Stats;
    public graphicsWorld: THREE.Scene;
    public sky: Sky;
    public sealevel: number = 15.1;
    public respawnLevel: number = 14.989;
    public physicsWorld: CANNON.World;
    public parallelPairs: any[];
    public physicsFrameRate: number;
    public physicsFrameTime: number;
    public physicsMaxPrediction: number;
    public Has_Night_Time: boolean = false;
    public Has_Day_Night_Cycle: boolean = false;
    public clock: THREE.Clock;
    public renderDelta: number;
    public logicDelta: number;
    public requestDelta: number;
    public sinceLastFrame: number;
    public justRendered: boolean;
    public params: any;
    public defParams: any;
    public inputManager: InputManager;
    public cameraOperator: CameraOperator;
    public timeScaleTarget: number = 1;
    public console: InfoStack;
    public cannonDebugRenderer: CannonDebugRenderer;
    public scenarios: Scenario[] = [];
    public characters: Character[] = [];
    public vehicles: Vehicle[] = [];
    public paths: Path[] = [];
    public scenarioGUIFolder: any;
    public planets = [
        {
            name: 'Earth',
            radius: 5010,
            position: new THREE.Vector3(0, 0, 0),
            gravity: 1
        },
        {
            name: 'Moon',
            radius: 1252.5,
            position: new THREE.Vector3(15.2758, 3852.67, -11696.4),
            gravity: 0.2
        }
    ];
    public updatables: IUpdatable[] = [];
    public isF: boolean = false;
    private lastScenarioID: string;
    public gui: any;
    public heading: any;
    public onMoon: boolean = false;
    Gravity_Scale: any;
    Free_Cam_Speed: any;
    characterInControl: Character;
    isContHidden: boolean = false;
    private controlsHTML: string = "";
    private fttttttt: boolean = false; // Flag used in updateControls
    private lastControls: any[] = [];   // Store last controls array
    constructor(worldScenePath?: any) {
        const scope = this;
        globalThis.world = scope;
        globalThis.a = 'sd';
        globalThis.justLeftBoat = false;
        globalThis.swimming = false;
        // WebGL not supported
        if (!Detector.webgl) {
            Swal.fire({
                icon: 'warning',
                title: 'WebGL compatibility',
                text: 'This browser doesn\'t seem to have the required WebGL capabilities. The application may not work correctly.',
                footer: '<a href="https://get.webgl.org/" target="_blank">Click here for more information</a>',
                showConfirmButton: false,
                buttonsStyling: false
            });
        }
        this.heading = document.createElement('h1');
        this.heading.innerHTML = 'Lap: 0';
        this.heading.style.position = 'absolute';
        this.heading.style.top = '0';
        this.heading.style.left = '50px';
        if (!globalThis.didS) {
            this.heading.style.visibility = 'hidden';
            globalThis.didS = true;
        }
        this.heading.setAttribute('id', 'laps');
        document.body.appendChild(this.heading);

        // Renderer
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.generateHTML();

        // Auto window resize
        function onWindowResize(): void {
            scope.camera.aspect = window.innerWidth / window.innerHeight;
            scope.camera.updateProjectionMatrix();
            scope.renderer.setSize(window.innerWidth, window.innerHeight);
            fxaaPass.uniforms['resolution'].value.set(1 / (window.innerWidth * pixelRatio), 1 / (window.innerHeight * pixelRatio));
            scope.composer.setSize(window.innerWidth * pixelRatio, window.innerHeight * pixelRatio);
        }
        window.addEventListener('resize', onWindowResize, false);
        globalThis.currentTing = null;
        // Three.js scene
        this.graphicsWorld = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 20000000000/*20010*/);

        // Passes
        let renderPass = new RenderPass(this.graphicsWorld, this.camera);
        let fxaaPass = new ShaderPass(FXAAShader);

        // FXAA
        let pixelRatio = this.renderer.getPixelRatio();
        fxaaPass.material['uniforms'].resolution.value.x = 1 / (window.innerWidth * pixelRatio);
        fxaaPass.material['uniforms'].resolution.value.y = 1 / (window.innerHeight * pixelRatio);

        // Composer
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(renderPass);
        this.composer.addPass(fxaaPass);

        // Physics
        this.physicsWorld = new CANNON.World();
        this.physicsWorld.gravity.set(0, -9.81, 0);
        this.physicsWorld.broadphase = new CANNON.SAPBroadphase(this.physicsWorld);
        this.physicsWorld.solver.iterations = 10;
        this.physicsWorld.allowSleep = true;

        this.parallelPairs = [];
        this.physicsFrameRate = 60;
        this.physicsFrameTime = 1 / this.physicsFrameRate;
        this.physicsMaxPrediction = this.physicsFrameRate;

        // RenderLoop
        this.clock = new THREE.Clock();
        this.renderDelta = 0;
        this.logicDelta = 0;
        this.sinceLastFrame = 0;
        this.justRendered = false;

        // Stats (FPS, Frame time, Memory)
        this.stats = Stats();
        // Create right panel GUI
        this.createParamsGUI(scope);

        // Initialization
        this.inputManager = new InputManager(this, this.renderer.domElement);
        this.cameraOperator = new CameraOperator(this, this.camera, this.params.Mouse_Sensitivity);
        this.sky = new Sky(this);

        // Load scene if path is supplied
        if (worldScenePath !== undefined) {
            let loadingManager = new LoadingManager(this);
            loadingManager.onFinishedCallback = () => {
                this.update(1, 1);
                this.setTimeScale(1);

                Swal.fire({
                    title: 'Welcome to Sketchbook!',
                    text: 'Feel free to explore the world and interact with available vehicles. There are also various scenarios ready to launch from the right panel.',
                    footer: '<a href="https://github.com/inthenew/Sketchbook" target="_blank">GitHub page</a><a href="https://discord.gg/fGuEqCe" target="_blank">Discord server</a>',
                    confirmButtonText: 'Okay',
                    buttonsStyling: false,
                    onClose: () => {
                        UIManager.setUserInterfaceVisible(true);
                    }
                });
            };
            loadingManager.loadGLTF(worldScenePath, (gltf) => {
                this.loadScene(loadingManager, gltf);
            }
            );
        }
        else {
            UIManager.setUserInterfaceVisible(true);
            UIManager.setLoadingScreenVisible(false);
            Swal.fire({
                icon: 'success',
                title: 'Hello world!',
                text: 'Empty Sketchbook world was succesfully initialized. Enjoy the blueness of the sky.',
                buttonsStyling: false
            });
        }

        this.render(this);

        // Toggle controls visibility when the "z" key is pressed
        document.addEventListener("keydown", (e) => {
            if ((e.key === 'z' || e.key === 'Z') && !e.repeat) {
                this.toggleControlsHidden();
            }
        });
    }

    // Update
    // Handles all logic updates.
    public update(timeStep: number, unscaledTimeStep: number): void {
        this.updatePhysics(timeStep);

        // Update registred objects
        this.updatables.forEach((entity) => {
            entity.update(timeStep, unscaledTimeStep);
        });

        // Lerp time scale
        this.params.Time_Scale = THREE.MathUtils.lerp(this.params.Time_Scale, this.timeScaleTarget, 0.2);

        // Determine gravity based on the player's position //
        const player = this.characterInControl;
        // TODO //
        if (player) {
            const pos = Utils.threeVector(player.characterCapsule.body.position);
            const planet = this.planets.find(p => pos.distanceTo(p.position) <= p.radius);
            if (planet) {
                if (this.physicsWorld.gravity.y !== -planet.gravity * 9.81) {
                    this.physicsWorld.gravity.set(0, -planet.gravity * 9.81, 0);
                    // Wake all entities //
                    this.physicsWorld.bodies.forEach(body => {
                        body.wakeUp();
                    });
                }
            } else {
                if (this.physicsWorld.gravity.y !== 0) {
                    this.physicsWorld.gravity.set(0, 0, 0);
                    // Wake all entities //
                    this.physicsWorld.bodies.forEach(body => {
                        body.wakeUp();
                    });
                }
            }
        }
        // Physics debug
        if (this.params.Debug_Physics && this.cannonDebugRenderer !== undefined) this.cannonDebugRenderer.update();
    }

    public updatePhysics(timeStep: number): void {
        // Step the physics world
        this.physicsWorld.step(this.physicsFrameTime, timeStep);

        this.characters.forEach((char) => {
            if (this.isOutOfBounds(char.characterCapsule.body.position)) {
                this.outOfBoundsRespawn(char.characterCapsule.body);
                //globalThis.swimming = true;
                this.onMoon = false;
                //char.characterCapsule.body.velocity.y = 0;
                //char.characterCapsule.body.position.y = 14.989;
                //if (char.charState.constructor.name !== 'Action') {
                //char.setState(new Falling(char));
                //}
            }
        });

        this.vehicles.forEach((vehicle) => {
            let isBoat = typeof vehicle.isBoat === 'boolean';
            if (this.isOutOfBounds(vehicle.rayCastVehicle.chassisBody.position, isBoat)) {
                // Check if it is NOT a boat //
                if (!isBoat) {
                    let worldPos = new THREE.Vector3();
                    vehicle.spawnPoint.getWorldPosition(worldPos);
                    worldPos.y += 1;
                    this.outOfBoundsRespawn(vehicle.rayCastVehicle.chassisBody, Utils.cannonVector(worldPos));
                } else {
                    // It is a boat, so "float" it //
                    vehicle.collision.position.y = this.sealevel;
                    vehicle.collision.velocity.y = 0;
                }
            }
        });
    }

    public isOutOfBounds(position: CANNON.Vec3, isBoat?: boolean): boolean {
        let inside = position.x > -211.882 && position.x < 211.882 &&
            position.z > -169.098 && position.z < 153.232 &&
            position.y > 0.107;
        let belowSeaLevel = position.y < this.respawnLevel;
        if (isBoat) belowSeaLevel = position.y < this.sealevel;
        return !inside && belowSeaLevel;
    }

    public outOfBoundsRespawn(body: CANNON.Body, position?: CANNON.Vec3): void {
        let newPos = position || new CANNON.Vec3(0, 16, 0);
        let newQuat = new CANNON.Quaternion(0, 0, 0, 1);

        body.position.copy(newPos);
        body.interpolatedPosition.copy(newPos);
        body.quaternion.copy(newQuat);
        body.interpolatedQuaternion.copy(newQuat);
        body.velocity.setZero();
        body.angularVelocity.setZero();
    }

    /**
     * Rendering loop.
     * Implements fps limiter and frame-skipping
     * Calls world's "update" function before rendering.
     * @param {World} world 
     */
    public render(world: World): void {
        this.requestDelta = this.clock.getDelta();

        requestAnimationFrame(() => {
            world.render(world);
        });

        // Getting timeStep
        let unscaledTimeStep = (this.requestDelta + this.renderDelta + this.logicDelta);
        let timeStep = unscaledTimeStep * this.params.Time_Scale;
        timeStep = Math.min(timeStep, 1 / 30);    // min 30 fps

        // Logic
        world.update(timeStep, unscaledTimeStep);

        // Measuring logic time
        this.logicDelta = this.clock.getDelta();

        // Frame limiting
        let interval = 1 / 60;
        this.sinceLastFrame += this.requestDelta + this.renderDelta + this.logicDelta;
        this.sinceLastFrame %= interval;

        // Stats end
        this.stats.end();
        this.stats.begin();
        // Actual rendering with a FXAA ON/OFF switch
        if (this.params.FXAA) this.composer.render();
        else this.renderer.render(this.graphicsWorld, this.camera);

        // Measuring render time
        this.renderDelta = this.clock.getDelta();
    }

    public setTimeScale(value: number): void {
        this.params.Time_Scale = value;
        this.timeScaleTarget = value;
    }

    public add(worldEntity: IWorldEntity): void {
        worldEntity.addToWorld(this);
        this.registerUpdatable(worldEntity);
    }

    public registerUpdatable(registree: IUpdatable): void {
        this.updatables.push(registree);
        this.updatables.sort((a, b) => (a.updateOrder > b.updateOrder) ? 1 : -1);
    }

    public remove(worldEntity: IWorldEntity): void {
        worldEntity.removeFromWorld(this);
        this.unregisterUpdatable(worldEntity);
    }

    public unregisterUpdatable(registree: IUpdatable): void {
        _.pull(this.updatables, registree);
    }

    public loadScene(loadingManager: LoadingManager, gltf: any): void {
        gltf.scene.traverse((child) => {
            if (child.hasOwnProperty('userData')) {
                if (child.type === 'Mesh') {
                    Utils.setupMeshProperties(child);
                    this.sky.csm.setupMaterial(child.material);

                    if (child.material.name === 'ocean.001') {
                        this.registerUpdatable(new Ocean(child, this));
                    }
                    if (child.name === 'Cube352') {
                        const textureLoader = new THREE.TextureLoader();
                        const texturePath = 'https://cdn.glitch.global/f6cc8eab-88a8-45e8-bb4a-7774cb15ce09/image.png?v=1701630163223'; // Path to the texture image

                        // Load the texture using TextureLoader
                        textureLoader.load(texturePath, (texture) => {
                            texture.encoding = THREE.sRGBEncoding;
                            // Assign the loaded texture to the material's map property
                            //child.material.map = texture;
                            child.material = new THREE.MeshBasicMaterial({ map: texture })
                            // Optionally, you can specify other texture properties here
                            child.material.needsUpdate = true; // Ensure material updates properly
                        });
                    } else if (child.name === 'Layer0_001') {
                        const textureLoader = new THREE.TextureLoader();
                        const texturePath = 'https://www.farmersalmanac.com/wp-content/uploads/2023/04/full-moon-dates-and-times.jpeg'; // Path to the texture image

                        // Load the texture using TextureLoader
                        textureLoader.load(texturePath, (texture) => {
                            texture.encoding = THREE.sRGBEncoding;
                            // Assign the loaded texture to the material's map property
                            //child.material.map = texture;
                            child.material = new THREE.MeshBasicMaterial({ map: texture })
                            // Optionally, you can specify other texture properties here
                            child.material.needsUpdate = true; // Ensure material updates properly
                        });
                    }
                    { }
                }

                if (child.userData.hasOwnProperty('data')) {
                    if (child.userData.data === 'physics') {
                        if (child.userData.hasOwnProperty('type')) {
                            // Convex doesn't work! Stick to boxes!
                            if (child.userData.type === 'box') {
                                let phys = new BoxCollider({ size: new THREE.Vector3(child.scale.x, child.scale.y, child.scale.z) });
                                phys.body.position.copy(Utils.cannonVector(child.position));
                                phys.body.quaternion.copy(Utils.cannonQuat(child.quaternion));
                                phys.body.computeAABB();

                                phys.body.shapes.forEach((shape) => {
                                    shape.collisionFilterMask = ~CollisionGroups.TrimeshColliders;
                                });

                                this.physicsWorld.addBody(phys.body);
                            }
                            else if (child.userData.type === 'trimesh') {
                                let phys = new TrimeshCollider(child, {});
                                this.physicsWorld.addBody(phys.body);
                            }

                            child.visible = false;
                        }
                    }

                    if (child.userData.data === 'path') {
                        this.paths.push(new Path(child));
                    }

                    if (child.userData.data === 'scenario') {
                        this.scenarios.push(new Scenario(child, this));
                    }
                }
            }
        });

        this.graphicsWorld.add(gltf.scene);

        // Launch default scenario
        let defaultScenarioID: string;
        for (const scenario of this.scenarios) {
            if (scenario.default) {
                defaultScenarioID = scenario.id;
                break;
            }
        }
        if (defaultScenarioID !== undefined) this.launchScenario(defaultScenarioID, loadingManager);
    }

    public launchScenario(scenarioID: string, loadingManager?: LoadingManager): void {
        this.lastScenarioID = scenarioID;

        this.clearEntities();

        // Launch default scenario
        if (!loadingManager) loadingManager = new LoadingManager(this);
        for (const scenario of this.scenarios) {
            if (scenario.id === scenarioID || scenario.spawnAlways) {
                scenario.launch(loadingManager, this);
            }
        }
    }

    public restartScenario(): void {
        if (this.lastScenarioID !== undefined) {
            document.exitPointerLock();
            this.launchScenario(this.lastScenarioID);
        }
        else {
            console.warn('Can\'t restart scenario. Last scenarioID is undefined.');
        }
    }

    public clearEntities(): void {
        for (let i = 0; i < this.characters.length; i++) {
            this.remove(this.characters[i]);
            i--;
        }

        for (let i = 0; i < this.vehicles.length; i++) {
            this.remove(this.vehicles[i]);
            i--;
        }
    }

    public scrollTheTimeScale(scrollAmount: number): void {
        // Changing time scale with scroll wheel
        const timeScaleBottomLimit = 0.003;
        const timeScaleChangeSpeed = 1.3;

        if (scrollAmount > 0) {
            this.timeScaleTarget /= timeScaleChangeSpeed;
            if (this.timeScaleTarget < timeScaleBottomLimit) this.timeScaleTarget = 0;
        }
        else {
            this.timeScaleTarget *= timeScaleChangeSpeed;
            if (this.timeScaleTarget < timeScaleBottomLimit) this.timeScaleTarget = timeScaleBottomLimit;
            this.timeScaleTarget = Math.min(this.timeScaleTarget, 1);
        }
    }

    // A helper method to detect if the client is on a mobile device
    public isMobile(): boolean {
        return /Mobi|Android/i.test(navigator.userAgent);
    }

    /**
     * Helper to rebuild the full controls HTML.
     * If the controls are meant to be visible, the toggle control will always say "Hide Controls".
     */
    private rebuildControlsHTML(controls: any[], forceVisible: boolean = true): string {
        const toggleText = forceVisible ? "Hide Controls" : "Show Controls";
        const toggleControl = { keys: ['Z'], desc: toggleText };
        // Remove any existing toggle control (if any) from the array
        const controlsFiltered = controls.filter((control: any) => {
            return !(control.keys && control.keys.includes('Z'));
        });
        // Append our toggle control to the array
        controlsFiltered.push(toggleControl);

        let html = '<h2 class="controls-title">Controls:</h2>';
        controlsFiltered.forEach((row: { keys: any[]; desc: string; }) => {
            html += '<div class="ctrl-row">';
            row.keys.forEach((key: string) => {
                // Render special keys with spaces if needed.
                if (key === '+' || key === 'and' || key === 'or' || key === '&') {
                    html += '&nbsp;' + key + '&nbsp;';
                } else {
                    html += '<span class="ctrl-key">' + key + '</span>';
                }
            });
            html += '<span class="ctrl-desc">' + row.desc + '</span></div>';
        });
        return html;
    }

    /**
     * Updates the controls display.
     * Saves the full controls HTML (with the toggle text forced as "Hide Controls")
     * in this.controlsHTML for later use.
     */
    public updateControls(controls: any): void {
        // Save the provided controls array for later use
        this.lastControls = controls;
        // Build full controls HTML using our helper method.
        let html = this.rebuildControlsHTML(controls, true); // force visible => "Hide Controls" text
        // Always update the stored HTML.
        this.controlsHTML = html;

        if (!this.isMobile()) {
            if (!this.isContHidden) {
                // If the controls are not hidden, update the DOM.
                document.getElementById('controls')!.innerHTML = html;
                this.resizeControlsText();
            }
        }
    }

    /**
     * Toggles the visibility of the controls.
     * When hidden, shows a minimal "Show Controls" prompt.
     */
    public toggleControlsHidden(): void {
        // Toggle the isContHidden flag.
        this.isContHidden = !this.isContHidden;

        const controlsEl = document.getElementById('controls');
        if (!controlsEl) return;

        if (this.isContHidden) {
            // When hidden, show a minimal control that prompts the user to show controls.
            let minimalHtml = '<div class="ctrl-row">';
            minimalHtml += '<span class="ctrl-key">Z</span>';
            minimalHtml += '<span class="ctrl-desc">Show Controls</span>';
            minimalHtml += '</div>';
            controlsEl.innerHTML = minimalHtml;
            controlsEl.style.transform = 'scale(1)';
        } else {
            // When showing controls, rebuild the full HTML so that the toggle text is "Hide Controls".
            if (this.lastControls) {
                this.controlsHTML = this.rebuildControlsHTML(this.lastControls, true);
            }
            controlsEl.innerHTML = this.controlsHTML;
            this.resizeControlsText();
        }
    }

    /**
     * Adjusts the font size of the controls element responsively.
     */
    public resizeControlsText(): void {
        const controlsEl = document.getElementById('controls');
        if (!controlsEl) return;
        const windowWidth = window.innerWidth;
        let fontSize: string = "16px";
        if (windowWidth < 600) {
            fontSize = "12px";
        } else if (windowWidth < 900) {
            fontSize = "14px";
        }
        controlsEl.style.fontSize = fontSize;
    }

    private generateHTML(): void {
        // Fonts
        $('head').append('<link href="https://fonts.googleapis.com/css2?family=Alfa+Slab+One&display=swap" rel="stylesheet">');
        $('head').append('<link href="https://fonts.googleapis.com/css2?family=Solway:wght@400;500;700&display=swap" rel="stylesheet">');
        $('head').append('<link href="https://fonts.googleapis.com/css2?family=Cutive+Mono&display=swap" rel="stylesheet">');

        // Loader
        $(`	<div id="loading-screen">
				<div id="loading-screen-background"></div>
				<h1 id="main-title" class="sb-font">Sketchbook 0.4</h1>
				<div class="cubeWrap">
					<div class="cube">
						<div class="faces1"></div>
						<div class="faces2"></div>     
					</div> 
				</div> 
				<div id="loading-text">Loading...</div>
			</div>
		`).appendTo('body');

        // UI
        $(`	<div id="ui-container" style="display: none;">
				<div class="github-corner">
					<a href="https://github.com/inthenew/Sketchbook" target="_blank" title="Fork me on GitHub">
						<svg viewbox="0 0 100 100" fill="currentColor">
							<title>Fork me on GitHub</title>
							<path d="M0 0v100h100V0H0zm60 70.2h.2c1 2.7.3 4.7 0 5.2 1.4 1.4 2 3 2 5.2 0 7.4-4.4 9-8.7 9.5.7.7 1.3 2
							1.3 3.7V99c0 .5 1.4 1 1.4 1H44s1.2-.5 1.2-1v-3.8c-3.5 1.4-5.2-.8-5.2-.8-1.5-2-3-2-3-2-2-.5-.2-1-.2-1
							2-.7 3.5.8 3.5.8 2 1.7 4 1 5 .3.2-1.2.7-2 1.2-2.4-4.3-.4-8.8-2-8.8-9.4 0-2 .7-4 2-5.2-.2-.5-1-2.5.2-5
							0 0 1.5-.6 5.2 1.8 1.5-.4 3.2-.6 4.8-.6 1.6 0 3.3.2 4.8.7 2.8-2 4.4-2 5-2z"></path>
						</svg>
					</a>
				</div>
				<div class="left-panel">
					<div id="controls" class="panel-segment flex-bottom"></div>
				</div>
			</div>
		`).appendTo('body');
        $(`
        <!-- planet-menu.html -->
<div id="planet-menu" class="planet-menu-hidden">
        <h1 class="planet-heading">Which planet do you want to go to?</h1>
    <div class="planet-item" id="earth">
        <img src="https://cdn.mos.cms.futurecdn.net/yCPyoZDQBBcXikqxkeW2jJ.jpg" alt="Earth">
        <p>Earth</p>
    </div>
    <div class="planet-item" id="moon">
        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/FullMoon2010.jpg/1200px-FullMoon2010.jpg" alt="Moon">
        <p>Moon</p>
    </div>
    <!-- Add more planets as needed -->
</div>
        `).appendTo('body')
        // Canvas
        document.body.appendChild(this.renderer.domElement);
        this.renderer.domElement.id = 'canvas';
    }

    private createParamsGUI(scope: World): void {
        this.params = {
            Pointer_Lock: true,
            Mouse_Sensitivity: 0.3,
            Time_Scale: 1,
            Shadows: true,
            FXAA: false,
            Debug_Physics: false,
            Debug_FPS: false,
            Sun_Elevation: 50,
            Sun_Rotation: 145,
            Has_Night_Time: false,
            Has_Day_Night_Cycle: false,
            Friction_Slip: 0.8,
            Suspension_Stiffness: 20,
            Max_Suspension: 1,
            Engine_Force: 10,
            Damping_Compression: 2,
            Damping_Relaxation: 2,
            Free_Cam_Speed: 1,
            Reset_Settings: function () {
                resetSettings();
            },
            Reset_World_Settings: function () {
                resetWorldSettings();
            },
            Reset_Car_Settings: function () {
                resetCarSettings();
            },
            Gravity_Scale: 1
        };
        this.defParams = { ...this.params };
        const resetSettings = () => {
            this.params = { ...this.defParams };

            saveSettings();
            setValues(this.params, gui);
            saveSettings();
        }

        let setValues = (newValues, gui2) => {
            for (var i in gui2.__controllers) {
                if (newValues.hasOwnProperty(gui2.__controllers[i].property)) {
                    let newValue = newValues[gui2.__controllers[i].property];
                    if (gui2.__controllers[i].getValue() !== newValue) {
                        gui2.__controllers[i].setValue(newValue);
                    }
                }
            }
            for (var f in gui2.__folders) {
                setValues(newValues, gui2.__folders[f]);
            }
        }


        const saveSettings = () => {
            let params = { ...this.defParams };
            let dost = (newValues, gui2) => {
                for (let i in gui2.__controllers) {
                    if (newValues.hasOwnProperty(gui2.__controllers[i].property)) {
                        newValues[gui2.__controllers[i].property] = gui2.__controllers[i].getValue();
                    }
                }
                for (let f in gui2.__folders) {
                    dost(newValues, gui2.__folders[f]);
                }
            }
            dost(params, gui);
            localStorage.setItem('settings', JSON.stringify(params));
        }


        const resetCarSettings = () => {
            let d = { ...this.params };
            d.Friction_Slip = 0.8;
            d.Suspension_Stiffness = 20;
            d.Max_Suspension = 1;
            d.Damping_Compression = 2;
            d.Damping_Relaxation = 2;
            d.Engine_Force = 10;
            d.Gravity_Scale = 1;
            let params = { ...d };
            let dost = (newValues, gui2) => {
                if (gui2.__controllers.length > 0) {
                    if (gui2.__controllers[0].property === 'Friction_Slip') {
                        for (let i in gui2.__controllers) {
                            let newValue = newValues[gui2.__controllers[i].property];
                            if (gui2.__controllers[i].getValue() !== newValue) {
                                gui2.__controllers[i].setValue(newValue);
                            }
                        }
                    }
                }
                for (let f in gui2.__folders) {
                    dost(newValues, gui2.__folders[f]);
                }
            }
            dost(params, gui);
            localStorage.setItem('settings', JSON.stringify(params));
        }
        const resetWorldSettings = () => {
            this.params.Time_Scale = this.defParams.Time_Scale;
            this.params.Gravity_Scale = this.defParams.Gravity_Scale;
            this.params.Free_Cam_Speed = this.defParams.Free_Cam_Speed;
            // reset other world settings

            this.physicsWorld.gravity.set(0, -9.81 * this.params.Gravity_Scale, 0);

            // update GUI
            gui.updateDisplay();

            saveSettings();
        }
        const loadSettings = (isNR) => {
            let savedSettings = localStorage.getItem('settings');
            if (!isNR) {
                savedSettings = JSON.stringify(this.defParams);
            }
            if (savedSettings || !isNR) {
                Object.assign(this.params, JSON.parse(savedSettings));

                setTimeout(() => {
                    //this.timeScaleTarget = Number(this.params.Time_Scale); Does not work //
                    scope.Has_Day_Night_Cycle = this.params.Has_Day_Night_Cycle;
                    scope.Has_Night_Time = this.params.Has_Night_Time;
                    scope.Free_Cam_Speed = this.params.Free_Cam_Speed;
                    if (this.params.Shadows) {
                        this.sky.csm.lights.forEach((light) => {
                            light.castShadow = true;
                        });
                    }
                    else {
                        this.sky.csm.lights.forEach((light) => {
                            light.castShadow = false;
                        });
                    }
                    this.physicsWorld.gravity.set(0, -9.81 * this.params.Gravity_Scale, 0);
                    scope.inputManager.setPointerLock(this.params.Pointer_Lock);
                    scope.cameraOperator.setSensitivity(this.params.Mouse_Sensitivity, this.params.Mouse_Sensitivity * 0.8);
                    if (this.params.Debug_Physics) {
                        this.cannonDebugRenderer = new CannonDebugRenderer(this.graphicsWorld, this.physicsWorld);
                    }

                    scope.characters.forEach((char) => {
                        char.raycastBox.visible = this.params.Debug_Physics;
                    });
                    UIManager.setFPSVisible(this.params.Debug_FPS);
                    let vehicles = this.vehicles;
                    for (let i = 0; i < vehicles.length; i++) {
                        if (typeof vehicles[i].isCar === 'boolean') {
                            // Is a car //
                            let car = vehicles[i];
                            car.updateWheelProps('frictionSlip', this.params.Friction_Slip);
                            car.updateWheelProps('suspensionStiffness', this.params.Suspension_Stiffness);
                            car.updateWheelProps('maxSuspensionTravel', this.params.Max_Suspension);
                            car.updateWheelProps('dampingCompression', this.params.Damping_Compression);
                            car.updateWheelProps('dampingRelaxation', this.params.Damping_Relaxation);
                            car.updateCarSpeed(this.params.Engine_Force);
                        }
                    }
                }, 500)
            } else {
                if (scope.Free_Cam_Speed === undefined) {// Fixes bug //
                    scope.Free_Cam_Speed = 1;
                }
            }
            let last = 0;
            setInterval(() => {
                if (this.vehicles.length !== last) {
                    last = this.vehicles.length;
                    let vehicles = this.vehicles;
                    for (let i = 0; i < vehicles.length; i++) {
                        if (typeof vehicles[i].isCar === 'boolean') {
                            // Is a car //
                            let car = vehicles[i];
                            car.updateWheelProps('frictionSlip', this.params.Friction_Slip);
                            car.updateWheelProps('suspensionStiffness', this.params.Suspension_Stiffness);
                            car.updateWheelProps('maxSuspensionTravel', this.params.Max_Suspension);
                            car.updateWheelProps('dampingCompression', this.params.Damping_Compression);
                            car.updateWheelProps('dampingRelaxation', this.params.Damping_Relaxation);
                            car.updateCarSpeed(this.params.Engine_Force);
                        }
                    }
                }
            })
        }
        const gui = new GUI.GUI();
        this.gui = gui;
        loadSettings(true);
        // Scenario
        this.scenarioGUIFolder = gui.addFolder('Scenarios');
        this.scenarioGUIFolder.open();
        globalThis.pp = scope;
        setInterval(() => {
            if (scope.Has_Day_Night_Cycle) {
                scope.sky._phi += .01 * this.params.Time_Scale;
                if (!scope.Has_Night_Time && scope.sky._phi >= 180) {
                    scope.sky._phi = 0;
                } else if (scope.Has_Night_Time && scope.sky._phi >= 360) {
                    scope.sky._phi = 0;
                }
                //scope.sky._theta += 1;
            } else {
                scope.sky._phi = 50;
            }
        }, 10)
        // World
        let worldFolder = gui.addFolder('World');
        worldFolder.add(this.params, 'Time_Scale', 0, 1).listen()
            .onChange((value) => {
                scope.timeScaleTarget = value;
                this.params.Time_Scale = value;
                //saveSettings(); Does not work //
            });
        worldFolder.add(this.params, 'Free_Cam_Speed', 0, 100).onChange((value) => {
            scope.Free_Cam_Speed = value;
            this.params.Free_Cam_Speed = value;
            saveSettings();
        })
        worldFolder.add(this.params, 'Has_Day_Night_Cycle').listen().onChange((value) => {
            scope.Has_Day_Night_Cycle = value;
            saveSettings();
        })
        worldFolder.add(this.params, 'Has_Night_Time').listen().onChange((value) => {
            scope.Has_Night_Time = value;
            saveSettings();
        })

        worldFolder.add(this.params, 'Gravity_Scale', 0, 2).onChange((value) => {
            scope.Gravity_Scale = value;
            this.physicsWorld.gravity.set(0, -9.81 * value, 0);
            saveSettings();
        });

        worldFolder.add(this.params, 'Reset_World_Settings')
            .name('Reset World Settings')
            .listen()
            .onChange(resetWorldSettings);
        /* // Day and Night cycle replaces this //
    worldFolder.add(this.params, 'Sun_Elevation', 0, 180).listen()
        .onChange((value) =>
        {
            scope.sky.phi = value;
        });
    worldFolder.add(this.params, 'Sun_Rotation', 0, 360).listen()
        .onChange((value) =>
        {
            scope.sky.theta = value;
        });
        */ // Day and Night cycle replaces this //

        // Input
        let settingsFolder = gui.addFolder('Settings');
        settingsFolder.add(this.params, 'FXAA').onChange((enabled) => {
            saveSettings();
        })
        settingsFolder.add(this.params, 'Shadows')
            .onChange((enabled) => {
                if (enabled) {
                    this.sky.csm.lights.forEach((light) => {
                        light.castShadow = true;
                    });
                    saveSettings();
                }
                else {
                    this.sky.csm.lights.forEach((light) => {
                        light.castShadow = false;
                    });
                    saveSettings();
                }
            })
        settingsFolder.add(this.params, 'Pointer_Lock')
            .onChange((enabled) => {
                scope.inputManager.setPointerLock(enabled);
                saveSettings();
            })
        settingsFolder.add(this.params, 'Mouse_Sensitivity', 0, 1)
            .onChange((value) => {
                scope.cameraOperator.setSensitivity(value, value * 0.8);
                saveSettings();
            })
        settingsFolder.add(this.params, 'Debug_Physics')
            .onChange((enabled) => {
                if (enabled) {
                    this.cannonDebugRenderer = new CannonDebugRenderer(this.graphicsWorld, this.physicsWorld);
                }
                else {
                    this.cannonDebugRenderer.clearMeshes();
                    this.cannonDebugRenderer = undefined;
                }

                scope.characters.forEach((char) => {
                    char.raycastBox.visible = enabled;
                });
                saveSettings();
            })
        settingsFolder.add(this.params, 'Debug_FPS')
            .onChange((enabled) => {
                UIManager.setFPSVisible(enabled);
                saveSettings();
            })

        settingsFolder.add(this.params, 'Reset_Settings').name('Reset Settings');
        let advancedVFolder = gui.addFolder('Advanced Vehicles');
        advancedVFolder.add(this.params, 'Friction_Slip', 0, 10).onChange(value => {
            this.params.Friction_Slip = value;
            // Apply to all cars //
            let vehicles = this.vehicles;
            for (let i = 0; i < vehicles.length; i++) {
                if (typeof vehicles[i].isCar === 'boolean') {
                    // Is a car //
                    let car = vehicles[i];
                    car.updateWheelProps('frictionSlip', value);
                }
            }
            saveSettings();
        })
        advancedVFolder.add(this.params, 'Engine_Force', .1, 100).onChange(value => {
            this.params.Engine_Force = value;
            // Apply to all cars //
            let vehicles = this.vehicles;
            for (let i = 0; i < vehicles.length; i++) {
                if (typeof vehicles[i].isCar === 'boolean') {
                    // Is a car //
                    let car = vehicles[i];
                    car.updateCarSpeed(value);
                }
            }
            saveSettings();
        })
        advancedVFolder.add(this.params, 'Suspension_Stiffness', 0, 100).onChange(value => {
            this.params.Suspension_Stiffness = value;

            // Apply to all cars //
            let vehicles = this.vehicles;
            for (let i = 0; i < vehicles.length; i++) {
                if (typeof vehicles[i].isCar === 'boolean') {
                    // Is a car //
                    let car = vehicles[i];
                    car.updateWheelProps('suspensionStiffness', value);
                }
            }
            saveSettings();
        })

        //advancedVFolder.add(this.params, 'Suspension_Size', 0, 5).onChange(value => {
        //    saveSettings();
        //})

        advancedVFolder.add(this.params, 'Max_Suspension', 0, 5).onChange(value => {
            this.params.Max_Suspension = value;
            // Apply to all cars //
            let vehicles = this.vehicles;
            for (let i = 0; i < vehicles.length; i++) {
                if (typeof vehicles[i].isCar === 'boolean') {
                    // Is a car //
                    let car = vehicles[i];
                    car.updateWheelProps('maxSuspensionTravel', value);
                }
            }
            saveSettings();
        })

        advancedVFolder.add(this.params, 'Damping_Compression', 0, 5).onChange(value => {
            this.params.Damping_Compression = value;
            // Apply to all cars //
            let vehicles = this.vehicles;
            for (let i = 0; i < vehicles.length; i++) {
                if (typeof vehicles[i].isCar === 'boolean') {
                    // Is a car //
                    let car = vehicles[i];
                    car.updateWheelProps('dampingCompression', value);
                }
            }
            saveSettings();
        })

        advancedVFolder.add(this.params, 'Damping_Relaxation', 0, 5).onChange(value => {
            this.params.Damping_Relaxation = value;
            // Apply to all cars //
            let vehicles = this.vehicles;
            for (let i = 0; i < vehicles.length; i++) {
                if (typeof vehicles[i].isCar === 'boolean') {
                    // Is a car //
                    let car = vehicles[i];
                    car.updateWheelProps('dampingRelaxation', value);
                }
            }
            saveSettings();
        })
        advancedVFolder.add(this.params, 'Reset_Car_Settings').name('Reset Car Settings');
        gui.open();
    }
}