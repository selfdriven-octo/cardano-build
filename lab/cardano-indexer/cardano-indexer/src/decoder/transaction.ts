import { toHex, safeNumber, blake2b256 } from './cbor';
import { decodeAddress } from './address';
import { logger } from '../config/logger';
import { cborEncode } from '../lib/cbor';

/**
 * Cardano Transaction Decoder
 *
 * Shelley+ transaction body is a CBOR map with keys:
 *   0 = inputs     (set of [txHash, index])
 *   1 = outputs    (list of [address, amount] or [address, [amount, multiasset]])
 *   2 = fee        (coin)
 *   3 = ttl        (slot number, optional in some eras)
 *   4 = certificates
 *   5 = withdrawals
 *   6 = update
 *   7 = metadata hash
 *   8 = validity interval start
 *   9 = mint
 *   11 = script data hash (Alonzo+)
 *   13 = collateral inputs (Alonzo+)
 *   14 = required signers (Alonzo+)
 *   15 = network id (Alonzo+)
 *   16 = collateral return (Babbage+)
 *   17 = total collateral (Babbage+)
 *   18 = reference inputs (Babbage+)
 *
 * Transaction witnesses structure:
 *   0 = vkey witnesses
 *   1 = native scripts
 *   2 = bootstrap witnesses
 *   3 = plutus v1 scripts (Alonzo+)
 *   4 = plutus data (Alonzo+)
 *   5 = redeemers (Alonzo+)
 *   6 = plutus v2 scripts (Babbage+)
 *   7 = plutus v3 scripts (Conway+)
 */

export interface DecodedInput {
  txHash: string;
  outputIndex: number;
}

export interface DecodedOutput {
  address: string;
  amount: number;
  multiAssets: { policyId: string; assetName: string; quantity: number }[];
  datumHash: string | null;
  inlineDatum: string | null;
  scriptRef: string | null;
}

export interface DecodedTransaction {
  txHash: string;
  inputs: DecodedInput[];
  outputs: DecodedOutput[];
  fee: number;
  ttl: number | null;
  size: number;
  validContract: boolean;
}

export function decodeTransaction(txRaw: any, era: number): DecodedTransaction {
  // Transaction structure: [body, witnesses, isValid, metadata]
  // In some eras: [body, witnesses, metadata] (no isValid field)
  let txBody: any;
  let isValid = true;

  if (Array.isArray(txRaw)) {
    txBody = txRaw[0];
    // Alonzo+: 4th element is a boolean for script validity
    if (txRaw.length >= 3 && typeof txRaw[2] === 'boolean') {
      isValid = txRaw[2];
    }
  } else {
    txBody = txRaw;
  }

  // Compute transaction hash from CBOR-encoded body
  const bodyBytes = Buffer.isBuffer(txBody) ? txBody : Buffer.from(cborEncode(txBody));
  const txHash = toHex(blake2b256(bodyBytes));

  // txBody is a Map
  const bodyMap = txBody instanceof Map ? txBody : new Map(Object.entries(txBody));

  // Parse inputs (key 0)
  const rawInputs = bodyMap.get(0) || [];
  const inputs: DecodedInput[] = [];
  if (Array.isArray(rawInputs)) {
    for (const inp of rawInputs) {
      if (Array.isArray(inp) && inp.length >= 2) {
        inputs.push({
          txHash: Buffer.isBuffer(inp[0]) ? toHex(inp[0]) : String(inp[0]),
          outputIndex: safeNumber(inp[1]),
        });
      }
    }
  }

  // Parse outputs (key 1)
  const rawOutputs = bodyMap.get(1) || [];
  const outputs: DecodedOutput[] = [];
  if (Array.isArray(rawOutputs)) {
    for (const out of rawOutputs) {
      outputs.push(decodeOutput(out, era));
    }
  }

  // Fee (key 2)
  const fee = safeNumber(bodyMap.get(2) || 0);

  // TTL (key 3)
  const ttl = bodyMap.has(3) ? safeNumber(bodyMap.get(3)) : null;

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

function decodeOutput(raw: any, era: number): DecodedOutput {
  let address = '';
  let amount = 0;
  let multiAssets: { policyId: string; assetName: string; quantity: number }[] = [];
  let datumHash: string | null = null;
  let inlineDatum: string | null = null;
  let scriptRef: string | null = null;

  if (raw instanceof Map) {
    // Babbage+ post-alonzo output format: Map
    // 0 = address, 1 = value, 2 = datum option, 3 = script ref
    const addrRaw = raw.get(0);
    address = Buffer.isBuffer(addrRaw) ? decodeAddress(addrRaw) : String(addrRaw);

    const value = raw.get(1);
    if (Array.isArray(value)) {
      amount = safeNumber(value[0]);
      multiAssets = decodeMultiAsset(value[1]);
    } else {
      amount = safeNumber(value);
    }

    // Datum option: [0, datumHash] or [1, inlineDatum]
    const datum = raw.get(2);
    if (Array.isArray(datum)) {
      if (datum[0] === 0 && Buffer.isBuffer(datum[1])) {
        datumHash = toHex(datum[1]);
      } else if (datum[0] === 1) {
        inlineDatum = JSON.stringify(datum[1]);
      }
    }

    // Script ref
    const sref = raw.get(3);
    if (sref) {
      scriptRef = Buffer.isBuffer(sref) ? toHex(sref) : JSON.stringify(sref);
    }
  } else if (Array.isArray(raw)) {
    // Pre-Babbage: [address, amount] or [address, [amount, multiasset]]
    // Sometimes: [address, amount, datumHash]
    const addrRaw = raw[0];
    address = Buffer.isBuffer(addrRaw) ? decodeAddress(addrRaw) : String(addrRaw);

    if (Array.isArray(raw[1])) {
      amount = safeNumber(raw[1][0]);
      multiAssets = decodeMultiAsset(raw[1][1]);
    } else {
      amount = safeNumber(raw[1]);
    }

    // Alonzo added datum hash as 3rd element
    if (raw.length >= 3 && Buffer.isBuffer(raw[2])) {
      datumHash = toHex(raw[2]);
    }
  }

  return { address, amount, multiAssets, datumHash, inlineDatum, scriptRef };
}

function decodeMultiAsset(raw: any): { policyId: string; assetName: string; quantity: number }[] {
  const assets: { policyId: string; assetName: string; quantity: number }[] = [];

  if (!raw) return assets;

  const iterate = (map: any) => {
    if (map instanceof Map) {
      for (const [policyId, assetMap] of map) {
        const pid = Buffer.isBuffer(policyId) ? toHex(policyId) : String(policyId);
        if (assetMap instanceof Map) {
          for (const [assetName, quantity] of assetMap) {
            const name = Buffer.isBuffer(assetName) ? toHex(assetName) : String(assetName);
            assets.push({ policyId: pid, assetName: name, quantity: safeNumber(quantity) });
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
export function decodeByronTransaction(txRaw: any): DecodedTransaction {
  const body = Array.isArray(txRaw) ? txRaw[0] : txRaw;
  const bodyBytes = Buffer.from(cborEncode(body));
  const txHash = toHex(blake2b256(bodyBytes));

  const inputs: DecodedInput[] = [];
  const outputs: DecodedOutput[] = [];

  if (Array.isArray(body)) {
    // Inputs: [[type, [txHash, index]], ...]
    const rawInputs = body[0] || [];
    for (const inp of rawInputs) {
      if (Array.isArray(inp) && inp.length >= 2) {
        const inner = Array.isArray(inp[1]) ? inp[1] : inp;
        if (inner.length >= 2) {
          inputs.push({
            txHash: Buffer.isBuffer(inner[0]) ? toHex(inner[0]) : String(inner[0]),
            outputIndex: safeNumber(inner[1]),
          });
        }
      }
    }

    // Outputs: [[address, amount], ...]
    const rawOutputs = body[1] || [];
    for (const out of rawOutputs) {
      if (Array.isArray(out) && out.length >= 2) {
        const addrRaw = out[0];
        const addr = Buffer.isBuffer(addrRaw) ? decodeAddress(addrRaw) : String(addrRaw);
        outputs.push({
          address: addr,
          amount: safeNumber(out[1]),
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
