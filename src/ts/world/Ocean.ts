import * as THREE from 'three';
import { World } from './World';
import { IUpdatable } from '../interfaces/IUpdatable';

export class Ocean implements IUpdatable {
  public updateOrder: number = 10;
  public material: any;

  private world: World;
  private vec3: any;
  public clock: any;
  private WtrNrm: any = 0; // Pointer to Water Normal Map
  private WtrRep = 1; // Wrap Reps
  private LodFlg = 0; // Load Flag
  private GrdSiz = 1000;
  private segNum = 200;
  private GrdRCs = 2;
  private NrmSrc = ["https://threejs.org/examples/textures/waternormals.jpg"];
  private GrdPtr: any = [];
  private WavMZV: any = [];
  private WavMXV: any = [];
  geoWav: THREE.PlaneGeometry;
  matWav: THREE.MeshStandardMaterial;
  private gu = {
    // Uniforms for the shader
    time: { value: 0 },
    grid: { value: 1000 },
  };
  etime: any;

  constructor(object: any, world: World) {
    this.world = world;
    this.vec3 = new THREE.Vector3();
    this.material = new THREE.MeshBasicMaterial({
      color: 'skyblue',
      transparent: true,
      opacity: 0,
    });
    object.material = this.material;
    this.clock = new THREE.Clock();

    // Create the ocean (the provided size/position parameters can be adjusted)
    this.createOcean(4950, new THREE.Vector3(0, 5, 0));
  }

  createOcean(size: number, position: THREE.Vector3) {
    const loadingManager = new THREE.LoadingManager();
    let RESOURCES_LOADED = false;
    const scope = this;

    loadingManager.onLoad = function () {
      console.log("loaded all resources");
      RESOURCES_LOADED = true;
      initAll();
    };

    const txtrLoader = new THREE.TextureLoader(loadingManager);
    txtrLoader.load(scope.NrmSrc[0], function (texture) {
      texture.format = THREE.RGBAFormat;
      texture.magFilter = THREE.LinearFilter;
      texture.minFilter = THREE.LinearMipMapLinearFilter;
      texture.generateMipmaps = true;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.offset.set(0, 0);
      texture.repeat.set(scope.WtrRep, scope.WtrRep);
      texture.needsUpdate = true;
      scope.WtrNrm = texture;
    });

    function initAll() {
      let n, zx;
      // Create the plane geometry.
      scope.geoWav = new THREE.PlaneGeometry(scope.GrdSiz, scope.GrdSiz, scope.segNum, scope.segNum);
      scope.geoWav.rotateX(-Math.PI * 0.5);
      
      // Create a material with a custom shader to modify wave behavior.
      scope.matWav = new THREE.MeshStandardMaterial({
        normalMap: scope.WtrNrm,
        metalness: 0.5,
        roughness: 0.6,
        name: 'ocean.001',
        // @ts-ignore
        onBeforeCompile: shader => {
          // Pass in our custom uniforms.
          shader.uniforms.time = scope.gu.time;
          shader.uniforms.grid = scope.gu.grid;
          shader.uniforms.noWaveCenter = { value: new THREE.Vector2(0.0, 0.0) };
          shader.uniforms.noWaveHalfSize = { value: new THREE.Vector2(180.0, 140.0) };
          shader.uniforms.noWaveHalfSize2 = { value: new THREE.Vector2(300.0, 330.0) };
          shader.uniforms.vInvisible = { value: 0.0 };

          // Inject custom uniforms, varying declarations, and our wave function into the vertex shader.
          shader.vertexShader = shader.vertexShader.replace(
            'void main() {',
            `
            uniform float time;
            uniform float grid;
            uniform vec2 noWaveCenter;
            uniform vec2 noWaveHalfSize;
            uniform vec2 noWaveHalfSize2;
            varying float vHeight;
            varying float vInvisible;
            
            vec3 moveWave(vec3 p) {
              float num = 0.7;
              vec4 worldPos = modelMatrix * vec4(p, 1.0);
              vec3 retVal = p;
              float ang;
              float kzx = 360.0 / grid;
              
              // Wave1 (135°)
              ang = 50.0 * time + -1.0 * p.x * kzx + -2.0 * p.z * kzx;
              if (ang > 360.0) ang -= 360.0;
              ang = ang * 3.14159265 / 180.0;
              retVal.y = num * 3.0 * sin(ang);
              
              // Wave2 (90°)
              ang = 25.0 * time + -3.0 * p.x * kzx;
              if (ang > 360.0) ang -= 360.0;
              ang = ang * 3.14159265 / 180.0;
              retVal.y += num * 2.0 * sin(ang);
              
              // Wave3 (180°)
              ang = 15.0 * time - 3.0 * p.z * kzx;
              if (ang > 360.0) ang -= 360.0;
              ang = ang * 3.14159265 / 180.0;
              retVal.y += num * 2.0 * sin(ang);
              
              // Wave4 (225°)
              ang = 50.0 * time + 4.0 * p.x * kzx + 8.0 * p.z * kzx;
              if (ang > 360.0) ang -= 360.0;
              ang = ang * 3.14159265 / 180.0;
              retVal.y += num * 0.5 * sin(ang);
              
              // Wave5 (270°)
              ang = 50.0 * time + 8.0 * p.x * kzx;
              if (ang > 360.0) ang -= 360.0;
              ang = ang * 3.14159265 / 180.0;
              retVal.y += num * 0.5 * sin(ang);
            
              // Check if in the inner “no–wave” zone.
              float inZone = 0.0;
              if (abs(worldPos.x - noWaveCenter.x) < noWaveHalfSize.x &&
                  abs(worldPos.z - noWaveCenter.y) < noWaveHalfSize.y) {
                inZone = 1.0;
                retVal.y = -100.0;
              } else if (abs(worldPos.x - noWaveCenter.x) < noWaveHalfSize2.x &&
                         abs(worldPos.z - noWaveCenter.y) < noWaveHalfSize2.y) {
                retVal.y = 8.5;
              } else {
                retVal.y += 3.6;
              }
              vInvisible = inZone;
              return retVal;
            }
            
            void main() {
            `
          );

          // Insert a call to moveWave (and record vHeight) in the main function.
          shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `
            #include <begin_vertex>
            transformed = moveWave(transformed);
            vHeight = transformed.y;
            `
          );

          // Prepend the varying declarations to the fragment shader.
          shader.fragmentShader = 'varying float vHeight;\nvarying float vInvisible;\n' + shader.fragmentShader;

          // Modify the fragment shader to discard fragments with vInvisible > 0.5 and mix colors based on vHeight.
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <color_fragment>',
            `
            #include <color_fragment>
            if(vInvisible > 0.5) { discard; }
            diffuseColor.rgb = mix(vec3(0.03125, 0.0625, 0.5), vec3(0.1, 0.2, 0.6), smoothstep(0.0, 6.0, vHeight));
            `
          );
        }
      });
      
      // Calculate starting positions for grid tiles.
      zx = -0.5 * scope.GrdRCs * scope.GrdSiz + 0.5 * scope.GrdSiz;
      for (let i = 0; i < scope.GrdRCs; i++) {
        scope.WavMZV[i] = zx;
        scope.WavMXV[i] = zx;
        zx += scope.GrdSiz;
      }

      // Create and position the adjacent plane meshes.
      n = 0;
      for (let z = 0; z < scope.GrdRCs; z++) {
        for (let x = 0; x < scope.GrdRCs; x++) {
          scope.GrdPtr[n] = new THREE.Mesh(scope.geoWav, scope.matWav);
          scope.GrdPtr[n].position.set(scope.WavMXV[x], 12, -scope.WavMZV[z]);
          scope.world.graphicsWorld.add(scope.GrdPtr[n]);
          n++;
        }
      }
      scope.LodFlg = 1;
    }
  }

  // ─── Compute the water height at world coordinate (x,z) and time t ─────────
  public getWaveHeightAt(x: number, z: number, t: number, isP?: boolean): number | string {
    const gridSize = this.GrdSiz;      // e.g. 1000
    const segNum = this.segNum;        // e.g. 200
    const segmentSize = gridSize / segNum;
    const totalSize = this.GrdRCs * gridSize;
  
    // Convert world coordinate into ocean tile space.
    const oceanX = x + totalSize / 2;
    const oceanZ = z + totalSize / 2;
    const tileXIndex = Math.floor(oceanX / gridSize);
    const tileZIndex = Math.floor(oceanZ / gridSize);
    const tileIndex = tileZIndex * this.GrdRCs + tileXIndex;
  
    // Out–of–bounds? (Or if no tile exists.) Return a default water level.
    if (tileIndex < 0 || tileIndex >= this.GrdPtr.length) {
      return 12;
    }
    const oceanTile = this.GrdPtr[tileIndex];
    if (!oceanTile) {
      return 12;
    }
  
    // Compute the local coordinate inside the tile.
    const localXFull = x - oceanTile.position.x;
    const localZFull = z - oceanTile.position.z;
  
    // Snap to the nearest vertex on the tile grid.
    let vertexX = Math.round((localXFull + gridSize / 2) / segmentSize) * segmentSize - gridSize / 2;
    let vertexZ = Math.round((localZFull + gridSize / 2) / segmentSize) * segmentSize - gridSize / 2;
  
    let y: number | string = 0;
    // If for some reason vertex snapping fails, default to y = 8.5.
    if (!isFinite(vertexX) || !isFinite(vertexZ)) {
      y = 8.5;
    } else {
      const num = 0.7;
      const gridUniform = this.gu.grid.value; // should be 1000
      const kzx = 360.0 / gridUniform;
      // @ts-ignore
      function toRadians(angle: number): number {
        if (angle > 360) { angle -= 360; }
        return angle * Math.PI / 180;
      }
      let ang = toRadians(50.0 * t - 1.0 * vertexX * kzx - 2.0 * vertexZ * kzx);
      y = num * 3.0 * Math.sin(ang);
      ang = toRadians(25.0 * t - 3.0 * vertexX * kzx);
      y += num * 2.0 * Math.sin(ang);
      ang = toRadians(15.0 * t - 3.0 * vertexZ * kzx);
      y += num * 2.0 * Math.sin(ang);
      ang = toRadians(50.0 * t + 4.0 * vertexX * kzx + 8.0 * vertexZ * kzx);
      y += num * 0.5 * Math.sin(ang);
      ang = toRadians(50.0 * t + 8.0 * vertexX * kzx);
      y += num * 0.5 * Math.sin(ang);
  
      // Compute the world coordinate of the snapped vertex.
      const worldX = oceanTile.position.x + vertexX;
      const worldZ = oceanTile.position.z + vertexZ;
  
      // These are the “no–wave” zone parameters (as used in the shader).
      const noWaveCenter = { x: 0.0, z: 0.0 };
      const noWaveHalfSize = { x: 180.0, z: 140.0 };
      const noWaveHalfSize2 = { x: 300.0, z: 330.0 };
  
      // Normally, if inside the inner no–wave zone we’d force y to –100,
      // but for boat physics we want to return 8.5 instead.
      if (
        Math.abs(worldX - noWaveCenter.x) < noWaveHalfSize.x &&
        Math.abs(worldZ - noWaveCenter.z) < noWaveHalfSize.z
      ) {
        y = 'don don don don';
      } else if (
        Math.abs(worldX - noWaveCenter.x) < noWaveHalfSize2.x &&
        Math.abs(worldZ - noWaveCenter.z) < noWaveHalfSize2.z
      ) {
        y = 8.5;
      } else {
        y += 3.6;
      }
    }
    if (y === 'don don don don') return y;
    const finalHeight = y + oceanTile.position.y;
    return finalHeight + 0.1;
  }
  
  public update(timeStep: number): void {
    const speed = 0.1;
    if (this.LodFlg > 0) {
      this.etime = this.clock.getElapsedTime();
      this.gu.time.value = this.etime;
      // Animate the normal map for a subtle effect.
      if (this.WtrNrm) {
        this.WtrNrm.offset.x -= 0.0005 * speed;
        this.WtrNrm.offset.y += 0.00025 * speed;
      }
    }
  }
}
