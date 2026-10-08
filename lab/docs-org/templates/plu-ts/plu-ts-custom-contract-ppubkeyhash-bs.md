import { Address, bool, compile, makeValidator, PaymentCredentials, pBool, pfn, Script, ScriptType, V2, PPubKeyHash, bs} from "@harmoniclabs/plu-ts";
import MyRedeemer from "./MyRedeemer";

export const contract = pfn([
    PPubKeyHash.type,
    bs,
    V2.PScriptContext.type
],  bool)
(( datum, redeemer, ctx ) =>
    // always succeeds
    pBool( true )
);


///////////////////////////////////////////////////////////////////
// ------------------------------------------------------------- //
// ------------------------- utilities ------------------------- //
// ------------------------------------------------------------- //
///////////////////////////////////////////////////////////////////

export const untypedValidator = makeValidator( contract );

export const compiledContract = compile( untypedValidator );

export const script = new Script(
    ScriptType.PlutusV2,
    compiledContract
);

export const scriptMainnetAddr = new Address(
    "mainnet",
    new PaymentCredentials(
        "script",
        script.hash
    )
);

export const scriptTestnetAddr = new Address(
    "testnet",
    new PaymentCredentials(
        "script",
        script.hash.clone()
    )
);

export default contract;