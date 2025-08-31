import * as THREE from "three";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";

/* = Variables ================================================*/
// Common
let GrdSiz = 804.67;				// Size of Grid in meters
	GrdSiz = 200;
let GrdRCs = 2;
let WtrCol = 0x1040f0;				// Water (Tropical)
	WtrCol = 0x081080;				// Water (Navy)
// Animated
let segNum = 15;					// Segments per Grid (fewer = sharper waves)
let GrdPtr = [0];
let WavMZV = [0];
let WavMXV = [0];
let geoWav, matWav;
let gu = {							// Uniform
		time: {value: 0},
		grid: {value: GrdSiz},
	};
// Textures
let NrmSrc = ["https://threejs.org/examples/textures/waternormals.jpg"];
let WtrNrm = 0;						// Pointer to Water Normal Map
let WtrRep = 1; 					// Wrap Reps
let LodFlg = 0;						// Load Flag

/* = Basic Values =============================================*/
// Display
let	scene = new THREE.Scene();
	scene.background = new THREE.Color(0x1732c1);
// Clock
let clock = new THREE.Clock();
let	etime;
// Loading Manager
	// Create a loading manager to set RESOURCES_LOADED when appropriate.
	// Pass loadingManager to all resource loaders.
let loadingManager = new THREE.LoadingManager();
let RESOURCES_LOADED = false;
	loadingManager.onLoad = function(){
		console.log("loaded all resources");
		RESOURCES_LOADED = true;
		initAll();
	};
let txtrLoader = new THREE.TextureLoader(loadingManager);

/* = Main Program =============================================*/
	loadAll();
	rendAll();

/* 0 Load All =================================================*/
function loadAll() {	
	// Normal Map
	txtrLoader.load(NrmSrc, function(texture) {
		texture.format = THREE.RGBAFormat;
		texture.magFilter = THREE.LinearFilter;
		texture.minFilter = THREE.LinearMipMapLinearFilter;
		texture.generateMipmaps = true;
		texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
		texture.offset.set(0,0);
		texture.repeat.set(WtrRep,WtrRep);
		texture.needsUpdate = true
		WtrNrm = texture;
	});
}

/* 1 Initialize ===============================================*/
function initAll() {
	let n, zx;
/* = Main Program =============================================*/
	// Planes with Extended Material ----------------------------
	geoWav = new THREE.PlaneGeometry(GrdSiz,GrdSiz,segNum,segNum);
	geoWav.rotateX(-Math.PI * 0.5);
	matWav = new THREE.MeshStandardMaterial({
		normalMap: WtrNrm,
		metalness: 0.5,
		roughness: 0.6,
		onBeforeCompile: shader => {
			shader.uniforms.time = gu.time;
			shader.uniforms.grid = gu.grid;
			shader.vertexShader = `
				uniform float time;
				uniform float grid;  
				varying float vHeight;
				vec3 moveWave(vec3 p){
					// Angle = distance offset + degree offset
					vec3 retVal = p;
					float ang;
					float kzx = 360.0/grid;
					// Wave1 (135 degrees)
					ang = 50.0*time + -1.0*p.x*kzx + -2.0*p.z*kzx;
					if (ang>360.0) ang = ang-360.0;
					ang = ang*3.14159265/180.0;
					retVal.y = 3.0*sin(ang);
					// Wave2 (090)
					ang = 25.0*time + -3.0*p.x*kzx;
					if (ang>360.0) ang = ang-360.0;
					ang = ang*3.14159265/180.0;
					retVal.y = retVal.y + 2.0*sin(ang);
					// Wave3 (180 degrees)
					ang = 15.0*time - 3.0*p.z*kzx;
					if (ang>360.0) ang = ang-360.0;
					ang = ang*3.14159265/180.0;
					retVal.y = retVal.y + 2.0*sin(ang);
					// Wave4 (225 degrees)
					ang = 50.0*time + 4.0*p.x*kzx + 8.0*p.z*kzx;
					if (ang>360.0) ang = ang-360.0;
					ang = ang*3.14159265/180.0;
					retVal.y = retVal.y + 0.5*sin(ang);
					// Wave5 (270 degrees)
					ang = 50.0*time + 8.0*p.x*kzx;
					if (ang>360.0) ang = ang-360.0;
					ang = ang*3.14159265/180.0;
					retVal.y = retVal.y + 0.5*sin(ang);
					//
					return retVal;
				}					
				${shader.vertexShader}
			`.replace(
				`#include <beginnormal_vertex>`,
				`#include <beginnormal_vertex>
					vec3 p = position;
       				vec2 move = vec2(1, 0);
					vec3 pos = moveWave(p);
					vec3 pos2 = moveWave(p + move.xyy);
					vec3 pos3 = moveWave(p + move.yyx);
					vNormal = normalize(cross(normalize(pos2-pos), normalize(pos3-pos)));
				`
			).replace(
				`#include <begin_vertex>`,
				`#include <begin_vertex>
					transformed.y = pos.y;
					vHeight = pos.y;
				`
			);
			shader.fragmentShader = `
				varying float vHeight;
				${shader.fragmentShader}
			`.replace(
				`#include <color_fragment>`,
				`#include <color_fragment>
					diffuseColor.rgb = mix(vec3(0.03125,0.0625,0.5), vec3(0.1,0.2,0.6), smoothstep(0.0, 6.0, vHeight));
					if (vHeight>7.0) {
						diffuseColor.rgb = vec3(0.2,0.3,0.7);	// Adds "foam" highlight to highest waves
					}
				`
			);
		}
	});
	// Compute Starting Z and X Values
	zx = -0.5*(GrdRCs)*GrdSiz+0.5*GrdSiz;
	for (let i = 0; i < GrdRCs; i++) {
		WavMZV[i] = zx;
		WavMXV[i] = zx;
		zx = zx + GrdSiz;
	}
	// 4 Adjacent Planes
	n = 0;
	for (let z = 0; z < GrdRCs; z++) {		// Row X2
		for (let x = 0; x < GrdRCs; x++) {	// Column X2
			GrdPtr[n] = new THREE.Mesh(geoWav,matWav);
			scene.add(GrdPtr[n]);
			GrdPtr[n].position.set(WavMXV[x],0,-WavMZV[z]);
			n++;
		}
	}
	//
	LodFlg = 1;
}

/* 2 Render ===================================================*/
function rendAll() {
	requestAnimationFrame(rendAll);
	if (LodFlg > 0) {
		etime = clock.getElapsedTime();
		gu.time.value = etime;
  	WtrNrm.offset.x -= .0005;
		WtrNrm.offset.y += .00025;
	}
}
