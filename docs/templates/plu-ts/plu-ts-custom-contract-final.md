import { Address, bool, compile, makeValidator, PaymentCredentials, pBool, pfn, Script, ScriptType, V2, PPubKeyHash, bs} from "@harmoniclabs/plu-ts";
import MyRedeemer from "./MyRedeemer";

export const contract = pfn([
    PPubKeyHash.type,
    bs,
    V2.PScriptContext.type
],  bool)
(( owner, message, ctx ) => {

    const isBeingPolite = message.eq("Hello plu-ts");

    const signedByOwner = ctx.tx.signatories.some( owner.eqTerm );

    return isBeingPolite.and( signedByOwner );
});

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