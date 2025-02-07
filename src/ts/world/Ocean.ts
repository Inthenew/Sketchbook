import * as THREE from 'three';

import { World } from './World';
import { WaterShader } from '../../lib/shaders/WaterShader';
import { IUpdatable } from '../interfaces/IUpdatable';

export class Ocean implements IUpdatable
{
	public updateOrder: number = 10;
	public material: any;

	private world: World;
    private vec3: any;
	constructor(object: any, world: World)
	{
		this.world = world;
        this.vec3 = new THREE.Vector3();

		//this.material = new THREE.ShaderMaterial({
		//	uniforms: uniforms,
		//	fragmentShader: WaterShader.fragmentShader,
		//	vertexShader: WaterShader.vertexShader,
		//});
		this.material = new THREE.MeshBasicMaterial({color: 'skyblue', transparent: true, opacity: .5});
		object.material = this.material;
	}

	public update(timeStep: number): void
	{
		//this.material.uniforms.cameraPos.value.copy(this.world.camera.position);
		//this.material.uniforms.lightDir.value.copy(this.vec3.copy(this.world.sky.sunPosition).normalize());
		//this.material.uniforms.iGlobalTime.value += timeStep;
	}
}