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
    multiAssets: {
        policyId: string;
        assetName: string;
        quantity: number;
    }[];
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
export declare function decodeTransaction(txRaw: any, era: number): DecodedTransaction;
/**
 * Decode a Byron-era transaction.
 * Byron txs have a different structure: [[inputs, outputs, attributes], witnesses]
 */
export declare function decodeByronTransaction(txRaw: any): DecodedTransaction;
