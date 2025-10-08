import type { UTxO } from "@harmoniclabs/plu-ts"
import { koios } from "./koios";

export default async function queryMyUtxos(): Promise<UTxO[]>
{
    return await koios.address.utxos( "<paste your tesnet address here>" )
}