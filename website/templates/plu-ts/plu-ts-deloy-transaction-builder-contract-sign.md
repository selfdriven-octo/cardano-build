function signWithServer( tx: Tx ): void
{
    tx.signWith(
        PrivateKey.fromCbor(
            JSON.parse( // the result of `cardano-cli` is a json file
                readFileSync(
                    "path/to/privKey.skey",
                    { encoding: "utf8" }
                ) 
            ).cborHex
        )
    );
}