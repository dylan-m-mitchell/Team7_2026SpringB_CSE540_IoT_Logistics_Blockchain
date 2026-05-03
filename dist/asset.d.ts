import { ClientIdentity } from 'fabric-shim';
export interface ShippingLeg {
    shippingHandler: ClientIdentity;
    shippingReceiver: ClientIdentity;
    isComplete: boolean;
    isSuccess: boolean;
    transitTimeStartMs: number;
    maxTransitTimeMs: number;
}
export interface ShippingTolerances {
    humidityMin?: number;
    humidityMax?: number;
    tempMin?: number;
    tempMax?: number;
    shockMin?: number;
    shockMax?: number;
}
export declare class Asset {
    assetId: string;
    isShipped: boolean;
    isDelivered: boolean;
    isDamaged: boolean;
    currentLat: number;
    currentLong: number;
    shippingLegs: ShippingLeg[];
    shippingTolerances: ShippingTolerances;
    constructor(assetId: string, isShipped?: boolean, isDelivered?: boolean, isDamaged?: boolean, currentLat?: number, currentLong?: number, shippingLegs?: ShippingLeg[]);
    /**
     * TODO: Stub function, will fill in later. Might be able to merge with
     * getCurrentState()
     */
    getCurrentLocation(): {
        lat: number;
        long: number;
    };
    /**
     * TODO: Stub function, will fill in later
     */
    getCurrentState(): Map<string, number>;
    getCurrentShippingLeg(): ShippingLeg | undefined;
}
