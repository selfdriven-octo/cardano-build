import { script } from "./contract";
import { koios } from "./offchain/koios"

console.log("validator compiled succesfully! 🎉\n");
console.log(
    JSON.stringify(
        script.toJson(),
        undefined,
        2
    )
);

/* onther imports */


/* ... */

async function main()
{
    let tx = await getDeployAndFoundTx( script );
    signWithServer( tx );
    await koios.tx.submit( tx );
}
main();