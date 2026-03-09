import { Multiplexer } from './mux';
import { performHandshake, HandshakeResult } from './handshake';
import { ChainSyncClient } from './chain-sync';
import { BlockFetchClient } from './block-fetch';
import { logger } from '../config/logger';

export interface NodeConnection {
  mux: Multiplexer;
  chainSync: ChainSyncClient;
  blockFetch: BlockFetchClient;
  handshakeResult: HandshakeResult;
  close(): void;
}

/**
 * Connect to a Cardano relay node and perform the handshake.
 * Returns a NodeConnection with ready-to-use ChainSync and BlockFetch clients.
 */
export async function connectToNode(
  host: string,
  port: number,
  networkMagic: number
): Promise<NodeConnection> {
  logger.info(`Connecting to relay node ${host}:${port}...`);

  const mux = new Multiplexer(host, port);
  await mux.connect();

  // Perform handshake
  const handshakeResult = await performHandshake(mux, networkMagic);
  if (!handshakeResult.accepted) {
    mux.close();
    throw new Error(`Handshake rejected: ${handshakeResult.reason}`);
  }

  // Create mini-protocol clients
  const chainSync = new ChainSyncClient(mux);
  const blockFetch = new BlockFetchClient(mux);

  logger.info(`Node connection established (version ${handshakeResult.version})`);

  return {
    mux,
    chainSync,
    blockFetch,
    handshakeResult,
    close() {
      mux.close();
    },
  };
}

/**
 * Try to connect to one of several relay nodes.
 * Returns the first successful connection.
 */
export async function connectToRelay(
  relays: { host: string; port: number }[],
  networkMagic: number
): Promise<NodeConnection> {
  const errors: Error[] = [];

  for (const relay of relays) {
    try {
      return await connectToNode(relay.host, relay.port, networkMagic);
    } catch (err: any) {
      logger.warn(`Failed to connect to ${relay.host}:${relay.port}: ${err.message}`);
      errors.push(err);
    }
  }

  throw new Error(
    `Failed to connect to any relay node. Errors:\n${errors.map(e => e.message).join('\n')}`
  );
}
