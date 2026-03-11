const crypto = require("crypto");
const { cborDecode: _cborDecode } = require("../lib/cbor");
const { logger } = require("../config/logger");
const ERA_NAMES = {
    0: 'Byron-EBB',
    1: 'Byron',
    2: 'Shelley',
    3: 'Allegra',
    4: 'Mary',
    5: 'Alonzo',
    6: 'Babbage',
    7: 'Conway'
};
function decodeCbor(data) {
    try {
        return _cborDecode(data);
    } catch (err) {
        try {
            const inner = _cborDecode(data);
            if (Buffer.isBuffer(inner)) {
                return _cborDecode(inner);
            }
            return inner;
        } catch  {
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
    if (typeof val === 'number') return val;
    if (typeof val === 'bigint') return Number(val);
    if (Buffer.isBuffer(val)) return val.readUIntBE(0, Math.min(val.length, 6));
    return 0;
}
function safeBigInt(val) {
    if (typeof val === 'bigint') return val;
    if (typeof val === 'number') return BigInt(val);
    return 0n;
}


//# sourceURL=/sessions/trusting-peaceful-mccarthy/mnt/outputs/cardano-indexer/src/decoder/cbor.ts

exports.decodeCbor = decodeCbor;
exports.blake2b256 = blake2b256;
exports.toHex = toHex;
exports.safeNumber = safeNumber;
exports.safeBigInt = safeBigInt;
exports.ERA_NAMES = ERA_NAMES;
