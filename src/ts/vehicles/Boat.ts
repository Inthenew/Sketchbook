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

  private _speed: number = 0;
  get speed(): number {
    return this._speed;
  }

  // --- Configurable properties (defaults are chosen so that it "just works") ---
  public forwardSpeed: number = 30; // Maximum forward speed
  public reverseSpeed: number = 5; // Maximum reverse speed
  public accelerationIncrement: number = 0.5; // Speed increment per physics step
  public turnSpeed: number = 100; // Amount of torque applied for turning
  public buoyancyCoefficient: number = 500; // Buoyancy factor (for heavier/lighter boats)
  public alignmentStrength: number = .1; // How strongly the boat realigns to the water normal
  public shiftTime: number = 0.2; // Transmission shift delay

  private steeringWheel: THREE.Object3D;
  private steeringSimulator: SpringSimulator;
  private gear: number = 1;
  private shiftTimer: number = 0;
  private characterWantsToExit: boolean = false;
  public submersion: number = 0;
public amount = 12;
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
    // (Optional) Override forward speed here if desired.
    this.forwardSpeed = 10;

    // Set up a pre–step callback for physics (which also applies water forces)
    this.collision.preStep = (body: CANNON.Body) => { this.physicsPreStep(body); };

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

  public updateWheelProps(property: any, value: any) {
    super.updateWheelProps(property, value);
  }

  public updateCarSpeed(speed: number): void {
    this.forwardSpeed = speed;
  }

  public noDirectionPressed(): boolean {
    return (
      !this.actions.throttle.isPressed &&
      !this.actions.reverse.isPressed &&
      !this.actions.left.isPressed &&
      !this.actions.right.isPressed
    );
  }

  public update(timeStep: number): void {
    super.update(timeStep, true);
    this.wheels.forEach(wheel => {
      // Hide the wheel objects (they exist only for collision/contact)
      wheel.wheelObject.visible = false;
    });

    // --- Engine & Transmission ---
    const engineForce = (this.forwardSpeed / 10) * 500;
    const maxGears = 5;
    const gearsMaxSpeeds = {
      'R': (this.forwardSpeed / 10) * -4,
      '0': 0,
      '1': (this.forwardSpeed / 10) * 5,
      '2': (this.forwardSpeed / 10) * 9,
      '3': (this.forwardSpeed / 10) * 13,
      '4': (this.forwardSpeed / 10) * 17,
      '5': (this.forwardSpeed / 10) * 22,
    };

    if (this.shiftTimer > 0) {
      this.shiftTimer -= timeStep;
      if (this.shiftTimer < 0) this.shiftTimer = 0;
    } else {
      if (this.actions.reverse.isPressed) {
        const powerFactor = (gearsMaxSpeeds['R'] - this.speed) / Math.abs(gearsMaxSpeeds['R']);
        const force = (engineForce / this.gear) * Math.pow(Math.abs(powerFactor), 1);
        // Uncomment if you wish to apply reverse engine force:
        // this.applyEngineForce(force, true);
      } else {
        const powerFactor = (gearsMaxSpeeds[this.gear] - this.speed) /
          (gearsMaxSpeeds[this.gear] - gearsMaxSpeeds[this.gear - 1]);

        if (powerFactor < 0.1 && this.gear < maxGears) this.shiftUp();
        else if (this.gear > 1 && powerFactor > 1.2) this.shiftDown();
        else if (this.actions.throttle.isPressed) {
          const force = (engineForce / this.gear) * Math.pow(powerFactor, 1);
          // Uncomment if you wish to apply forward engine force:
          // this.applyEngineForce(-force, true);
        }
      }
    }

    // --- Steering ---
    this.steeringSimulator.simulate(timeStep);
    this.setSteeringValue(this.steeringSimulator.position, true);
    if (this.steeringWheel) {
      this.steeringWheel.rotation.z = -this.steeringSimulator.position * 2;
    }

    // --- Exit vehicle ---
    if (
      this.characterWantsToExit &&
      this.controllingCharacter &&
      this.controllingCharacter.charState.canLeaveVehicles
    ) {
      this.forceCharacterOut(true);
    }
  }

  public shiftUp(): void {
    this.gear++;
    this.shiftTimer = this.shiftTime;
    this.applyEngineForce(0, true);
  }

  public shiftDown(): void {
    this.gear--;
    this.shiftTimer = this.shiftTime;
    this.applyEngineForce(0, true);
  }

  private goForward(maxSpeed: number, body: CANNON.Body, forward: boolean): void {
    if (this.rayCastVehicle.numWheelsOnGround >= 1) {
      // If on land, skip water physics.
      return;
    }
    // Compute the forward vector in world space.
    const localForward = new CANNON.Vec3(0, 0, forward ? 1 : -1);
    const worldForward = body.quaternion.vmult(localForward);

    let currentSpeed = body.velocity.dot(worldForward);
    if (currentSpeed < maxSpeed) {
      // Increase speed using the preset acceleration increment.
      currentSpeed += this.accelerationIncrement;
    }
    worldForward.scale(currentSpeed, worldForward);
    body.velocity.x = worldForward.x;
    body.velocity.z = worldForward.z;
  }

  public physicsPreStep(body: CANNON.Body): void {
	// Increase angular damping to help damp any unwanted rotations.
	body.angularDamping = 0.9;
	const dt = 1 / 60; // fixed timestep
  
	// --- Forward/Reverse thrust ---
	if (this.actions.throttle.isPressed && !this.actions.reverse.isPressed) {
	  this.goForward(this.forwardSpeed, body, true);
	} else if (this.actions.reverse.isPressed && !this.actions.throttle.isPressed) {
	  this.goForward(this.reverseSpeed, body, false);
	}
	this.seats.forEach(seat => {
		seat.door.doorObject.visible = false;
		seat.door?.preStepCallback();
	  });
	// --- Steering Input ---
	// (The drift correction code below sets the target for the steering spring.
	// You can keep this if you want to smooth out the steering input.)
	const velocity = new CANNON.Vec3().copy(this.collision.velocity);
	velocity.normalize();
	let driftCorrection = Utils.getSignedAngleBetweenVectors(
	  Utils.threeVector(velocity),
	  new THREE.Vector3(0, 0, 1).applyQuaternion(Utils.threeQuat(body.quaternion))
	);
	const maxSteerVal = 0.8;
	const speedFactor = THREE.MathUtils.clamp(this.speed * 0.3, 1, Number.MAX_VALUE);
	if (this.actions.right.isPressed) {
	  const steering = Math.min(-maxSteerVal / speedFactor, -driftCorrection);
	  this.steeringSimulator.target = THREE.MathUtils.clamp(steering, -maxSteerVal, maxSteerVal);
	} else if (this.actions.left.isPressed) {
	  const steering = Math.max(maxSteerVal / speedFactor, -driftCorrection);
	  this.steeringSimulator.target = THREE.MathUtils.clamp(steering, -maxSteerVal, maxSteerVal);
	} else {
	  this.steeringSimulator.target = 0;
	}
  
	// --- Update Boat Orientation: Yaw Only ---
	// Get the current orientation as a THREE.Quaternion and convert it to Euler angles.
	let currentQuat = Utils.threeQuat(body.quaternion);
	let euler = new THREE.Euler().setFromQuaternion(currentQuat, 'YXZ');
  
	// Calculate the turn angle based on the steering simulator’s current position.
	// (turnSpeed is in degrees per second; convert to radians)
	const turnAngle = this.steeringSimulator.position * this.turnSpeed * dt * (Math.PI / 180);
	euler.y += turnAngle;
  
	// Force pitch (x) and roll (z) to zero so that the boat stays perfectly level.
	euler.x = 0;
	euler.z = 0;
  
	// Build a new quaternion from the yaw-only Euler angle and update the body.
	const newQuat = new THREE.Quaternion().setFromEuler(euler);
	body.quaternion.set(newQuat.x, newQuat.y, newQuat.z, newQuat.w);
  
	// Prevent physics from adding any unintended pitch/roll by zeroing angular velocity on X & Z.
	body.angularVelocity.x = 0;
	body.angularVelocity.z = 0;
  
	// --- WATER INTERACTION: Adjust Only Vertical Position (Optional) ---
	// If you still want the boat to follow the water height without tilting,
	// update only the boat’s y–position.
	if (this.world && this.world.ocean && typeof this.world.ocean.getWaveHeightAt === 'function') {
	  const time = this.world.ocean.clock.getElapsedTime();
	  const boatPos = this.collision.position;
	  const waveHeightCenter = this.world.ocean.getWaveHeightAt(
		boatPos.x,
		boatPos.z,
		time,
		this.controllingCharacter === this.world.characterInControl
	  );
	  const lerpFactor = 0.6; // Adjust to control how quickly the boat’s y converges to the wave height.
	  if (waveHeightCenter !== 'don don don don') {
		// @ts-ignore
		boatPos.y += (waveHeightCenter - boatPos.y) * lerpFactor;
		body.velocity.y = Math.max(body.velocity.y, 0);
	  }
	}
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
      { keys: ['W', 'S'], desc: 'Accelerate / Reverse' },
      { keys: ['A', 'D'], desc: 'Steering' },
      { keys: ['V'], desc: 'View select' },
      { keys: ['F'], desc: 'Exit vehicle' },
      { keys: ['Shift', '+', 'R'], desc: 'Respawn' },
      { keys: ['Shift', '+', 'C'], desc: 'Free camera' },
    ]);
  }

  public readCarData(gltf: any): void {
    gltf.scene.traverse((child: THREE.Object3D) => {
      if (child.userData && child.userData.data === 'steering_wheel') {
        child.visible = false; // Hide the steering wheel for a boat.
        this.steeringWheel = child;
      }
    });
  }
}
