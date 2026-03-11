const { toHex, safeNumber, blake2b256 } = require("./cbor");
const { decodeAddress } = require("./address");
const { logger } = require("../config/logger");
const { cborEncode } = require("../lib/cbor");
function decodeTransaction(txRaw, era) {
    let txBody;
    let isValid = true;
    if (Array.isArray(txRaw)) {
        txBody = txRaw[0];
        if (txRaw.length >= 3 && typeof txRaw[2] === 'boolean') {
            isValid = txRaw[2];
        }
    } else {
        txBody = txRaw;
    }
    const bodyBytes = Buffer.isBuffer(txBody) ? txBody : Buffer.from(cborEncode(txBody));
    const txHash = toHex(blake2b256(bodyBytes));
    const bodyMap = txBody instanceof Map ? txBody : new Map(Object.entries(txBody));
    const rawInputs = bodyMap.get(0) || [];
    const inputs = [];
    if (Array.isArray(rawInputs)) {
        for (const inp of rawInputs){
            if (Array.isArray(inp) && inp.length >= 2) {
                inputs.push({
                    txHash: Buffer.isBuffer(inp[0]) ? toHex(inp[0]) : String(inp[0]),
                    outputIndex: safeNumber(inp[1])
                });
            }
        }
    }
    const rawOutputs = bodyMap.get(1) || [];
    const outputs = [];
    if (Array.isArray(rawOutputs)) {
        for (const out of rawOutputs){
            outputs.push(decodeOutput(out, era));
        }
    }
    const fee = safeNumber(bodyMap.get(2) || 0);
    const ttl = bodyMap.has(3) ? safeNumber(bodyMap.get(3)) : null;
    return {
        txHash,
        inputs,
        outputs,
        fee,
        ttl,
        size: bodyBytes.length,
        validContract: isValid
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
        const addrRaw = raw.get(0);
        address = Buffer.isBuffer(addrRaw) ? decodeAddress(addrRaw) : String(addrRaw);
        const value = raw.get(1);
        if (Array.isArray(value)) {
            amount = safeNumber(value[0]);
            multiAssets = decodeMultiAsset(value[1]);
        } else {
            amount = safeNumber(value);
        }
        const datum = raw.get(2);
        if (Array.isArray(datum)) {
            if (datum[0] === 0 && Buffer.isBuffer(datum[1])) {
                datumHash = toHex(datum[1]);
            } else if (datum[0] === 1) {
                inlineDatum = JSON.stringify(datum[1]);
            }
        }
        const sref = raw.get(3);
        if (sref) {
            scriptRef = Buffer.isBuffer(sref) ? toHex(sref) : JSON.stringify(sref);
        }
    } else if (Array.isArray(raw)) {
        const addrRaw = raw[0];
        address = Buffer.isBuffer(addrRaw) ? decodeAddress(addrRaw) : String(addrRaw);
        if (Array.isArray(raw[1])) {
            amount = safeNumber(raw[1][0]);
            multiAssets = decodeMultiAsset(raw[1][1]);
        } else {
            amount = safeNumber(raw[1]);
        }
        if (raw.length >= 3 && Buffer.isBuffer(raw[2])) {
            datumHash = toHex(raw[2]);
        }
    }
    return {
        address,
        amount,
        multiAssets,
        datumHash,
        inlineDatum,
        scriptRef
    };
}
function decodeMultiAsset(raw) {
    const assets = [];
    if (!raw) return assets;
    const iterate = (map)=>{
        if (map instanceof Map) {
            for (const [policyId, assetMap] of map){
                const pid = Buffer.isBuffer(policyId) ? toHex(policyId) : String(policyId);
                if (assetMap instanceof Map) {
                    for (const [assetName, quantity] of assetMap){
                        const name = Buffer.isBuffer(assetName) ? toHex(assetName) : String(assetName);
                        assets.push({
                            policyId: pid,
                            assetName: name,
                            quantity: safeNumber(quantity)
                        });
                    }
                }
            }
        }
    };
    iterate(raw);
    return assets;
}
function decodeByronTransaction(txRaw) {
    const body = Array.isArray(txRaw) ? txRaw[0] : txRaw;
    const bodyBytes = Buffer.from(cborEncode(body));
    const txHash = toHex(blake2b256(bodyBytes));
    const inputs = [];
    const outputs = [];
    if (Array.isArray(body)) {
        const rawInputs = body[0] || [];
        for (const inp of rawInputs){
            if (Array.isArray(inp) && inp.length >= 2) {
                const inner = Array.isArray(inp[1]) ? inp[1] : inp;
                if (inner.length >= 2) {
                    inputs.push({
                        txHash: Buffer.isBuffer(inner[0]) ? toHex(inner[0]) : String(inner[0]),
                        outputIndex: safeNumber(inner[1])
                    });
                }
            }
        }
        const rawOutputs = body[1] || [];
        for (const out of rawOutputs){
            if (Array.isArray(out) && out.length >= 2) {
                const addrRaw = out[0];
                const addr = Buffer.isBuffer(addrRaw) ? decodeAddress(addrRaw) : String(addrRaw);
                outputs.push({
                    address: addr,
                    amount: safeNumber(out[1]),
                    multiAssets: [],
                    datumHash: null,
                    inlineDatum: null,
                    scriptRef: null
                });
            }
        }
    }
    return {
        txHash,
        inputs,
        outputs,
        fee: 0,
        ttl: null,
        size: bodyBytes.length,
        validContract: true
    };
}


//# sourceURL=/sessions/trusting-peaceful-mccarthy/mnt/outputs/cardano-indexer/src/decoder/transaction.ts

exports.decodeTransaction = decodeTransaction;
exports.decodeByronTransaction = decodeByronTransaction;
