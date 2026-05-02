"use strict";
/*
    This is a draft file, more so just for structure until a common
    language is decided on.
*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.Asset = void 0;
;
class Asset {
    constructor(assetId, isShipped = false, isDelivered = false, isDamaged = false, currentLat = 0, currentLong = 0, shippingLegs = []) {
        // flag to signal object construction is finished and asset is "live"
        this.isShipped = false;
        // final state flag once a delivery is successful for asset tracking to
        // turn off
        this.isDelivered = false;
        // we want to avoid setting this to true
        this.isDamaged = false;
        // used for tracking location for custody hand offs
        this.currentLat = 0;
        this.currentLong = 0;
        // An array of legs - trips from one handler to another.
        this.shippingLegs = [];
        this.shippingTolerances = {};
        this.assetId = assetId;
        this.isShipped = isShipped;
        this.isDelivered = isDelivered;
        this.isDamaged = isDamaged;
        this.currentLat = currentLat;
        this.currentLong = currentLong;
        this.shippingLegs = shippingLegs;
    }
    /**
     * TODO: Stub function, will fill in later. Might be able to merge with
     * getCurrentState()
     */
    getCurrentLocation() {
        return { lat: this.currentLat, long: this.currentLong };
    }
    /**
     * TODO: Stub function, will fill in later
     */
    getCurrentState() {
        return new Map();
    }
    getCurrentShippingLeg() {
        return this.shippingLegs.find((leg) => !leg.isComplete);
    }
}
exports.Asset = Asset;
