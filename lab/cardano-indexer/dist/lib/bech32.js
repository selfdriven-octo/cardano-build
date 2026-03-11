const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
function polymod(values) {
    const GEN = [
        0x3b6a57b2,
        0x26508e6d,
        0x1ea119fa,
        0x3d4233dd,
        0x2a1462b3
    ];
    let chk = 1;
    for (const v of values){
        const top = chk >> 25;
        chk = (chk & 0x1ffffff) << 5 ^ v;
        for(let i = 0; i < 5; i++){
            if (top >> i & 1) chk ^= GEN[i];
        }
    }
    return chk;
}
function hrpExpand(hrp) {
    const ret = [];
    for(let i = 0; i < hrp.length; i++){
        ret.push(hrp.charCodeAt(i) >> 5);
    }
    ret.push(0);
    for(let i = 0; i < hrp.length; i++){
        ret.push(hrp.charCodeAt(i) & 31);
    }
    return ret;
}
function createChecksum(hrp, data) {
    const values = hrpExpand(hrp).concat(data).concat([
        0,
        0,
        0,
        0,
        0,
        0
    ]);
    const mod = polymod(values) ^ 1;
    const ret = [];
    for(let i = 0; i < 6; i++){
        ret.push(mod >> 5 * (5 - i) & 31);
    }
    return ret;
}
function bech32Encode(hrp, data5bit, limit = 200) {
    const checksum = createChecksum(hrp, data5bit);
    let result = hrp + '1';
    for (const d of data5bit.concat(checksum)){
        result += CHARSET[d];
    }
    if (result.length > limit) {
        throw new Error(`Bech32 string too long: ${result.length} > ${limit}`);
    }
    return result;
}
function toWords(data) {
    let value = 0;
    let bits = 0;
    const result = [];
    for (const byte of data){
        value = value << 8 | byte;
        bits += 8;
        while(bits >= 5){
            bits -= 5;
            result.push(value >> bits & 31);
        }
    }
    if (bits > 0) {
        result.push(value << 5 - bits & 31);
    }
    return result;
}
function encodeBech32Address(prefix, bytes) {
    try {
        const words = toWords(bytes);
        return bech32Encode(prefix, words);
    } catch  {
        return bytes.toString('hex');
    }
}


//# sourceURL=/sessions/trusting-peaceful-mccarthy/mnt/outputs/cardano-indexer/src/lib/bech32.ts

exports.bech32Encode = bech32Encode;
exports.toWords = toWords;
exports.encodeBech32Address = encodeBech32Address;
