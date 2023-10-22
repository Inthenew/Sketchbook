import * as THREE from 'three';
import * as CANNON from 'cannon';
import * as Utils from '../core/FunctionLibrary';
import * as $ from 'jquery';
import { Vehicle } from './Vehicle';
import { IControllable } from '../interfaces/IControllable';
import { IWorldEntity } from '../interfaces/IWorldEntity';
import { KeyBinding } from '../core/KeyBinding';
import { World } from '../world/World';
import { EntityType } from '../enums/EntityType';

export class RocketShip extends Vehicle implements IControllable, IWorldEntity {
    public entityType: EntityType = EntityType.RocketShip;
    public rotors: THREE.Object3D[] = [];
    private enginePower: number = 0;
    private justBlasted: boolean = false;
    private balancing: boolean = false;
    private landing: boolean = false;
    private smokeSystem: any;
    private totalDown: number = 0;
    private firstTime: boolean = true;
    private goingDown: any = null;
    private clock: any = new THREE.Clock();
    constructor(gltf: any) {
        super(gltf);

        this.readHelicopterData(gltf);
        this.initSmoke();
        this.collision.preStep = (body: CANNON.Body) => { this.physicsPreStep(body, this); };

        this.actions = {
            'ascend': new KeyBinding('ShiftLeft'),
            'descend': new KeyBinding('Space'),
            'pitchUp': new KeyBinding('KeyS'),
            'pitchDown': new KeyBinding('KeyW'),
            'yawLeft': new KeyBinding('KeyQ'),
            'yawRight': new KeyBinding('KeyE'),
            'rollLeft': new KeyBinding('KeyA'),
            'rollRight': new KeyBinding('KeyD'),
            'exitVehicle': new KeyBinding('KeyF'),
            'seat_switch': new KeyBinding('KeyX'),
            'view': new KeyBinding('KeyV'),
        };
    }

    public noDirectionPressed(): boolean {
        let result =
            !this.actions.ascend.isPressed &&
            !this.actions.descend.isPressed;

        return result;
    }

    public update(timeStep: number): void {
        super.update(timeStep, false);

        // Rotors visuals
        if (this.controllingCharacter !== undefined) {
            if (this.enginePower < 1) this.enginePower += timeStep * 0.2;
            if (this.enginePower > 1) this.enginePower = 1;
        }
        else {
            if (this.enginePower > 0) this.enginePower -= timeStep * 0.06;
            if (this.enginePower < 0) this.enginePower = 0;
        }
        if (this.justBlasted) {
            this.smokeSystem.visible = true;
            this.updateSmoke();
        } else {
            this.smokeSystem.visible = false;
        }
        this.rotors.forEach((rotor) => {
            rotor.rotateX(this.enginePower * timeStep * 30);
        });
    }

    public onInputChange(): void {
        super.onInputChange();

        if (this.actions.exitVehicle.justPressed && this.controllingCharacter !== undefined) {
            this.forceCharacterOut(false);
        }
        if (this.actions.view.justPressed) {
            this.toggleFirstPersonView();
        }
    }
    private initSmoke() {
        const particleCount = 200;
        const textureLoader = new THREE.TextureLoader();
        const smokeTexture = textureLoader.load('https://t3.ftcdn.net/jpg/05/41/63/12/360_F_541631242_Jc9kgzgUikfjKdPWpd0Fh4545crO4IHS.jpg');
        const smokeMaterial = new THREE.PointsMaterial({
            map: smokeTexture,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false,
            size: .5
        });
        const smokeGeometry = new THREE.BufferGeometry();
        const particles = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount * 3; i++) {
            particles[i] = (Math.random() - 0.5) * 10;
        }
        smokeGeometry.setAttribute('position', new THREE.BufferAttribute(particles, 3));
        this.smokeSystem = new THREE.Points(smokeGeometry, smokeMaterial);
        this.smokeSystem.userData = {
            particles: Array.from({ length: particleCount }, () => this.createParticle())
        };
        this.smokeSystem.frustumCulled = false;
        this.smokeSystem.visible = false;
        super.add(this.smokeSystem);
    }

    private createParticle() {
        const particle = new THREE.Vector3(
            (Math.random() - 0.5),
            (Math.random() - 0.5) * 2 - 1,
            (Math.random() - 0.5)
        );
        const lifetime = Math.random() + 1; // particles live for 1 to 3 seconds
        return { particle, lifetime, age: 0 };
    }
    private updateSmoke() {
        const delta = this.clock.getDelta(); // Assumes you have a THREE.Clock instance
        const positionAttribute = this.smokeSystem.geometry.getAttribute('position');
        this.smokeSystem.userData.particles.forEach((particleData, i) => {
            particleData.age += delta;
            if (particleData.age > particleData.lifetime) {
                Object.assign(particleData, this.createParticle());
            }
            const progress = particleData.age / particleData.lifetime;
            const { particle } = particleData;
            particle.y -= delta * 5 * (1 - progress); // Move up and slow down over time
            positionAttribute.setXYZ(i, particle.x, particle.y, particle.z);
        });
        positionAttribute.needsUpdate = true;
    }
    public physicsPreStep(body: CANNON.Body, heli: RocketShip): void {
        let quat = Utils.threeQuat(body.quaternion);
        let right = new THREE.Vector3(1, 0, 0).applyQuaternion(quat);
        let globalUp = new THREE.Vector3(0, 1, 0);
        let up = new THREE.Vector3(0, 1, 0).applyQuaternion(quat);
        let forward = new THREE.Vector3(0, 0, 1).applyQuaternion(quat);

        // Throttle //
        // Disabaling this as the player should not be able to control the rocketship //
        // descend is blasting off //
        /*
        let sddd = 15;
        if (heli.actions.ascend.isPressed)
        {
            body.velocity.x += up.x * sddd * this.enginePower;
            body.velocity.y += up.y * sddd * this.enginePower;
            body.velocity.z += up.z * sddd * this.enginePower;
        }
        if (heli.actions.descend.isPressed)
        {
            body.velocity.x -= up.x * sddd * this.enginePower;
            body.velocity.y -= up.y * sddd * this.enginePower;
            body.velocity.z -= up.z * sddd * this.enginePower;
        }
        */
        let stages = [5, 10, 15, 20];
        //let stages = [1, 2, 3, 4];
        let timebetween = 25;
        if (heli.actions.descend.isPressed && !this.justBlasted) {
            this.justBlasted = true;
            console.log('Taking off...')
            let stage = 0;
            let times = 0;
            let sd = setInterval(() => {
                body.velocity.x += up.x * stages[stage] * this.enginePower;
                body.velocity.y += up.y * stages[stage] * this.enginePower;
                body.velocity.z += up.z * stages[stage] * this.enginePower;
                ++times;
                if (times >= timebetween) {
                    ++stage;
                    times = 0;
                }
            }, 200)
            setTimeout(() => {
                //this.justBlasted = false;
                clearInterval(sd);
                // Now activate vertical stabilization //
                this.balancing = true;
                console.log('Balancing craft...')
                // Show menu //
                if (this.controllingCharacter !== undefined) {
                    document.getElementById('planet-menu')?.classList.remove('planet-menu-hidden');
                    document.exitPointerLock();
                } else {
                    console.log(this.controllingCharacter);
                    // Auto-land //
                    console.log('Auto Landing...');
                    this.landing = true;
                }
                $('#earth').click((e) => {
                    document.getElementById('planet-menu')?.classList.add('planet-menu-hidden');
                    // Land on earth //
                    console.log('Landing...');
                    this.landing = true;
                })
            }, 20000/*20000 bring back*/)
        }
        // Vertical stabilization
        if (this.balancing) {
            let gravity = heli.world.physicsWorld.gravity;
            let gravityCompensation = new CANNON.Vec3(-gravity.x, -gravity.y, -gravity.z).length();
            gravityCompensation *= heli.world.physicsFrameTime;
            gravityCompensation *= 0.98;
            let dot = globalUp.dot(up);
            gravityCompensation *= Math.sqrt(THREE.MathUtils.clamp(dot, 0, 1));

            let vertDamping = new THREE.Vector3(0, body.velocity.y, 0).multiplyScalar(-0.01);
            let vertStab = up.clone();
            vertStab.multiplyScalar(gravityCompensation);
            vertStab.add(vertDamping);
            vertStab.multiplyScalar(heli.enginePower);

            body.velocity.x += vertStab.x;
            body.velocity.y += !this.landing ? vertStab.y : vertStab.y - 5;
            body.velocity.z += vertStab.z;
            if (body.position.y <= 16.1283) {
                this.landing = false;
                this.balancing = false;
                setTimeout(() => {
                    this.justBlasted = false;
                }, 1000)
            }
        }
        // Positional damping
        body.velocity.x *= THREE.MathUtils.lerp(1, 0.995, this.enginePower);
        body.velocity.z *= THREE.MathUtils.lerp(1, 0.995, this.enginePower);

        // Angular damping
        body.angularDamping = 1;
    }

    public readHelicopterData(gltf: any): void {
        gltf.scene.traverse((child) => {
            if (child.hasOwnProperty('userData')) {
                if (child.userData.hasOwnProperty('data')) {
                    if (child.userData.data === 'rotor') {
                        this.rotors.push(child);
                    }
                }
            }
        });
    }

    public inputReceiverInit(): void {
        super.inputReceiverInit();

        this.world.updateControls([
            {
                keys: ['Space'],
                desc: 'Blast off'
            },
            {
                keys: ['V'],
                desc: 'View select'
            },
            {
                keys: ['F'],
                desc: 'Exit vehicle'
            },
            {
                keys: ['Shift', '+', 'R'],
                desc: 'Respawn'
            },
            {
                keys: ['Shift', '+', 'C'],
                desc: 'Free camera'
            },
        ]);
    }
}