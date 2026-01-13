/**
 * Base Provider Classes
 * Defines the contract for all services.
 */

import { ServiceResponse } from '../types';

export interface IProvider {
    name: string;
    initialize(): Promise<void>;
}

export abstract class BaseProvider implements IProvider {
    abstract name: string;
    protected isInitialized = false;

    async initialize(): Promise<void> {
        this.isInitialized = true;
        console.log(`[PhiVision] Provider initialized: ${this.name}`);
    }

    protected checkInitialized() {
        if (!this.isInitialized) {
            throw new Error(`Provider ${this.name} not initialized`);
        }
    }
}
