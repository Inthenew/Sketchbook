import { SkyShader } from '../../lib/shaders/SkyShader';
import * as THREE from 'three';
import { World } from './World';
import { EntityType } from '../enums/EntityType';
import { IUpdatable } from '../interfaces/IUpdatable';
import { default as CSM } from 'three-csm';

export class Sky extends THREE.Object3D implements IUpdatable
{
	public updateOrder: number = 5;

	public sunPosition: THREE.Vector3 = new THREE.Vector3();
	public csm: CSM;

	set theta(value: number) {
		this._theta = value;
		this.refreshSunPosition();
	}

	set phi(value: number) {
		this._phi = value;
		this.refreshSunPosition();
		this.refreshHemiIntensity();
	}

	public _phi: number = 50;
	public _theta: number = 145;

	private hemiLight: THREE.HemisphereLight;
	private maxHemiIntensity: number = 0.9;
	private minHemiIntensity: number = 0.3;

	private skyMesh: THREE.Mesh;
	private skyMaterial: THREE.ShaderMaterial;

	private world: World;

	constructor(world: World)
	{
		super();

		this.world = world;
		
		// Sky material
		this.skyMaterial = new THREE.ShaderMaterial({
			uniforms: THREE.UniformsUtils.clone(SkyShader.uniforms),
			fragmentShader: SkyShader.fragmentShader,
			vertexShader: SkyShader.vertexShader,
			side: THREE.BackSide
		});

		// Mesh
		this.skyMesh = new THREE.Mesh(
			new THREE.SphereBufferGeometry(5000, 24, 12),
			this.skyMaterial
		);
        world.graphicsWorld.add(this.skyMesh);
        let skymesh2 = new THREE.Mesh(
			new THREE.SphereBufferGeometry(5010, 24, 12),
			new THREE.MeshBasicMaterial({ side: THREE.FrontSide, map: new THREE.TextureLoader().load('https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/570c9426-37ef-4869-b888-7da245b8a19f/del9sm5-8028b7e2-25ff-436f-889c-cb073876557a.jpg/v1/fill/w_1280,h_640,q_75,strp/earth_texture_map_by_wdawdawdwdaw_del9sm5-fullview.jpg?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7ImhlaWdodCI6Ijw9NjQwIiwicGF0aCI6IlwvZlwvNTcwYzk0MjYtMzdlZi00ODY5LWI4ODgtN2RhMjQ1YjhhMTlmXC9kZWw5c201LTgwMjhiN2UyLTI1ZmYtNDM2Zi04ODljLWNiMDczODc2NTU3YS5qcGciLCJ3aWR0aCI6Ijw9MTI4MCJ9XV0sImF1ZCI6WyJ1cm46c2VydmljZTppbWFnZS5vcGVyYXRpb25zIl19.mopKGVfWzfNfkf3m1GqexwCAAHsJX4-Rp9cdpmcAahk') })
		);
        world.graphicsWorld.add(skymesh2);
        let skymesh3 = new THREE.Mesh(
			new THREE.SphereBufferGeometry(1252.5, 24, 12),
			new THREE.MeshBasicMaterial({ side: THREE.FrontSide, map: new THREE.TextureLoader().load('https://i.imgur.com/KnkC177.jpg') })
		);
        skymesh3.position.set(15.2758, 3852.67, -11696.4);
        world.graphicsWorld.add(skymesh3);
		//this.attach(this.skyMesh);

		// Ambient light
		this.hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 1.0 );
		this.refreshHemiIntensity();
		this.hemiLight.color.setHSL( 0.59, 0.4, 0.6 );
		this.hemiLight.groundColor.setHSL( 0.095, 0.2, 0.75 );
		this.hemiLight.position.set( 0, 50, 0 );
		this.world.graphicsWorld.add( this.hemiLight );

		// CSM
		// New version
		// let splitsCallback = (amount, near, far, target) =>
		// {
		// 	for (let i = amount - 1; i >= 0; i--)
		// 	{
		// 		target.push(Math.pow(1 / 3, i));
		// 	}
		// };

		// Legacy
		let splitsCallback = (amount, near, far) =>
		{
			let arr = [];

			for (let i = amount - 1; i >= 0; i--)
			{
				arr.push(Math.pow(1 / 4, i));
			}

			return arr;
		};

		this.csm = new CSM({
			fov: 80,
			far: 250,	// maxFar
			lightIntensity: 2.5,
			cascades: 3,
			shadowMapSize: 2048,
			camera: world.camera,
			parent: world.graphicsWorld,
			mode: 'custom',
			customSplitsCallback: splitsCallback
		});
		this.csm.fade = true;

		this.refreshSunPosition();
		
		world.graphicsWorld.add(this);
		world.registerUpdatable(this);
	}

	public update(timeScale: number): void
	{
		this.position.copy(this.world.camera.position);
		this.refreshSunPosition();

		this.csm.update(this.world.camera.matrix);
		this.csm.lightDirection = new THREE.Vector3(-this.sunPosition.x, -this.sunPosition.y, -this.sunPosition.z).normalize();
	}

	public refreshSunPosition(): void
	{
		const sunDistance = 10;

		this.sunPosition.x = sunDistance * Math.sin(this._theta * Math.PI / 180) * Math.cos(this._phi * Math.PI / 180);
		this.sunPosition.y = sunDistance * Math.sin(this._phi * Math.PI / 180);
		this.sunPosition.z = sunDistance * Math.cos(this._theta * Math.PI / 180) * Math.cos(this._phi * Math.PI / 180);

		this.skyMaterial.uniforms.sunPosition.value.copy(this.sunPosition);
		this.skyMaterial.uniforms.cameraPos.value.copy(this.world.camera.position);
	}

	public refreshHemiIntensity(): void
	{
		this.hemiLight.intensity = this.minHemiIntensity + Math.pow(1 - (Math.abs(this._phi - 90) / 90), 0.25) * (this.maxHemiIntensity - this.minHemiIntensity);
	}
}