"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERA_NAMES = void 0;
exports.decodeCbor = decodeCbor;
exports.blake2b256 = blake2b256;
exports.toHex = toHex;
exports.safeNumber = safeNumber;
exports.safeBigInt = safeBigInt;
const crypto = __importStar(require("crypto"));
const cbor_1 = require("../lib/cbor");
/**
 * CBOR utility functions for Cardano block decoding.
 *
 * Cardano blocks use a tagged CBOR encoding. The top-level structure
 * wraps an era-specific block in a 2-element array: [eraId, blockBody].
 *
 * Era IDs:
 *   0 = Byron EBB (Epoch Boundary Block)
 *   1 = Byron regular block
 *   2 = Shelley
 *   3 = Allegra
 *   4 = Mary
 *   5 = Alonzo
 *   6 = Babbage
 *   7 = Conway
 */
exports.ERA_NAMES = {
    0: 'Byron-EBB',
    1: 'Byron',
    2: 'Shelley',
    3: 'Allegra',
    4: 'Mary',
    5: 'Alonzo',
    6: 'Babbage',
    7: 'Conway',
};
function decodeCbor(data) {
    try {
        return (0, cbor_1.cborDecode)(data);
    }
    catch (err) {
        // Sometimes blocks are double-wrapped
        try {
            const inner = (0, cbor_1.cborDecode)(data);
            if (Buffer.isBuffer(inner)) {
                return (0, cbor_1.cborDecode)(inner);
            }
            return inner;
        }
        catch {
            throw new Error(`CBOR decode failed: ${err.message}`);
        }
    }
}
function blake2b256(data) {
    return crypto.createHash('blake2b512').update(data).digest().subarray(0, 32);
}
function toHex(buf) {
    return Buffer.from(buf).toString('hex');
}
function safeNumber(val) {
    if (typeof val === 'number')
        return val;
    if (typeof val === 'bigint')
        return Number(val);
    if (Buffer.isBuffer(val))
        return val.readUIntBE(0, Math.min(val.length, 6));
    return 0;
}
function safeBigInt(val) {
    if (typeof val === 'bigint')
        return val;
    if (typeof val === 'number')
        return BigInt(val);
    return 0n;
}
//# sourceMappingURL=cbor.js.map