const MT_UINT = 0;
const MT_NEGINT = 1;
const MT_BYTES = 2;
const MT_TEXT = 3;
const MT_ARRAY = 4;
const MT_MAP = 5;
const MT_TAG = 6;
const MT_SIMPLE = 7;
function cborDecode(data, offset = 0) {
    const result = cborDecodeItem(data, offset);
    return result.value;
}
function cborDecodeWithPosition(data, offset = 0) {
    return cborDecodeItem(data, offset);
}
function cborDecodeItem(data, offset) {
    if (offset >= data.length) throw new Error('CBOR: unexpected end of data');
    const initial = data[offset];
    const majorType = initial >> 5;
    const additionalInfo = initial & 0x1f;
    switch(majorType){
        case MT_UINT:
            return decodeUint(data, offset);
        case MT_NEGINT:
            {
                const r = decodeUint(data, offset);
                r.value = -1 - r.value;
                return r;
            }
        case MT_BYTES:
            return decodeBytes(data, offset);
        case MT_TEXT:
            return decodeText(data, offset);
        case MT_ARRAY:
            return decodeArray(data, offset);
        case MT_MAP:
            return decodeMap(data, offset);
        case MT_TAG:
            return decodeTag(data, offset);
        case MT_SIMPLE:
            return decodeSimple(data, offset);
        default:
            throw new Error(`CBOR: unknown major type ${majorType} at offset ${offset}`);
    }
}
function readArgument(data, offset) {
    const additionalInfo = data[offset] & 0x1f;
    offset++;
    if (additionalInfo < 24) {
        return {
            value: additionalInfo,
            newOffset: offset
        };
    } else if (additionalInfo === 24) {
        return {
            value: data[offset],
            newOffset: offset + 1
        };
    } else if (additionalInfo === 25) {
        return {
            value: data.readUInt16BE(offset),
            newOffset: offset + 2
        };
    } else if (additionalInfo === 26) {
        return {
            value: data.readUInt32BE(offset),
            newOffset: offset + 4
        };
    } else if (additionalInfo === 27) {
        const hi = data.readUInt32BE(offset);
        const lo = data.readUInt32BE(offset + 4);
        const val = hi * 0x100000000 + lo;
        return {
            value: val,
            newOffset: offset + 8
        };
    } else if (additionalInfo === 31) {
        return {
            value: -1,
            newOffset: offset
        };
    }
    throw new Error(`CBOR: invalid additional info ${additionalInfo}`);
}
function decodeUint(data, offset) {
    const { value, newOffset } = readArgument(data, offset);
    return {
        value,
        offset: newOffset
    };
}
function decodeBytes(data, offset) {
    const { value: len, newOffset } = readArgument(data, offset);
    if (len === -1) {
        let result = Buffer.alloc(0);
        let off = newOffset;
        while(data[off] !== 0xff){
            const chunk = cborDecodeItem(data, off);
            result = Buffer.concat([
                result,
                chunk.value
            ]);
            off = chunk.offset;
        }
        return {
            value: result,
            offset: off + 1
        };
    }
    const bytes = data.subarray(newOffset, newOffset + len);
    return {
        value: Buffer.from(bytes),
        offset: newOffset + len
    };
}
function decodeText(data, offset) {
    const { value: len, newOffset } = readArgument(data, offset);
    if (len === -1) {
        let result = '';
        let off = newOffset;
        while(data[off] !== 0xff){
            const chunk = cborDecodeItem(data, off);
            result += chunk.value;
            off = chunk.offset;
        }
        return {
            value: result,
            offset: off + 1
        };
    }
    const text = data.subarray(newOffset, newOffset + len).toString('utf-8');
    return {
        value: text,
        offset: newOffset + len
    };
}
function decodeArray(data, offset) {
    const { value: len, newOffset } = readArgument(data, offset);
    const items = [];
    let off = newOffset;
    if (len === -1) {
        while(data[off] !== 0xff){
            const item = cborDecodeItem(data, off);
            items.push(item.value);
            off = item.offset;
        }
        return {
            value: items,
            offset: off + 1
        };
    }
    for(let i = 0; i < len; i++){
        const item = cborDecodeItem(data, off);
        items.push(item.value);
        off = item.offset;
    }
    return {
        value: items,
        offset: off
    };
}
function decodeMap(data, offset) {
    const { value: len, newOffset } = readArgument(data, offset);
    const map = new Map();
    let off = newOffset;
    if (len === -1) {
        while(data[off] !== 0xff){
            const key = cborDecodeItem(data, off);
            const val = cborDecodeItem(data, key.offset);
            map.set(key.value, val.value);
            off = val.offset;
        }
        return {
            value: map,
            offset: off + 1
        };
    }
    for(let i = 0; i < len; i++){
        const key = cborDecodeItem(data, off);
        const val = cborDecodeItem(data, key.offset);
        map.set(key.value, val.value);
        off = val.offset;
    }
    return {
        value: map,
        offset: off
    };
}
function decodeTag(data, offset) {
    const { value: tag, newOffset } = readArgument(data, offset);
    const content = cborDecodeItem(data, newOffset);
    return content;
}
function decodeSimple(data, offset) {
    const additionalInfo = data[offset] & 0x1f;
    if (additionalInfo === 20) return {
        value: false,
        offset: offset + 1
    };
    if (additionalInfo === 21) return {
        value: true,
        offset: offset + 1
    };
    if (additionalInfo === 22) return {
        value: null,
        offset: offset + 1
    };
    if (additionalInfo === 23) return {
        value: undefined,
        offset: offset + 1
    };
    if (additionalInfo === 25) {
        const half = data.readUInt16BE(offset + 1);
        return {
            value: decodeFloat16(half),
            offset: offset + 3
        };
    }
    if (additionalInfo === 26) {
        return {
            value: data.readFloatBE(offset + 1),
            offset: offset + 5
        };
    }
    if (additionalInfo === 27) {
        return {
            value: data.readDoubleBE(offset + 1),
            offset: offset + 9
        };
    }
    if (additionalInfo === 24) {
        return {
            value: data[offset + 1],
            offset: offset + 2
        };
    }
    return {
        value: additionalInfo,
        offset: offset + 1
    };
}
function decodeFloat16(half) {
    const exp = half >> 10 & 0x1f;
    const mant = half & 0x3ff;
    const sign = half & 0x8000 ? -1 : 1;
    if (exp === 0) return sign * 5.960464477539063e-8 * mant;
    if (exp === 31) return mant ? NaN : sign * Infinity;
    return sign * Math.pow(2, exp - 15) * (1 + mant / 1024);
}
function cborEncode(value) {
    const chunks = [];
    encodeValue(value, chunks);
    return Buffer.concat(chunks);
}
function encodeValue(value, chunks) {
    if (value === null || value === undefined) {
        chunks.push(Buffer.from([
            0xf6
        ]));
        return;
    }
    if (typeof value === 'boolean') {
        chunks.push(Buffer.from([
            value ? 0xf5 : 0xf4
        ]));
        return;
    }
    if (typeof value === 'number') {
        if (Number.isInteger(value)) {
            if (value >= 0) {
                encodeUint(MT_UINT, value, chunks);
            } else {
                encodeUint(MT_NEGINT, -1 - value, chunks);
            }
        } else {
            const buf = Buffer.alloc(9);
            buf[0] = 0xfb;
            buf.writeDoubleBE(value, 1);
            chunks.push(buf);
        }
        return;
    }
    if (typeof value === 'string') {
        const strBuf = Buffer.from(value, 'utf-8');
        encodeUint(MT_TEXT, strBuf.length, chunks);
        chunks.push(strBuf);
        return;
    }
    if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
        const buf = Buffer.from(value);
        encodeUint(MT_BYTES, buf.length, chunks);
        chunks.push(buf);
        return;
    }
    if (Array.isArray(value)) {
        encodeUint(MT_ARRAY, value.length, chunks);
        for (const item of value){
            encodeValue(item, chunks);
        }
        return;
    }
    if (value instanceof Map) {
        encodeUint(MT_MAP, value.size, chunks);
        for (const [k, v] of value){
            encodeValue(k, chunks);
            encodeValue(v, chunks);
        }
        return;
    }
    if (typeof value === 'object') {
        const keys = Object.keys(value);
        encodeUint(MT_MAP, keys.length, chunks);
        for (const k of keys){
            encodeValue(k, chunks);
            encodeValue(value[k], chunks);
        }
        return;
    }
    throw new Error(`CBOR: cannot encode ${typeof value}`);
}
function encodeUint(majorType, value, chunks) {
    const mt = majorType << 5;
    if (value < 24) {
        chunks.push(Buffer.from([
            mt | value
        ]));
    } else if (value < 256) {
        chunks.push(Buffer.from([
            mt | 24,
            value
        ]));
    } else if (value < 65536) {
        const buf = Buffer.alloc(3);
        buf[0] = mt | 25;
        buf.writeUInt16BE(value, 1);
        chunks.push(buf);
    } else if (value < 0x100000000) {
        const buf = Buffer.alloc(5);
        buf[0] = mt | 26;
        buf.writeUInt32BE(value, 1);
        chunks.push(buf);
    } else {
        const buf = Buffer.alloc(9);
        buf[0] = mt | 27;
        const hi = Math.floor(value / 0x100000000);
        const lo = value % 0x100000000;
        buf.writeUInt32BE(hi, 1);
        buf.writeUInt32BE(lo, 5);
        chunks.push(buf);
    }
}


//# sourceURL=/sessions/trusting-peaceful-mccarthy/mnt/outputs/cardano-indexer/src/lib/cbor.ts

exports.cborDecode = cborDecode;
exports.cborDecodeWithPosition = cborDecodeWithPosition;
exports.cborEncode = cborEncode;
