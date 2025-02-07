import * as THREE from 'three';
import * as CANNON from 'cannon';
import * as Utils from './FunctionLibrary';
import { World } from '../world/World';
import { IInputReceiver } from '../interfaces/IInputReceiver';
import { KeyBinding } from './KeyBinding';
import { Character } from '../characters/Character';
import _ = require('lodash');
import { IUpdatable } from '../interfaces/IUpdatable';

export class CameraOperator implements IInputReceiver, IUpdatable {
	public updateOrder: number = 4;

	public world: World;
	public camera: THREE.Camera;
	public target: THREE.Vector3;
	public sensitivity: THREE.Vector2;
	public radius: number = 1;
	public theta: number;
	public phi: number;
	public onMouseDownPosition: THREE.Vector2;
	public onMouseDownTheta: any;
	public onMouseDownPhi: any;
	public targetRadius: number = 1;

	public movementSpeed: number;
	public actions: { [action: string]: KeyBinding };

	public upVelocity: number = 0;
	public forwardVelocity: number = 0;
	public rightVelocity: number = 0;

	public followMode: boolean = false;

	public characterCaller: Character;

	private lastMouseMoveTime: number = performance.now();
	private autoRotateDelay: number = 400;
	private autoRotateLerpFactor: number = 0.1;

	constructor(world: World, camera: THREE.Camera, sensitivityX: number = 1, sensitivityY: number = sensitivityX * 0.8) {
		this.world = world;
		this.camera = camera;
		this.target = new THREE.Vector3();
		this.sensitivity = new THREE.Vector2(sensitivityX, sensitivityY);

		this.movementSpeed = 0.06;
		this.radius = 3;
		this.theta = 0;
		this.phi = 0;

		this.onMouseDownPosition = new THREE.Vector2();
		this.onMouseDownTheta = this.theta;
		this.onMouseDownPhi = this.phi;

		this.actions = {
			'forward': new KeyBinding('KeyW'),
			'back': new KeyBinding('KeyS'),
			'left': new KeyBinding('KeyA'),
			'right': new KeyBinding('KeyD'),
			'up': new KeyBinding('KeyE'),
			'down': new KeyBinding('KeyQ'),
			'fast': new KeyBinding('ShiftLeft'),
		};

		world.registerUpdatable(this);
	}

	public setSensitivity(sensitivityX: number, sensitivityY: number = sensitivityX): void {
		this.sensitivity = new THREE.Vector2(sensitivityX, sensitivityY);
	}

	public setRadius(value: number, instantly: boolean = false): void {
		this.targetRadius = Math.max(0.001, value);
		if (instantly === true) {
			this.radius = value;
		}
	}

	public move(deltaX: number, deltaY: number): void {
		this.theta -= deltaX * (this.sensitivity.x / 2);
		this.theta %= 360;
		this.phi += deltaY * (this.sensitivity.y / 2);
		this.phi = Math.min(85, Math.max(-85, this.phi));
		this.lastMouseMoveTime = performance.now();
	}
	public quaternionToEuler(quaternion) {
        const { w, x, y, z } = quaternion;

        // Yaw (theta) - rotation around the Y-axis
        const theta = Math.atan2(2 * (w * y + x * z), 1 - 2 * (y * y + x * x));

        // Pitch (phi) - rotation around the X-axis
        const sin_phi = 2 * (w * x - y * z);
        let phi;
        if (Math.abs(sin_phi) >= 1) {
            // Clamp, if sin_phi goes beyond the range
            phi = Math.sign(sin_phi) * (Math.PI / 2);  // 90 degrees in radians
        } else {
            phi = Math.asin(sin_phi);
        }

        // Convert radians to degrees
        const thetaInDegrees = theta * (180 / Math.PI);
        const phiInDegrees = phi * (180 / Math.PI);

        return {
            theta: thetaInDegrees,
            phi: -phiInDegrees
        };
    }

	public update(timeScale: number): void {
		this.radius = THREE.MathUtils.lerp(this.radius, this.targetRadius, 0.1);
		this.camera.position.x = this.target.x + this.radius * Math.sin(this.theta * Math.PI / 180) * Math.cos(this.phi * Math.PI / 180);
		this.camera.position.y = this.target.y + this.radius * Math.sin(this.phi * Math.PI / 180);
		this.camera.position.z = this.target.z + this.radius * Math.cos(this.theta * Math.PI / 180) * Math.cos(this.phi * Math.PI / 180);
		this.camera.updateMatrix();
		const currentTime = performance.now();
		const timeSinceLastMouseMove = currentTime - this.lastMouseMoveTime;
		let vehicle = globalThis.currentTing;
		if (vehicle && vehicle.firstPerson && !vehicle.isRocket) {
			let lookDirection = new THREE.Vector3(0, 0, -1);
			lookDirection.applyQuaternion(vehicle.quaternion);
			let targetPosition = this.target.clone().add(lookDirection);
	
			if (timeSinceLastMouseMove > this.autoRotateDelay) {
				const dummy = new THREE.Object3D();
				dummy.position.copy(this.camera.position);
				dummy.lookAt(targetPosition);
				const targetQuat = dummy.quaternion;
				let factor = this.autoRotateLerpFactor;
				if (this.camera.quaternion.angleTo(targetQuat) < 0.05) factor = 0.025;
				this.camera.quaternion.slerp(targetQuat, factor);
				this.camera.up.set(0, 1, 0);
			} else {
				this.camera.up.set(0, 1, 0);
				this.camera.lookAt(this.target);
			}
			const angles = this.quaternionToEuler(this.camera.quaternion);
			this.theta = angles.theta;
			this.phi = angles.phi;
		} else {
			this.camera.lookAt(this.target);
		}
	}
	
	public handleKeyboardEvent(event: KeyboardEvent, code: string, pressed: boolean): void {
		// Free camera mode – exit vehicle control.
		if (code === 'KeyC' && pressed === true && event.shiftKey === true) {
			if (this.characterCaller !== undefined) {
				this.world.inputManager.setInputReceiver(this.characterCaller);
				this.characterCaller = undefined;
			}
		}
		// Teleport the character/vehicle to the camera position.
		else if (code === 'KeyT' && pressed === true) {
			if (this.characterCaller !== undefined) {
				if (this.characterCaller.controlledObject) {
					const body = this.characterCaller.controlledObject.collision;
					const newPos = new CANNON.Vec3(this.target.x, this.target.y, this.target.z);
					body.position.copy(newPos);
					body.interpolatedPosition.copy(newPos);
					body.velocity.setZero();
					body.angularVelocity.setZero();
				} else {
					this.characterCaller.characterCapsule.body.position.set(this.target.x, this.target.y, this.target.z);
					this.characterCaller.characterCapsule.body.velocity.set(0, 0, 0);
				}
			}
		} else {
			for (const action in this.actions) {
				if (this.actions.hasOwnProperty(action)) {
					const binding = this.actions[action];
					if (_.includes(binding.eventCodes, code)) {
						binding.isPressed = pressed;
					}
				}
			}
		}
	}

	public handleMouseWheel(event: WheelEvent, value: number): void {
		this.world.scrollTheTimeScale(value);
	}

	public handleMouseButton(event: MouseEvent, code: string, pressed: boolean): void {
		for (const action in this.actions) {
			if (this.actions.hasOwnProperty(action)) {
				const binding = this.actions[action];
				if (_.includes(binding.eventCodes, code)) {
					binding.isPressed = pressed;
				}
			}
		}
	}

	public handleMouseMove(event: MouseEvent, deltaX: number, deltaY: number): void {
		this.move(deltaX, deltaY);
	}

	public inputReceiverInit(): void {
		this.target.copy(this.camera.position);
		this.setRadius(0, true);
		this.world.updateControls([
			{
				keys: ['W', 'S', 'A', 'D'],
				desc: 'Move around'
			},
			{
				keys: ['E', 'Q'],
				desc: 'Move up / down'
			},
			{
				keys: ['Shift'],
				desc: 'Speed up'
			},
			{
				keys: ['Shift', '+', 'C'],
				desc: 'Exit free camera mode'
			},
			{
				keys: ['T'],
				desc: 'Tp to camera'
			},
		]);
	}

	public inputReceiverUpdate(timeStep: number): void {
		let speed = this.movementSpeed * (this.actions.fast.isPressed ? timeStep * 600 : timeStep * 60) * this.world.Free_Cam_Speed;
		globalThis.currentTing = null;
		const up = Utils.getUp(this.camera);
		const right = Utils.getRight(this.camera);
		const forward = Utils.getBack(this.camera);

		this.upVelocity = THREE.MathUtils.lerp(this.upVelocity, +this.actions.up.isPressed - +this.actions.down.isPressed, 0.3);
		this.forwardVelocity = THREE.MathUtils.lerp(this.forwardVelocity, +this.actions.forward.isPressed - +this.actions.back.isPressed, 0.3);
		this.rightVelocity = THREE.MathUtils.lerp(this.rightVelocity, +this.actions.right.isPressed - +this.actions.left.isPressed, 0.3);

		this.target.add(up.multiplyScalar(speed * this.upVelocity));
		this.target.add(forward.multiplyScalar(speed * this.forwardVelocity));
		this.target.add(right.multiplyScalar(speed * this.rightVelocity));
	}
}
