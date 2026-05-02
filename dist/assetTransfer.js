"use strict";
/* In the fabric samples this logic is separated into a separate file from the
type definition */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetTransferContract = void 0;
const fabric_contract_api_1 = require("fabric-contract-api");
const json_stringify_deterministic_1 = __importDefault(require("json-stringify-deterministic"));
const sort_keys_recursive_1 = __importDefault(require("sort-keys-recursive"));
const asset_1 = require("./asset");
// This class contains all of the asset handling and governance logic.
let AssetTransferContract = class AssetTransferContract extends fabric_contract_api_1.Contract {
    toStateBytes(value) {
        // sort-keys-recursive requires plain objects; class instances must be flattened first.
        const plainValue = JSON.parse(JSON.stringify(value));
        return Buffer.from((0, json_stringify_deterministic_1.default)((0, sort_keys_recursive_1.default)(plainValue)));
    }
    parseJson(raw, label) {
        try {
            return JSON.parse(raw);
        }
        catch {
            throw new Error(`Invalid JSON for ${label}`);
        }
    }
    parseAsset(assetJson) {
        return Object.assign(new asset_1.Asset(''), JSON.parse(assetJson));
    }
    isWithin(_expectedLocation, _actualLocation) {
        return false;
    }
    async CreateAsset(ctx, id) {
        const exists = await this.AssetExists(ctx, id);
        if (exists)
            throw new Error(`The asset ${id} already exists`);
        const asset = new asset_1.Asset(id);
        await ctx.stub.putState(id, this.toStateBytes(asset));
    }
    async AssetExists(ctx, id) {
        if (id === null || id === undefined)
            return false;
        const assetJSON = await ctx.stub.getState(id);
        return assetJSON.length > 0;
    }
    // Get an asset from its id
    async ReadAsset(ctx, id) {
        // somehow magically gets the asset from the current context
        const assetJSON = await ctx.stub.getState(id);
        if (assetJSON.length === 0)
            throw new Error(`The asset ${id} does not exist`);
        return assetJSON.toString();
    }
    async setTolerances(ctx, id, tolerancesJson) {
        const asset = this.parseAsset(await this.ReadAsset(ctx, id));
        const tolerances = this.parseJson(tolerancesJson, 'tolerances');
        // check that the asset has not already started its journey
        if (asset.isShipped) {
            throw new Error('Cannot edit an asset once it is shipped!');
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
    async addShippingLeg(ctx, assetId, shippingLegJson) {
        const asset = this.parseAsset(await this.ReadAsset(ctx, assetId));
        const shippingLeg = this.parseJson(shippingLegJson, 'shippingLeg');
        if (asset.isShipped || asset.isDelivered) {
            throw new Error(`Error, can't edit an asset that has already been shipped`);
        }
        // TODO: check if user adding shipping leg is authorized
        asset.shippingLegs.push(shippingLeg);
        await this.updateAssetInternal(ctx, asset);
    }
    async updateAssetInternal(ctx, newAsset) {
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
    async updateAsset(ctx, newAssetJson) {
        const newAsset = this.parseJson(newAssetJson, 'asset');
        await this.updateAssetInternal(ctx, newAsset);
    }
    /**
     * Assess the current state of an asset and return a boolean of whether it
     * is bad enough to qualify as damaged.
     * @param ctx - The hyperledger context
     * @param id - The id of the asset
     * @returns
     */
    async assessDamage(ctx, id) {
        const asset = this.parseAsset(await this.ReadAsset(ctx, id));
        // Haven't fully defined how we will be assessing the current state of
        // the asset, temp, location, etc
        // leaving this as a mock, this is a TODO item
        const assetStats = asset.getCurrentState();
        if (!assetStats)
            return true;
        for (const [tolName, tolVal] of Object.entries(asset.shippingTolerances)) {
            if (typeof tolVal !== 'number') {
                continue;
            }
            const measured = assetStats.get(tolName);
            if (measured === undefined) {
                continue;
            }
            if (tolName.includes('Min')) {
                if (tolVal > measured)
                    return true;
            }
            else if (tolName.includes('Max')) {
                if (tolVal < measured)
                    return true;
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
    async transferAsset(ctx, id) {
        const asset = this.parseAsset(await this.ReadAsset(ctx, id));
        let isDamaged = asset.isDamaged;
        const damageMsg = `Cannot transfer a damaged asset - state unacceptable for delivery`;
        if (isDamaged) {
            throw new Error(damageMsg);
        }
        isDamaged = await this.assessDamage(ctx, asset.assetId);
        if (isDamaged) {
            await this.updateAssetInternal(ctx, { ...asset, isDamaged: true });
            throw new Error(damageMsg);
        }
        // TODO, hasn't been implemented because I don't know where we're storing
        // the data
        const assetCurrentLocation = asset.getCurrentLocation();
        const assetReceiver = asset.getCurrentShippingLeg()?.shippingReceiver;
        // TODO, not sure how I am going to link delivery party identities with
        // an immutable delivery location, but that is what I am looking to do
        // here
        const DELIVERY_LOCATIONS = {};
        if (assetReceiver && this.isWithin(DELIVERY_LOCATIONS[assetReceiver.getID()], assetCurrentLocation)) {
            // TODO - this will need to be fleshed out better
            // Mark shipping leg complete, and transition on to the next one.
            // If there is no next shipping leg, mark the asset as successfully
            // finally delivered
            // Finally save the updated asset
        }
    }
};
exports.AssetTransferContract = AssetTransferContract;
__decorate([
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String]),
    __metadata("design:returntype", Promise)
], AssetTransferContract.prototype, "CreateAsset", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(false),
    (0, fabric_contract_api_1.Returns)('boolean'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String]),
    __metadata("design:returntype", Promise)
], AssetTransferContract.prototype, "AssetExists", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(false),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String]),
    __metadata("design:returntype", Promise)
], AssetTransferContract.prototype, "ReadAsset", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String, String]),
    __metadata("design:returntype", Promise)
], AssetTransferContract.prototype, "setTolerances", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String, String]),
    __metadata("design:returntype", Promise)
], AssetTransferContract.prototype, "addShippingLeg", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String]),
    __metadata("design:returntype", Promise)
], AssetTransferContract.prototype, "updateAsset", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String]),
    __metadata("design:returntype", Promise)
], AssetTransferContract.prototype, "assessDamage", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String]),
    __metadata("design:returntype", Promise)
], AssetTransferContract.prototype, "transferAsset", null);
exports.AssetTransferContract = AssetTransferContract = __decorate([
    (0, fabric_contract_api_1.Info)({ title: 'AssetTransfer', description: 'Smart contract for IoT asset tracking and shipping logistics' })
], AssetTransferContract);
