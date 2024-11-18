import { Address, Value, DataB, Script, Tx } from "@harmoniclabs/plu-ts"
import { scriptTestnetAddr } from "../contract";
import getTxBuilder from "./getTxBuilder";
import queryMyUtxos from "./queryMyUtxos";


export default async function getDeployAndFoundTx( script: Script ): Promise<Tx>
{
    const txBuilder = await getTxBuilder();
    const myUTxOs = await queryMyUtxos();

    return txBuilder.buildSync({
        inputs: [{ utxo: myUTxOs[0] }],
        outputs: [
            { // output which holds the reference script
                address: scriptTestnetAddr,
                value: Value.lovelaces( 10_000_000 ),
                // an utxo with no datum that sits 
                // that a script address (like in this case)
                // is locked FOREVER
                // this way no one will be able to "un-deploy" our smart contract
                datum: undefined,
                refScript: script
            },
            { // output holding the founds that we'll spend later
                address: scriptTestnetAddr,
                value: Value.lovelaces( 10_000_000 ),
                // remeber to include a datum
                datum: new DataB(
                    // remember we set the datum to be the public key hash?
                    // we can extract it from the address as follows

                    // first create an address form the bech32 form
                    Address.fromString( "<paste your address here>" )
                    // then extract the pyament credential hash
                    .paymentCreds.hash.toBuffer()
                )
            }
        ],
        // send everything left back to us
        changeAddress: "<paste your address here>"
    });
}