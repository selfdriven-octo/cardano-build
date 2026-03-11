const { encodeBech32Address } = require("../lib/bech32");
const { toHex } = require("./cbor");
const { logger } = require("../config/logger");
function decodeAddress(raw) {
    if (!raw || raw.length === 0) return 'unknown';
    const bytes = Buffer.from(raw);
    try {
        const headerByte = bytes[0];
        const addrType = headerByte >> 4 & 0x0f;
        const networkId = headerByte & 0x0f;
        if (addrType <= 0x07 || addrType === 0x0e || addrType === 0x0f) {
            const prefix = networkId === 0 ? 'addr_test' : 'addr';
            const stakePrefix = networkId === 0 ? 'stake_test' : 'stake';
            if (addrType === 0x0e || addrType === 0x0f) {
                return encodeBech32Address(stakePrefix, bytes);
            }
            return encodeBech32Address(prefix, bytes);
        }
        if (headerByte === 0x82 || headerByte === 0x83) {
            return `byron_${toHex(bytes).substring(0, 64)}`;
        }
        return toHex(bytes);
    } catch (err) {
        logger.debug(`Address decode error: ${err.message}`);
        return toHex(bytes);
    }
}
function getAddressType(raw) {
    if (raw.length === 0) return 'unknown';
    const addrType = raw[0] >> 4 & 0x0f;
    switch(addrType){
        case 0:
        case 1:
        case 2:
        case 3:
            return 'base';
        case 4:
        case 5:
            return 'pointer';
        case 6:
        case 7:
            return 'enterprise';
        case 0xe:
        case 0xf:
            return 'reward';
        default:
            return 'byron';
    }
}


//# sourceURL=/sessions/trusting-peaceful-mccarthy/mnt/outputs/cardano-indexer/src/decoder/address.ts

exports.decodeAddress = decodeAddress;
exports.getAddressType = getAddressType;
