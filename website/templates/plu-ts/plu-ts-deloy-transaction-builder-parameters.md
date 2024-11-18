import { koios } from "./koios"

/**
 * we don't want to do too many API call if we already have our `txBuilder`
 * 
 * so after the first call we'll store a copy here.
**/
let _cachedTxBuilder: TxBuilder | undefined = undefined

export default async function getTxBuilder(): Promise<TxBuilder>
{
    if(!( _cachedTxBuilder instanceof TxBuilder ))
    _cachedTxBuilder = new TxBuilder(
        "testnet",
        await koios.epoch.protocolParams() // defaults to current epoch
    );

    return _cachedTxBuilder;
}