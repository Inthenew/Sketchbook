import * as CANNON from 'cannon';

import { Vehicle } from './Vehicle';
import { IControllable } from '../interfaces/IControllable';
import { KeyBinding } from '../core/KeyBinding';
import * as THREE from 'three';
import * as Utils from '../core/FunctionLibrary';
import { SpringSimulator } from '../physics/spring_simulation/SpringSimulator';
import { World } from '../world/World';
import { EntityType } from '../enums/EntityType';

export class Boat extends Vehicle implements IControllable {
	public entityType: EntityType = EntityType.Boat;
	public drive: string = 'awd';
	public isBoat: boolean = true;
	get speed(): number {
		return this._speed;
	}
	private _speed: number = 0;
	public speed2: number = 30;
	public backspeed: number = 5;
	// private wheelsDebug: THREE.Mesh[] = [];
	private steeringWheel: THREE.Object3D;

	private steeringSimulator: SpringSimulator;
	private gear: number = 1;

	// Transmission
	private shiftTimer: number;
	private timeToShift: number = 0.2;

	private characterWantsToExit: boolean = false;
	public su: any;
	constructor(gltf: any) {
		super(gltf, {
			radius: 0.25,
			suspensionStiffness: 20,
			suspensionRestLength: 0.35,
			maxSuspensionTravel: 1,
			frictionSlip: 0.8,
			dampingRelaxation: 2,
			dampingCompression: 2,
			rollInfluence: 0.8
		});
		this.readCarData(gltf);
		this.speed2 = 10;
		this.collision.preStep = (body: CANNON.Body) => { this.physicsPreStep(body, this); };

		this.actions = {
			'throttle': new KeyBinding('KeyW'),
			'reverse': new KeyBinding('KeyS'),
			'brake': new KeyBinding('Space'),
			'left': new KeyBinding('KeyA'),
			'right': new KeyBinding('KeyD'),
			'exitVehicle': new KeyBinding('KeyF'),
			'seat_switch': new KeyBinding('KeyX'),
			'view': new KeyBinding('KeyV'),
		};

		this.steeringSimulator = new SpringSimulator(60, 10, 0.6);
	}
	public updateWheelProps(property, value) {
		super.updateWheelProps(property, value);
	}
	public updateCarSpeed(speed: any): void {
		this.speed2 = speed;
	}
	public noDirectionPressed(): boolean {
		let result =
			!this.actions.throttle.isPressed &&
			!this.actions.reverse.isPressed &&
			!this.actions.left.isPressed &&
			!this.actions.right.isPressed;

		return result;
	}

	public update(timeStep: number): void {
		super.update(timeStep, true);
		this.wheels.map(wheel => {
			// Make the wheel invisable, so nowone can see it, but make the wheel exist so we can detect when the boat touches the ground //
			wheel.wheelObject.visible = false;
		})
		/*
		// Air spin
		if (!tiresHaveContact)
		{
			// Timer grows when car is off ground, resets once you touch the ground again
			this.airSpinTimer += timeStep;
			if (!this.actions.throttle.isPressed) this.canTiltForwards = true;
		}
		else
		{
			this.canTiltForwards = false;
			this.airSpinTimer = 0;
		}
		*/
		// Engine
		const engineForce = (this.speed2 / 10) * 500;
		const maxGears = 5;
		const gearsMaxSpeeds = {
			'R': (this.speed2 / 10) * -4,
			'0': 0,
			'1': (this.speed2 / 10) * 5,
			'2': (this.speed2 / 10) * 9,
			'3': (this.speed2 / 10) * 13,
			'4': (this.speed2 / 10) * 17,
			'5': (this.speed2 / 10) * 22,
		};

		if (this.shiftTimer > 0) {
			this.shiftTimer -= timeStep;
			if (this.shiftTimer < 0) this.shiftTimer = 0;
		}
		else {
			// Transmission 
			if (this.actions.reverse.isPressed) {
				const powerFactor = (gearsMaxSpeeds['R'] - this.speed) / Math.abs(gearsMaxSpeeds['R']);
				const force = (engineForce / this.gear) * (Math.abs(powerFactor) ** 1);

				//this.applyEngineForce(force, true);
			}
			else {
				const powerFactor = (gearsMaxSpeeds[this.gear] - this.speed) / (gearsMaxSpeeds[this.gear] - gearsMaxSpeeds[this.gear - 1]);

				if (powerFactor < 0.1 && this.gear < maxGears) this.shiftUp();
				else if (this.gear > 1 && powerFactor > 1.2) this.shiftDown();
				else if (this.actions.throttle.isPressed) {
					const force = (engineForce / this.gear) * (powerFactor ** 1);
					//this.applyEngineForce(-force, true);
				}
			}
		}
		// Steering
		this.steeringSimulator.simulate(timeStep);
		this.setSteeringValue(this.steeringSimulator.position, true);
		if (this.steeringWheel !== undefined) this.steeringWheel.rotation.z = -this.steeringSimulator.position * 2;
		//if (this.rayCastVehicle.numWheelsOnGround < 3 && Math.abs(this.collision.velocity.length()) < 0.5)	
		//{	
		//	this.collision.quaternion.copy(this.collision.initQuaternion);	
		//}

		// Getting out
		if (this.characterWantsToExit && this.controllingCharacter !== undefined && this.controllingCharacter.charState.canLeaveVehicles) {
			this.forceCharacterOut(true);
		}
	}

	public shiftUp(): void {
		this.gear++;
		this.shiftTimer = this.timeToShift;

		this.applyEngineForce(0, true);
	}

	public shiftDown(): void {
		this.gear--;
		this.shiftTimer = this.timeToShift;

		this.applyEngineForce(0, true);
	}
	private goForward(num: number, body: CANNON.Body, forward: boolean) {
		if (this.rayCastVehicle.numWheelsOnGround >= 1) {
			// There on land! Don't apply water physics.
			return;
		}

		// Define the local forward vector
		const localForward = new CANNON.Vec3(0, 0, forward ? 1 : -1);

		// Transform the local forward vector to world space
		const worldForward = body.quaternion.vmult(localForward);

		if (forward) {
			// Increment the speed gradually to simulate continuous acceleration
			const maxSpeed = num;
			var currentSpeed = body.velocity.dot(worldForward); 
			if (currentSpeed < maxSpeed) {
				currentSpeed += 0.5; // Increment speed, adjust this value as needed
			}
		} else {
			// Increment the speed gradually to simulate continuous acceleration
			const maxSpeed = num;
			var currentSpeed = body.velocity.dot(worldForward); 
			if (currentSpeed < maxSpeed) {
				currentSpeed += 0.5; // Increment speed, adjust this value as needed
			}
		}
		// Apply a simple drag force for water resistance
		/*
		const dragCoefficient = 0.05; // Adjust this value based on your simulation needs
		const dragForce = currentSpeed * dragCoefficient;

		// Scale the world forward vector by the net speed after applying drag
		const netSpeed = currentSpeed - dragForce;
		*/
		const netSpeed = currentSpeed;
		worldForward.scale(netSpeed, worldForward);

		// Set the linear velocity of the body
		body.velocity.x = worldForward.x;
		body.velocity.z = worldForward.z;
	}


	public physicsPreStep(body: CANNON.Body, car: Boat): void {
		this.collision.linearDamping = 0.9;
		this.collision.angularDamping = 0.9;
		// Constants
		const quat = Utils.threeQuat(body.quaternion);
		const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(quat);
		const right = new THREE.Vector3(1, 0, 0).applyQuaternion(quat);
		const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quat);

		// Measure speed
		this._speed = this.collision.velocity.dot(Utils.cannonVector(forward));
		let turnSpeed = 100;
		// Left
		if (this.actions.left.isPressed && !this.actions.right.isPressed) {
			// Rotate the boat *Slightly* left //
			// Define the torque magnitude and direction
			const torqueMagnitude = turnSpeed;
			const torqueDirection = new CANNON.Vec3(0, 1, 0); // Rotate left around the y-axis

			// Scale the torqueDirection by the desired torqueMagnitude
			const torque = torqueDirection.scale(torqueMagnitude);

			// Apply the torque to the body
			body.torque.x += torque.x;
			body.torque.y += torque.y;
			body.torque.z += torque.z;
		} else
			// Right
			if (this.actions.right.isPressed && !this.actions.left.isPressed) {
				// Rotate the boat *Slightly* right //
				// Define the torque magnitude and direction
				const torqueMagnitude = turnSpeed;
				const torqueDirection = new CANNON.Vec3(0, -1, 0); // Rotate right around the y-axis

				// Scale the torqueDirection by the desired torqueMagnitude
				const torque = torqueDirection.scale(torqueMagnitude);

				// Apply the torque to the body
				body.torque.x += torque.x;
				body.torque.y += torque.y;
				body.torque.z += torque.z;
			}

		// Forwards
		if (this.actions.throttle.isPressed && !this.actions.reverse.isPressed) {
			this.goForward(this.speed2, body, true);
		} else
			// Backwards
			if (this.actions.reverse.isPressed && !this.actions.throttle.isPressed) {
				this.goForward(this.backspeed, body, false);
			}

		// Steering
		const velocity = new CANNON.Vec3().copy(this.collision.velocity);
		velocity.normalize();
		let driftCorrection = Utils.getSignedAngleBetweenVectors(Utils.threeVector(velocity), forward);

		const maxSteerVal = 0.8;
		let speedFactor = THREE.MathUtils.clamp(this.speed * 0.3, 1, Number.MAX_VALUE);

		if (this.actions.right.isPressed) {
			let steering = Math.min(-maxSteerVal / speedFactor, -driftCorrection);
			this.steeringSimulator.target = THREE.MathUtils.clamp(steering, -maxSteerVal, maxSteerVal);
		}
		else if (this.actions.left.isPressed) {
			let steering = Math.max(maxSteerVal / speedFactor, -driftCorrection);
			this.steeringSimulator.target = THREE.MathUtils.clamp(steering, -maxSteerVal, maxSteerVal);
		}
		else this.steeringSimulator.target = 0;

		// Update doors
		this.seats.forEach((seat) => {
			seat.door.doorObject.visible = false; // Why? Because jetski's don't have doors //
			seat.door?.preStepCallback();
		});
	}

	public onInputChange(): void {
		super.onInputChange();

		const brakeForce = 1000000;

		if (this.actions.exitVehicle.justPressed) {
			this.characterWantsToExit = true;
		}
		if (this.actions.exitVehicle.justReleased) {
			this.characterWantsToExit = false;
			this.triggerAction('brake', false);
		}
		if (this.actions.throttle.justReleased || this.actions.reverse.justReleased) {
			this.applyEngineForce(0, true);
		}
		if (this.actions.brake.justPressed) {
			this.setBrake(brakeForce, 'awd');
		}
		if (this.actions.brake.justReleased) {
			this.setBrake(0, 'awd');
		}
		if (this.actions.view.justPressed) {
			this.toggleFirstPersonView();
		}
	}

	public inputReceiverInit(): void {
		super.inputReceiverInit();

		this.world.updateControls([
			{
				keys: ['W', 'S'],
				desc: 'Accelerate / Reverse'
			},
			{
				keys: ['A', 'D'],
				desc: 'Steering'
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
	public readCarData(gltf: any): void {
		gltf.scene.traverse((child: THREE.Object3D) => {
			if (child.hasOwnProperty('userData')) {
				if (child.userData.hasOwnProperty('data')) {
					if (child.userData.data === 'steering_wheel') {
						child.visible = false; // Jet ski's don't have steering wheels //
						this.steeringWheel = child;
					}
				}
			}
		});
	}
}