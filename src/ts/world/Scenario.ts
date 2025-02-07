import { ISpawnPoint } from '../interfaces/ISpawnPoint';
import { VehicleSpawnPoint } from './VehicleSpawnPoint';
import { CharacterSpawnPoint } from './CharacterSpawnPoint';
import { World } from '../world/World';
import { LoadingManager } from '../core/LoadingManager';
import * as THREE from 'three';

export class Scenario {
    public id: string;
    public name: string;
    public spawnAlways: boolean = false;
    public default: boolean = false;
    public world: World;
    public descriptionTitle: string;
    public descriptionContent: string;

    private rootNode: THREE.Object3D;
    private spawnPoints: ISpawnPoint[] = [];
    private invisible: boolean = false;
    private initialCameraAngle: number;
    private isRace: boolean = false;
    private lap: number = 0;
    private justLapped: boolean = false;
    private justStarted: boolean = true;
    private playerPosition: THREE.Vector3 = new THREE.Vector3();
    private race: string = 'oval';
    private justLappedTunnel1: boolean = false;
    private justLappedTunnel2: boolean = false;
    constructor(root: THREE.Object3D, world: World) {
        this.rootNode = root;
        this.world = world;
        this.id = root.name;
        // Scenario
        if (root.userData.hasOwnProperty('name')) {
            this.name = root.userData.name;
        }
        if (root.userData.hasOwnProperty('default') && root.userData.default === 'true') {
            this.default = true;
        }
        if (root.userData.hasOwnProperty('spawn_always') && root.userData.spawn_always === 'true') {
            this.spawnAlways = true;
        }
        if (root.userData.hasOwnProperty('invisible') && root.userData.invisible === 'true') {
            this.invisible = true;
        }
        if (root.userData.hasOwnProperty('desc_title')) {
            this.descriptionTitle = root.userData.desc_title;
        }
        if (root.userData.hasOwnProperty('desc_content')) {
            this.descriptionContent = root.userData.desc_content;
        }
        if (root.userData.hasOwnProperty('camera_angle')) {
            this.initialCameraAngle = root.userData.camera_angle;
        }

        if (!this.invisible) this.createLaunchLink();

        // Find all scenario spawns and enitites
        root.traverse((child) => {
            if (child.hasOwnProperty('userData') && child.userData.hasOwnProperty('data')) {
                if (child.userData.data === 'spawn') {
                    if (child.userData.type === 'car' || child.userData.type === 'airplane' || child.userData.type === 'heli' || child.userData.type === 'boat' || child.userData.type === 'rocketship') {
                        let sp = new VehicleSpawnPoint(child);

                        if (child.userData.hasOwnProperty('type')) {
                            sp.type = child.userData.type;
                        }

                        if (child.userData.hasOwnProperty('driver')) {
                            sp.driver = child.userData.driver;

                            if (child.userData.driver === 'ai' && child.userData.hasOwnProperty('first_node')) {
                                sp.firstAINode = child.userData.first_node;
                            }
                        }

                        this.spawnPoints.push(sp);
                    }
                    else if (child.userData.type === 'player') {
                        let sp = new CharacterSpawnPoint(child);
                        this.spawnPoints.push(sp);
                    }
                }
            }
        });
    }
    public displayLap() {
        this.world.heading.innerHTML = `Lap: ${this.lap}`;
    }
    public checkLap(playerPosition: THREE.Vector3): void {
        this.playerPosition.copy(playerPosition);
        if (this.world.isF) return;
        const isInArea1 = this.playerPosition.x <= 55 && this.playerPosition.x >= 30 && this.playerPosition.z >= -3 && this.playerPosition.z <= 3;
        const isInArea2 = this.playerPosition.x >= -55 && this.playerPosition.x <= -30 && this.playerPosition.z >= -3 && this.playerPosition.z <= 3;
        if (isInArea1) {
            if (!this.justLappedTunnel1) {
                this.justLappedTunnel1 = true;
                this.justLappedTunnel2 = false;
            }
        } else if (isInArea2) {
            if (!this.justLappedTunnel2 && this.justLappedTunnel1) {
                this.justLappedTunnel2 = true;
                this.justLappedTunnel1 = false;
                ++this.lap;
                this.displayLap();
            }
        } else {
            this.justLappedTunnel2 = false;
        }
    }
    public checkLapT(playerPosition: THREE.Vector3): void {
        this.playerPosition.copy(playerPosition);
        if (this.world.isF) return;
        const isInArea1 = this.playerPosition.x >= 130 && this.playerPosition.x <= 140 && this.playerPosition.z >= -15 && this.playerPosition.z <= 15;
        const isInArea2 = this.playerPosition.x <= -148 && this.playerPosition.x >= -163 && this.playerPosition.z >= -15 && this.playerPosition.z <= 15;

        if (isInArea1) {
            if (!this.justLappedTunnel1) {
                this.justLappedTunnel1 = true;
                this.justLappedTunnel2 = false;
            }
        } else if (isInArea2) {
            if (!this.justLappedTunnel2 && this.justLappedTunnel1) {
                this.justLappedTunnel2 = true;
                this.justLappedTunnel1 = false;
                this.lap++;
                this.displayLap();
            }
        } else {
            this.justLappedTunnel2 = false;
        }
    }
    public checkLapF(playerPosition: THREE.Vector3): void {
        this.playerPosition.copy(playerPosition);
        if (this.world.isF) return;
        const isInArea1 = this.playerPosition.x <= -80 && this.playerPosition.x >= -120 && this.playerPosition.z <= -80 && this.playerPosition.z >= -95;
        const isInArea2 = this.playerPosition.x <= -110 && this.playerPosition.x >= -150 && this.playerPosition.z <= -18 && this.playerPosition.z >= -30;

        if (isInArea1) {
            if (!this.justLappedTunnel1) {
                this.justLappedTunnel1 = true;
                this.justLappedTunnel2 = false;
            }
        } else if (isInArea2) {
            if (!this.justLappedTunnel2 && this.justLappedTunnel1) {
                this.justLappedTunnel2 = true;
                this.justLappedTunnel1 = false;
                this.lap++;
                this.displayLap();
            }
        } else {
            this.justLappedTunnel2 = false;
        }
    }
    public createLaunchLink(): void {
        this.world.params[this.name] = () => {
            this.world.launchScenario(this.id);
        };
        if (this.name !== 'Boat Race') {
            this.world.scenarioGUIFolder.add(this.world.params, this.name);
        } else {
            let controller = this.world.scenarioGUIFolder.add(this.world.params, this.name);

            // Remove the newly added controller
            this.world.scenarioGUIFolder.remove(controller);

            // Insert the controller at the desired index
            this.world.scenarioGUIFolder.__controllers.splice(4, 0, controller);

            // Re-render the folder to reflect changes
            this.world.scenarioGUIFolder.__ul.insertBefore(controller.__li, this.world.scenarioGUIFolder.__ul.childNodes[4]);
        }
    }

    public launch(loadingManager: LoadingManager, world: World): void {
        this.spawnPoints.forEach((sp) => {
            sp.spawn(loadingManager, world);
        });
        if (this.descriptionTitle !== undefined) {
            // Reset laps //
            this.lap = 0;
            // Rest Intervals //
            if (globalThis.a !== 'sd') {
                clearInterval(globalThis.a);
            }
            this.justLapped = false;
            this.justStarted = true;
            this.justLappedTunnel1 = false;
            this.justLappedTunnel2 = false;
            // Hide lap text //
            document.getElementById('laps').style.visibility = 'hidden';
            this.world.heading.innerHTML = `Lap: 0`;
            // For now only oval races track laps :) //
            if (this.descriptionTitle === 'Oval race') {
                this.isRace = true;
                this.race = 'oval';
            } else if (this.descriptionTitle === 'Tunnel race') {
                this.isRace = true;
                this.race = 'tunnel';
            } else if (this.descriptionTitle === 'Figure 8 race') {
                this.isRace = true;
                this.race = 'fig';
            }
            if (this.isRace && this.race === 'oval') {
                document.getElementById('laps').style.visibility = 'visible';
                globalThis.a = setInterval(() => {
                    //if ()//
                    this.checkLap(world.camera.position);
                })
            } else if (this.isRace && this.race === 'tunnel') {
                document.getElementById('laps').style.visibility = 'visible';
                globalThis.a = setInterval(() => {
                    //if ()//
                    this.checkLapT(world.camera.position);
                })
            } else if (this.isRace && this.race === 'fig') {
                document.getElementById('laps').style.visibility = 'visible';
                globalThis.a = setInterval(() => {
                    //if ()//
                    this.checkLapF(world.camera.position);
                })
            }
        }
        if (!this.spawnAlways) {
            loadingManager.createWelcomeScreenCallback(this);
            world.cameraOperator.theta = this.initialCameraAngle;
            world.cameraOperator.phi = 15;
        }
    }
}