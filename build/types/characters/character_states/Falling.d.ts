import { CharacterStateBase } from './_stateLibrary';
import { ICharacterState } from '../../interfaces/ICharacterState';
import { Character } from '../Character';
import { VehicleSeat } from '../../vehicles/VehicleSeat';
export declare class Falling extends CharacterStateBase implements ICharacterState {
    closeOnLandIfClose: boolean;
    seat?: VehicleSeat;
    constructor(character: Character, seat?: VehicleSeat);
    update(timeStep: number): void;
}
