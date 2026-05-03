/* In the fabric samples this logic is separated into a separate file from the
type definition */

import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import stringify from 'json-stringify-deterministic';
import sortKeysRecursive from 'sort-keys-recursive';
import { Asset, ShippingLeg, ShippingTolerances } from './asset';


type PartialWithRequired<T, K extends keyof T> = Partial<T> & Required<Pick<T, K>>;

// This class contains all of the asset handling and governance logic.
@Info({title: 'AssetTransfer', description: 'Smart contract for IoT asset tracking and shipping logistics'})
export class AssetTransferContract extends Contract {

    private toStateBytes(value: unknown): Buffer {
        // sort-keys-recursive requires plain objects; class instances must be flattened first.
        const plainValue = JSON.parse(JSON.stringify(value));
        return Buffer.from(stringify(sortKeysRecursive(plainValue)));
    }

    private parseJson<T>(raw: string, label: string): T {
        try {
            return JSON.parse(raw) as T;
        } catch {
            throw new Error(`Invalid JSON for ${label}`);
        }
    }

    private parseAsset(assetJson: string): Asset {
        return Object.assign(new Asset(''), JSON.parse(assetJson) as Asset);
    }

    private isWithin(_expectedLocation: unknown, _actualLocation: unknown): boolean {
        // If no expected location provided, allow transfer (no geofence)
        if (!_expectedLocation) return true;

        // Validate shapes
        const expected = _expectedLocation as { lat: number; long: number; radiusMeters?: number };
        const actual = _actualLocation as { lat: number; long: number } | undefined;
        if (!actual || typeof actual.lat !== 'number' || typeof actual.long !== 'number') return false;

        const toRad = (deg: number) => deg * Math.PI / 180;

        const R = 6371000; // Earth radius in meters
        const dLat = toRad(actual.lat - expected.lat);
        const dLon = toRad(actual.long - expected.long);
        const lat1 = toRad(expected.lat);
        const lat2 = toRad(actual.lat);

        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;

        const radius = typeof expected.radiusMeters === 'number' ? expected.radiusMeters : 100;
        return distance <= radius;
    }

    @Transaction()
    public async CreateAsset(ctx: Context, id: string): Promise<void> {
        const exists = await this.AssetExists(ctx, id);
        if (exists) throw new Error(`The asset ${id} already exists`);

        const asset = new Asset(id);
        await ctx.stub.putState(id, this.toStateBytes(asset));
    }

    @Transaction(false)
    @Returns('boolean')
    public async AssetExists(ctx: Context, id: string): Promise<boolean> {
        if (id === null || id === undefined) return false;
        const assetJSON = await ctx.stub.getState(id);
        return assetJSON.length > 0;
    }

    // Get an asset from its id
    @Transaction(false)
    public async ReadAsset(ctx: Context, id: string): Promise<string> {
        // somehow magically gets the asset from the current context
        const assetJSON = await ctx.stub.getState(id);

        if (assetJSON.length === 0) throw new Error(`The asset ${id} does not exist`);

        return assetJSON.toString();
    }


    @Transaction()
    public async setTolerances(ctx: Context, id:string, tolerancesJson: string): Promise<void> {
        const asset = this.parseAsset(await this.ReadAsset(ctx, id));
        const tolerances = this.parseJson<ShippingTolerances>(tolerancesJson, 'tolerances');

        // check that the asset has not already started its journey
        if (asset.isShipped) {
            throw new Error('Cannot edit an asset once it is shipped!')
        }

        asset.shippingTolerances = tolerances;

        await this.updateAssetInternal(ctx, asset);
    }


    /**
     * Add a shipping leg to this asset's planned route. Throws when the asset
     * specified has already left the warehouse
     * @param ctx - The hyperledger context
     * @param assetId - The id of the asset you want to edit
     * @param shippingLeg - The new shipping details
     */
    @Transaction()
    public async addShippingLeg(ctx: Context, assetId: string, shippingLegJson: string): Promise<void> {
        const asset = this.parseAsset(await this.ReadAsset(ctx, assetId));
        const shippingLeg = this.parseJson<ShippingLeg>(shippingLegJson, 'shippingLeg');

        if (asset.isShipped || asset.isDelivered) {
            throw new Error(`Error, can't edit an asset that has already been shipped`);
        }

        // Authorization: only the declared shipping handler may add this leg
        const callerId = ctx.clientIdentity && typeof ctx.clientIdentity.getID === 'function'
            ? ctx.clientIdentity.getID()
            : undefined;
        if (!callerId || callerId !== shippingLeg.shippingHandler) {
            throw new Error(`Unauthorized: caller ${callerId} is not the declared shippingHandler ${shippingLeg.shippingHandler} for asset ${assetId}`);
        }

        asset.shippingLegs.push(shippingLeg);
        await this.updateAssetInternal(ctx, asset);

    }

            private async updateAssetInternal(ctx: Context, newAsset: PartialWithRequired<Asset, 'assetId'>): Promise<void> {
                const existing = this.parseAsset(await this.ReadAsset(ctx, newAsset.assetId));

                // takes left and updates it with all the values present in right
                const updated = Object.assign(existing, newAsset);

                await ctx.stub.putState(updated.assetId, this.toStateBytes(updated));
            }

    /**
     * Update the asset with a partial mapping of new attribute values
     * @param ctx - The hyperledger context
     * @param newAsset - A simple Object with only a required "assetId" key
     * @returns 
     */
    @Transaction()
    public async updateAsset(ctx: Context, newAssetJson: string): Promise<void> {
        const newAsset = this.parseJson<PartialWithRequired<Asset, 'assetId'>>(newAssetJson, 'asset');
        await this.updateAssetInternal(ctx, newAsset);
    }
     
   /**
    * Assess the current state of an asset and return a boolean of whether it
    * is bad enough to qualify as damaged.
    * @param ctx - The hyperledger context
    * @param id - The id of the asset
    * @returns 
    */
    @Transaction()
    public async assessDamage(ctx: Context, id: string): Promise<boolean> {
        const asset = this.parseAsset(await this.ReadAsset(ctx, id));

        // Haven't fully defined how we will be assessing the current state of
        // the asset, temp, location, etc

        // leaving this as a mock, this is a TODO item
        const assetStats: Map<string, number> = asset.getCurrentState();
        if (!assetStats) return true;

        for (const [tolName, tolVal] of Object.entries(asset.shippingTolerances)){
            if (typeof tolVal !== 'number') {
                continue;
            }

            const measured = assetStats.get(tolName);
            if (measured === undefined) {
                continue;
            }

            if (tolName.includes('Min')) {
                if (tolVal > measured) return true;
            }
            else if (tolName.includes('Max')) {
                if (tolVal < measured) return true;
            }
        }

        // Check that the current time elapsed in this shipping leg has not exceeded the max
        const currentShippingLeg = asset.getCurrentShippingLeg();
        const start = currentShippingLeg?.transitTimeStartMs;
        const maxDur = currentShippingLeg?.maxTransitTimeMs;

        // We will ignore the possibility of timezones from now on and assume
        // everyone is transacting in UTC
        if (start && maxDur && Date.now() > start + maxDur) {
            return true;
        }

        return false;
    }


    /**
     * The meat and potatoes - the function in the contract that handles asset
     * transfer from one party to another.
     * @param ctx 
     * @param id 
     */
    @Transaction()
    public async transferAsset(ctx: Context, id:string): Promise<void> {
        const asset = this.parseAsset(await this.ReadAsset(ctx, id));
        let isDamaged = asset.isDamaged;

        const damageMsg = `Cannot transfer a damaged asset - state unacceptable for delivery`;

        if (isDamaged) {
            throw new Error(damageMsg);
        }

        isDamaged = await this.assessDamage(ctx, asset.assetId);
        if (isDamaged){
            await this.updateAssetInternal(ctx, {...asset, isDamaged: true});
            throw new Error(damageMsg);
        }


        // Determine current location and receiver
        const assetCurrentLocation = asset.getCurrentLocation();
        const currentLeg = asset.getCurrentShippingLeg();
        const assetReceiver = currentLeg?.shippingReceiver;

        // In-function mapping of delivery locations (empty by default)
        const DELIVERY_LOCATIONS: Record<string, { lat: number; long: number; radiusMeters?: number }> = {};

        if (!assetReceiver) {
            throw new Error(`Cannot transfer asset ${asset.assetId}: no current shipping receiver defined`);
        }

        const expectedLocation = DELIVERY_LOCATIONS[assetReceiver];
        if (expectedLocation && !this.isWithin(expectedLocation, assetCurrentLocation)) {
            throw new Error(`Asset ${asset.assetId} cannot be transferred to ${assetReceiver}: delivery location not reached`);
        }

        // Mark current shipping leg complete and set shipped flag
        if (currentLeg) {
            currentLeg.isComplete = true;
        }
        asset.isShipped = true;

        // If no remaining incomplete legs, mark delivered
        const hasIncomplete = asset.shippingLegs.some((leg) => !leg.isComplete);
        if (!hasIncomplete) {
            asset.isDelivered = true;
        } else {
            // start transit for the next incomplete leg
            const nextLeg = asset.shippingLegs.find((leg) => !leg.isComplete);
            if (nextLeg) nextLeg.transitTimeStartMs = Date.now();
        }

        await this.updateAssetInternal(ctx, asset);

        // Emit transfer event
        const eventPayload = { assetId: asset.assetId, to: assetReceiver };
        await ctx.stub.setEvent('AssetTransfer', Buffer.from(JSON.stringify(eventPayload)));
        
    }
}
