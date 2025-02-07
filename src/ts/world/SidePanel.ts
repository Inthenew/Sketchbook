import { World } from "./World";
import { CannonDebugRenderer } from '../../lib/cannon/CannonDebugRenderer';
import * as GUI from '../../lib/utils/dat.gui';
import { UIManager } from '../core/UIManager';
export class SidePanel {
    private world: World;
    constructor(world: World) {
        this.world = world;
    }
    public createParamsGUI(): void {
        const scope = this.world;
        this.world.params = {
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
        this.world.defParams = { ...this.world.params };
        const resetSettings = () => {
            this.world.params = { ...this.world.defParams };

            saveSettings();
            setValues(this.world.params, gui);
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
            let params = { ...this.world.defParams };
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
            let d = { ...this.world.params };
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
            this.world.params.Time_Scale = this.world.defParams.Time_Scale;
            this.world.params.Gravity_Scale = this.world.defParams.Gravity_Scale;
            this.world.params.Free_Cam_Speed = this.world.defParams.Free_Cam_Speed;
            // reset other world settings

            this.world.physicsWorld.gravity.set(0, -9.81 * this.world.params.Gravity_Scale, 0);

            // update GUI
            gui.updateDisplay();

            saveSettings();
        }
        const loadSettings = (isNR) => {
            let savedSettings = localStorage.getItem('settings');
            if (!isNR) {
                savedSettings = JSON.stringify(this.world.defParams);
            }
            if (savedSettings || !isNR) {
                Object.assign(this.world.params, JSON.parse(savedSettings));

                setTimeout(() => {
                    //this.world.timeScaleTarget = Number(this.world.params.Time_Scale); Does not work //
                    scope.Has_Day_Night_Cycle = this.world.params.Has_Day_Night_Cycle;
                    scope.Has_Night_Time = this.world.params.Has_Night_Time;
                    scope.Free_Cam_Speed = this.world.params.Free_Cam_Speed;
                    if (this.world.params.Shadows) {
                        //this.world.sky?.csm.lights.forEach((light) => {
                        //    light.castShadow = true;
                        //});
                    }
                    else {
                        //this.world.sky?.csm.lights.forEach((light) => {
                        //    light.castShadow = false;
                        //});
                    }
                    this.world.physicsWorld.gravity.set(0, -9.81 * this.world.params.Gravity_Scale, 0);
                    scope.inputManager.setPointerLock(this.world.params.Pointer_Lock);
                    scope.cameraOperator.setSensitivity(this.world.params.Mouse_Sensitivity, this.world.params.Mouse_Sensitivity * 0.8);
                    if (this.world.params.Debug_Physics) {
                        this.world.cannonDebugRenderer = new CannonDebugRenderer(this.world.graphicsWorld, this.world.physicsWorld);
                    }

                    scope.characters.forEach((char) => {
                        char.raycastBox.visible = this.world.params.Debug_Physics;
                    });
                    UIManager.setFPSVisible(this.world.params.Debug_FPS);
                    let vehicles = this.world.vehicles;
                    for (let i = 0; i < vehicles.length; i++) {
                        if (typeof vehicles[i].isCar === 'boolean') {
                            // Is a car //
                            let car = vehicles[i];
                            car.updateWheelProps('frictionSlip', this.world.params.Friction_Slip);
                            car.updateWheelProps('suspensionStiffness', this.world.params.Suspension_Stiffness);
                            car.updateWheelProps('maxSuspensionTravel', this.world.params.Max_Suspension);
                            car.updateWheelProps('dampingCompression', this.world.params.Damping_Compression);
                            car.updateWheelProps('dampingRelaxation', this.world.params.Damping_Relaxation);
                            car.updateCarSpeed(this.world.params.Engine_Force);
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
                if (this.world.vehicles.length !== last) {
                    last = this.world.vehicles.length;
                    let vehicles = this.world.vehicles;
                    for (let i = 0; i < vehicles.length; i++) {
                        if (typeof vehicles[i].isCar === 'boolean') {
                            // Is a car //
                            let car = vehicles[i];
                            car.updateWheelProps('frictionSlip', this.world.params.Friction_Slip);
                            car.updateWheelProps('suspensionStiffness', this.world.params.Suspension_Stiffness);
                            car.updateWheelProps('maxSuspensionTravel', this.world.params.Max_Suspension);
                            car.updateWheelProps('dampingCompression', this.world.params.Damping_Compression);
                            car.updateWheelProps('dampingRelaxation', this.world.params.Damping_Relaxation);
                            car.updateCarSpeed(this.world.params.Engine_Force);
                        }
                    }
                }
            })
        }
        const gui = new GUI.GUI();
        this.world.gui = gui;
        loadSettings(true);
        // Scenario
        this.world.scenarioGUIFolder = gui.addFolder('Scenarios');
        this.world.scenarioGUIFolder.open();
        globalThis.world.pp = scope;
        setInterval(() => {
            if (scope.Has_Day_Night_Cycle) {
                //scope.sky.phi = scope.sky._phi + .01 * this.world.params.Time_Scale;
                /*if (!scope.Has_Night_Time && scope.sky._phi >= 180) {
                    //scope.sky.phi = 0;
                } else if (scope.Has_Night_Time && scope.sky._phi >= 360) {
                    //scope.sky.phi = 0;
                }*/
            } else {
                //scope.sky.phi = 50;
            }
        }, 10)
        // World
        let worldFolder = gui.addFolder('World');
        worldFolder.add(this.world.params, 'Time_Scale', 0, 1).listen()
            .onChange((value) => {
                scope.timeScaleTarget = value;
                this.world.params.Time_Scale = value;
                //saveSettings(); Does not work //
            });
        worldFolder.add(this.world.params, 'Free_Cam_Speed', 0, 100).onChange((value) => {
            scope.Free_Cam_Speed = value;
            this.world.params.Free_Cam_Speed = value;
            saveSettings();
        })
        worldFolder.add(this.world.params, 'Has_Day_Night_Cycle').listen().onChange((value) => {
            scope.Has_Day_Night_Cycle = value;
            saveSettings();
        })
        worldFolder.add(this.world.params, 'Has_Night_Time').listen().onChange((value) => {
            scope.Has_Night_Time = value;
            saveSettings();
        })

        worldFolder.add(this.world.params, 'Gravity_Scale', 0, 2).onChange((value) => {
            scope.Gravity_Scale = value;
            this.world.physicsWorld.gravity.set(0, -9.81 * value, 0);
            saveSettings();
        });

        worldFolder.add(this.world.params, 'Reset_World_Settings')
            .name('Reset World Settings')
            .listen()
            .onChange(resetWorldSettings);
        /* // Day and Night cycle replaces this //
    worldFolder.add(this.world.params, 'Sun_Elevation', 0, 180).listen()
        .onChange((value) =>
        {
            scope.sky.phi = value;
        });
    worldFolder.add(this.world.params, 'Sun_Rotation', 0, 360).listen()
        .onChange((value) =>
        {
            scope.sky.theta = value;
        });
        */ // Day and Night cycle replaces this //

        // Input
        let settingsFolder = gui.addFolder('Settings');
        settingsFolder.add(this.world.params, 'FXAA').onChange((enabled) => {
            saveSettings();
        })
        settingsFolder.add(this.world.params, 'Shadows')
            .onChange((enabled) => {
                /*if (enabled) {
                    this.world.sky.csm.lights.forEach((light) => {
                        light.castShadow = true;
                    });
                    saveSettings();
                }
                else {
                    this.world.sky.csm.lights.forEach((light) => {
                        light.castShadow = false;
                    });
                    saveSettings();
                }*/
            })
        settingsFolder.add(this.world.params, 'Pointer_Lock')
            .onChange((enabled) => {
                scope.inputManager.setPointerLock(enabled);
                saveSettings();
            })
        settingsFolder.add(this.world.params, 'Mouse_Sensitivity', 0, 1)
            .onChange((value) => {
                scope.cameraOperator.setSensitivity(value, value * 0.8);
                saveSettings();
            })
        settingsFolder.add(this.world.params, 'Debug_Physics')
            .onChange((enabled) => {
                if (enabled) {
                    this.world.cannonDebugRenderer = new CannonDebugRenderer(this.world.graphicsWorld, this.world.physicsWorld);
                }
                else {
                    this.world.cannonDebugRenderer.clearMeshes();
                    this.world.cannonDebugRenderer = undefined;
                }

                scope.characters.forEach((char) => {
                    char.raycastBox.visible = enabled;
                });
                saveSettings();
            })
        settingsFolder.add(this.world.params, 'Debug_FPS')
            .onChange((enabled) => {
                UIManager.setFPSVisible(enabled);
                saveSettings();
            })

        settingsFolder.add(this.world.params, 'Reset_Settings').name('Reset Settings');
        let advancedVFolder = gui.addFolder('Advanced Vehicles');
        advancedVFolder.add(this.world.params, 'Friction_Slip', 0, 10).onChange(value => {
            this.world.params.Friction_Slip = value;
            // Apply to all cars //
            let vehicles = this.world.vehicles;
            for (let i = 0; i < vehicles.length; i++) {
                if (typeof vehicles[i].isCar === 'boolean') {
                    // Is a car //
                    let car = vehicles[i];
                    car.updateWheelProps('frictionSlip', value);
                }
            }
            saveSettings();
        })
        advancedVFolder.add(this.world.params, 'Engine_Force', .1, 100).onChange(value => {
            this.world.params.Engine_Force = value;
            // Apply to all cars //
            let vehicles = this.world.vehicles;
            for (let i = 0; i < vehicles.length; i++) {
                if (typeof vehicles[i].isCar === 'boolean') {
                    // Is a car //
                    let car = vehicles[i];
                    car.updateCarSpeed(value);
                }
            }
            saveSettings();
        })
        advancedVFolder.add(this.world.params, 'Suspension_Stiffness', 0, 100).onChange(value => {
            this.world.params.Suspension_Stiffness = value;

            // Apply to all cars //
            let vehicles = this.world.vehicles;
            for (let i = 0; i < vehicles.length; i++) {
                if (typeof vehicles[i].isCar === 'boolean') {
                    // Is a car //
                    let car = vehicles[i];
                    car.updateWheelProps('suspensionStiffness', value);
                }
            }
            saveSettings();
        })

        //advancedVFolder.add(this.world.params, 'Suspension_Size', 0, 5).onChange(value => {
        //    saveSettings();
        //})

        advancedVFolder.add(this.world.params, 'Max_Suspension', 0, 5).onChange(value => {
            this.world.params.Max_Suspension = value;
            // Apply to all cars //
            let vehicles = this.world.vehicles;
            for (let i = 0; i < vehicles.length; i++) {
                if (typeof vehicles[i].isCar === 'boolean') {
                    // Is a car //
                    let car = vehicles[i];
                    car.updateWheelProps('maxSuspensionTravel', value);
                }
            }
            saveSettings();
        })

        advancedVFolder.add(this.world.params, 'Damping_Compression', 0, 5).onChange(value => {
            this.world.params.Damping_Compression = value;
            // Apply to all cars //
            let vehicles = this.world.vehicles;
            for (let i = 0; i < vehicles.length; i++) {
                if (typeof vehicles[i].isCar === 'boolean') {
                    // Is a car //
                    let car = vehicles[i];
                    car.updateWheelProps('dampingCompression', value);
                }
            }
            saveSettings();
        })

        advancedVFolder.add(this.world.params, 'Damping_Relaxation', 0, 5).onChange(value => {
            this.world.params.Damping_Relaxation = value;
            // Apply to all cars //
            let vehicles = this.world.vehicles;
            for (let i = 0; i < vehicles.length; i++) {
                if (typeof vehicles[i].isCar === 'boolean') {
                    // Is a car //
                    let car = vehicles[i];
                    car.updateWheelProps('dampingRelaxation', value);
                }
            }
            saveSettings();
        })
        advancedVFolder.add(this.world.params, 'Reset_Car_Settings').name('Reset Car Settings');
        gui.open();
    }
}