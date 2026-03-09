"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeTransaction = decodeTransaction;
exports.decodeByronTransaction = decodeByronTransaction;
const cbor_1 = require("./cbor");
const address_1 = require("./address");
const cbor_2 = require("../lib/cbor");
function decodeTransaction(txRaw, era) {
    // Transaction structure: [body, witnesses, isValid, metadata]
    // In some eras: [body, witnesses, metadata] (no isValid field)
    let txBody;
    let isValid = true;
    if (Array.isArray(txRaw)) {
        txBody = txRaw[0];
        // Alonzo+: 4th element is a boolean for script validity
        if (txRaw.length >= 3 && typeof txRaw[2] === 'boolean') {
            isValid = txRaw[2];
        }
    }
    else {
        txBody = txRaw;
    }
    // Compute transaction hash from CBOR-encoded body
    const bodyBytes = Buffer.isBuffer(txBody) ? txBody : Buffer.from((0, cbor_2.cborEncode)(txBody));
    const txHash = (0, cbor_1.toHex)((0, cbor_1.blake2b256)(bodyBytes));
    // txBody is a Map
    const bodyMap = txBody instanceof Map ? txBody : new Map(Object.entries(txBody));
    // Parse inputs (key 0)
    const rawInputs = bodyMap.get(0) || [];
    const inputs = [];
    if (Array.isArray(rawInputs)) {
        for (const inp of rawInputs) {
            if (Array.isArray(inp) && inp.length >= 2) {
                inputs.push({
                    txHash: Buffer.isBuffer(inp[0]) ? (0, cbor_1.toHex)(inp[0]) : String(inp[0]),
                    outputIndex: (0, cbor_1.safeNumber)(inp[1]),
                });
            }
        }
    }
    // Parse outputs (key 1)
    const rawOutputs = bodyMap.get(1) || [];
    const outputs = [];
    if (Array.isArray(rawOutputs)) {
        for (const out of rawOutputs) {
            outputs.push(decodeOutput(out, era));
        }
    }
    // Fee (key 2)
    const fee = (0, cbor_1.safeNumber)(bodyMap.get(2) || 0);
    // TTL (key 3)
    const ttl = bodyMap.has(3) ? (0, cbor_1.safeNumber)(bodyMap.get(3)) : null;
    return {
        txHash,
        inputs,
        outputs,
        fee,
        ttl,
        size: bodyBytes.length,
        validContract: isValid,
    };
}
function decodeOutput(raw, era) {
    let address = '';
    let amount = 0;
    let multiAssets = [];
    let datumHash = null;
    let inlineDatum = null;
    let scriptRef = null;
    if (raw instanceof Map) {
        // Babbage+ post-alonzo output format: Map
        // 0 = address, 1 = value, 2 = datum option, 3 = script ref
        const addrRaw = raw.get(0);
        address = Buffer.isBuffer(addrRaw) ? (0, address_1.decodeAddress)(addrRaw) : String(addrRaw);
        const value = raw.get(1);
        if (Array.isArray(value)) {
            amount = (0, cbor_1.safeNumber)(value[0]);
            multiAssets = decodeMultiAsset(value[1]);
        }
        else {
            amount = (0, cbor_1.safeNumber)(value);
        }
        // Datum option: [0, datumHash] or [1, inlineDatum]
        const datum = raw.get(2);
        if (Array.isArray(datum)) {
            if (datum[0] === 0 && Buffer.isBuffer(datum[1])) {
                datumHash = (0, cbor_1.toHex)(datum[1]);
            }
            else if (datum[0] === 1) {
                inlineDatum = JSON.stringify(datum[1]);
            }
        }
        // Script ref
        const sref = raw.get(3);
        if (sref) {
            scriptRef = Buffer.isBuffer(sref) ? (0, cbor_1.toHex)(sref) : JSON.stringify(sref);
        }
    }
    else if (Array.isArray(raw)) {
        // Pre-Babbage: [address, amount] or [address, [amount, multiasset]]
        // Sometimes: [address, amount, datumHash]
        const addrRaw = raw[0];
        address = Buffer.isBuffer(addrRaw) ? (0, address_1.decodeAddress)(addrRaw) : String(addrRaw);
        if (Array.isArray(raw[1])) {
            amount = (0, cbor_1.safeNumber)(raw[1][0]);
            multiAssets = decodeMultiAsset(raw[1][1]);
        }
        else {
            amount = (0, cbor_1.safeNumber)(raw[1]);
        }
        // Alonzo added datum hash as 3rd element
        if (raw.length >= 3 && Buffer.isBuffer(raw[2])) {
            datumHash = (0, cbor_1.toHex)(raw[2]);
        }
    }
    return { address, amount, multiAssets, datumHash, inlineDatum, scriptRef };
}
function decodeMultiAsset(raw) {
    const assets = [];
    if (!raw)
        return assets;
    const iterate = (map) => {
        if (map instanceof Map) {
            for (const [policyId, assetMap] of map) {
                const pid = Buffer.isBuffer(policyId) ? (0, cbor_1.toHex)(policyId) : String(policyId);
                if (assetMap instanceof Map) {
                    for (const [assetName, quantity] of assetMap) {
                        const name = Buffer.isBuffer(assetName) ? (0, cbor_1.toHex)(assetName) : String(assetName);
                        assets.push({ policyId: pid, assetName: name, quantity: (0, cbor_1.safeNumber)(quantity) });
                    }
                }
            }
        }
    };
    iterate(raw);
    return assets;
}
/**
 * Decode a Byron-era transaction.
 * Byron txs have a different structure: [[inputs, outputs, attributes], witnesses]
 */
function decodeByronTransaction(txRaw) {
    const body = Array.isArray(txRaw) ? txRaw[0] : txRaw;
    const bodyBytes = Buffer.from((0, cbor_2.cborEncode)(body));
    const txHash = (0, cbor_1.toHex)((0, cbor_1.blake2b256)(bodyBytes));
    const inputs = [];
    const outputs = [];
    if (Array.isArray(body)) {
        // Inputs: [[type, [txHash, index]], ...]
        const rawInputs = body[0] || [];
        for (const inp of rawInputs) {
            if (Array.isArray(inp) && inp.length >= 2) {
                const inner = Array.isArray(inp[1]) ? inp[1] : inp;
                if (inner.length >= 2) {
                    inputs.push({
                        txHash: Buffer.isBuffer(inner[0]) ? (0, cbor_1.toHex)(inner[0]) : String(inner[0]),
                        outputIndex: (0, cbor_1.safeNumber)(inner[1]),
                    });
                }
            }
        }
        // Outputs: [[address, amount], ...]
        const rawOutputs = body[1] || [];
        for (const out of rawOutputs) {
            if (Array.isArray(out) && out.length >= 2) {
                const addrRaw = out[0];
                const addr = Buffer.isBuffer(addrRaw) ? (0, address_1.decodeAddress)(addrRaw) : String(addrRaw);
                outputs.push({
                    address: addr,
                    amount: (0, cbor_1.safeNumber)(out[1]),
                    multiAssets: [],
                    datumHash: null,
                    inlineDatum: null,
                    scriptRef: null,
                });
            }
        }
    }
    return {
        txHash,
        inputs,
        outputs,
        fee: 0, // Byron fee calculated differently
        ttl: null,
        size: bodyBytes.length,
        validContract: true,
    };
}
//# sourceMappingURL=transaction.js.map