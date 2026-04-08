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
        return false;
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

        // TODO: check if user adding shipping leg is authorized
        

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


        // TODO, hasn't been implemented because I don't know where we're storing
        // the data
        const assetCurrentLocation = asset.getCurrentLocation();
        const assetReceiver = asset.getCurrentShippingLeg()?.shippingReceiver;

        // TODO, not sure how I am going to link delivery party identities with
        // an immutable delivery location, but that is what I am looking to do
        // here
        const DELIVERY_LOCATIONS: Record<string, unknown> = {};
        if (assetReceiver && this.isWithin(DELIVERY_LOCATIONS[assetReceiver.getID()], assetCurrentLocation)) {
            // TODO - this will need to be fleshed out better

            // Mark shipping leg complete, and transition on to the next one.
            // If there is no next shipping leg, mark the asset as successfully
            // finally delivered

            // Finally save the updated asset
        }
        
    }
}
