import { Context, Contract } from 'fabric-contract-api';
export declare class AssetTransferContract extends Contract {
    private toStateBytes;
    private parseJson;
    private parseAsset;
    private isWithin;
    CreateAsset(ctx: Context, id: string): Promise<void>;
    AssetExists(ctx: Context, id: string): Promise<boolean>;
    ReadAsset(ctx: Context, id: string): Promise<string>;
    setTolerances(ctx: Context, id: string, tolerancesJson: string): Promise<void>;
    /**
     * Add a shipping leg to this asset's planned route. Throws when the asset
     * specified has already left the warehouse
     * @param ctx - The hyperledger context
     * @param assetId - The id of the asset you want to edit
     * @param shippingLeg - The new shipping details
     */
    addShippingLeg(ctx: Context, assetId: string, shippingLegJson: string): Promise<void>;
    private updateAssetInternal;
    /**
     * Update the asset with a partial mapping of new attribute values
     * @param ctx - The hyperledger context
     * @param newAsset - A simple Object with only a required "assetId" key
     * @returns
     */
    updateAsset(ctx: Context, newAssetJson: string): Promise<void>;
    /**
     * Assess the current state of an asset and return a boolean of whether it
     * is bad enough to qualify as damaged.
     * @param ctx - The hyperledger context
     * @param id - The id of the asset
     * @returns
     */
    assessDamage(ctx: Context, id: string): Promise<boolean>;
    /**
     * The meat and potatoes - the function in the contract that handles asset
     * transfer from one party to another.
     * @param ctx
     * @param id
     */
    transferAsset(ctx: Context, id: string): Promise<void>;
}
