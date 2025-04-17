import {
  Backstop,
  BackstopPool,
  BackstopPoolUser,
  BackstopPoolV1,
  BackstopPoolV2,
  ErrorTypes,
  getOracleDecimals,
  Network,
  Pool,
  poolEventV1FromEventResponse,
  poolEventV2FromEventResponse,
  PoolMetadata,
  PoolOracle,
  PoolUser,
  PoolV1,
  PoolV1Event,
  PoolV2,
  PoolV2Event,
  Positions,
  TokenMetadata,
  UserBalance,
  Version,
} from '@blend-capital/blend-sdk';
import {
  Account,
  Address,
  Asset,
  BASE_FEE,
  Horizon,
  rpc,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';
import {
  keepPreviousData,
  useQueries,
  useQuery,
  useQueryClient,
  UseQueryOptions,
  UseQueryResult,
} from '@tanstack/react-query';
import { useSettings } from '../contexts';
import { useWallet } from '../contexts/wallet';
import { getTokenMetadataFromTOML } from '../external/stellar-toml';
import { getTokenBalance } from '../external/token';
import { getOraclePrices } from '../utils/stellar_rpc';
import { ReserveTokenMetadata } from '../utils/token';
import { NOT_BLEND_POOL_ERROR_MESSAGE, PoolMeta } from './types';

const DEFAULT_STALE_TIME = 30 * 1000;
const USER_STALE_TIME = 60 * 1000;
const BACKSTOP_ID = process.env.NEXT_PUBLIC_BACKSTOP || '';
const BACKSTOP_ID_V2 = process.env.NEXT_PUBLIC_BACKSTOP_V2 || '';
const ORACLE_PRICE_FETCHER = process.env.NEXT_PUBLIC_ORACLE_PRICE_FETCHER;

//********** Query Client Data **********//

export function useQueryClientCacheCleaner(): {
  cleanWalletCache: () => void;
  cleanBackstopCache: () => void;
  cleanPoolCache: (poolId: string) => void;
  cleanBackstopPoolCache: (poolId: string) => void;
} {
  const queryClient = useQueryClient();

  const cleanWalletCache = () => {
    queryClient.invalidateQueries({
      predicate: (query) =>
        query.queryKey[0] === 'balance' ||
        query.queryKey[0] === 'account' ||
        query.queryKey[0] === 'sim',
    });

    // Re-invalide the balance and account queries to ensure they are re-fetched after Horizon is updated
    // This is a temporary solution until we have a better way to handle delayed Horizon updates
    setTimeout(() => {
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'balance' || query.queryKey[0] === 'account',
      });
    }, 1000);
  };

  const cleanBackstopCache = () => {
    queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] === 'backstop',
    });
  };

  const cleanPoolCache = (poolId: string) => {
    queryClient.invalidateQueries({
      predicate: (query) =>
        (query.queryKey[0] === 'pool' || query.queryKey[0] === 'poolPositions') &&
        query.queryKey[1] === poolId,
    });
  };

  const cleanBackstopPoolCache = (poolId: string) => {
    cleanBackstopCache();
    queryClient.invalidateQueries({
      predicate: (query) =>
        (query.queryKey[0] === 'backstopPool' || query.queryKey[0] === 'backstopPoolUser') &&
        query.queryKey[1] === poolId,
    });
  };

  return { cleanWalletCache, cleanBackstopCache, cleanPoolCache, cleanBackstopPoolCache };
}

//********** Chain Data **********//

/**
 * Fetches the current block number from the RPC server.
 * @returns Query result with the current block number.
 */
export function useCurrentBlockNumber(): UseQueryResult<number, Error> {
  const { getRPCServer } = useSettings();
  return useQuery({
    staleTime: 5 * 1000,
    queryKey: ['blockNumber'],
    queryFn: async () => {
      const rpc = getRPCServer();
      const data = await rpc.getLatestLedger();
      return data.sequence;
    },
  });
}

//********** Pool Data **********//

export function usePoolMeta(
  poolId: string,
  enabled: boolean = true
): UseQueryResult<PoolMeta, Error> {
  const { network } = useSettings();

  return useQuery({
    staleTime: Infinity,
    queryKey: ['poolMetadata', poolId],
    enabled: enabled && poolId !== '',
    queryFn: async () => {
      try {
        let metadata = await PoolMetadata.load(network, poolId);
        if (
          metadata.wasmHash === 'baf978f10efdbcd85747868bef8832845ea6809f7643b67a4ac0cd669327fc2c'
        ) {
          // v1 pool - validate backstop is correct
          if (metadata.backstop === BACKSTOP_ID) {
            return { id: poolId, version: Version.V1, ...metadata } as PoolMeta;
          }
        } else if (
          metadata.wasmHash === 'a41fc53d6753b6c04eb15b021c55052366a4c8e0e21bc72700f461264ec1350e'
        ) {
          // v2 pool - validate backstop is correct
          if (metadata.backstop === BACKSTOP_ID_V2) {
            return { id: poolId, version: Version.V2, ...metadata } as PoolMeta;
          }
        }
        throw new Error(NOT_BLEND_POOL_ERROR_MESSAGE);
      } catch (e: any) {
        if (e?.message?.includes(ErrorTypes.LedgerEntryParseError)) {
          throw new Error(NOT_BLEND_POOL_ERROR_MESSAGE);
        } else {
          console.error('Error fetching pool metadata', e);
        }
        throw e;
      }
    },
    retry: (failureCount, error) => {
      if (error?.message === NOT_BLEND_POOL_ERROR_MESSAGE) {
        // Do not retry if this is not a blend pool
        return false;
      }
      return failureCount < 3;
    },
  });
}

/**
 * Fetches pool data for the given pool ID.
 * @param poolId - The pool ID
 * @param enabled - Whether the query is enabled (optional - defaults to true)
 * @returns Query result with the pool data.
 */
export function usePool(
  poolMeta: PoolMeta | undefined,
  enabled: boolean = true
): UseQueryResult<Pool, Error> {
  const { network } = useSettings();
  return useQuery({
    staleTime: DEFAULT_STALE_TIME,
    queryKey: ['pool', poolMeta?.id],
    enabled: enabled && poolMeta !== undefined,
    queryFn: async () => {
      if (poolMeta !== undefined) {
        try {
          if (poolMeta.version === Version.V2) {
            return await PoolV2.loadWithMetadata(network, poolMeta.id, poolMeta);
          } else {
            return await PoolV1.loadWithMetadata(network, poolMeta.id, poolMeta);
          }
        } catch (e: any) {
          console.error('Error fetching pool data', e);
          throw e;
        }
      }
    },
  });
}

/**
 * Fetch the oracle data for the given pool.
 * @param pool - The pool
 * @param enabled - Whether the query is enabled (optional - defaults to true)
 * @returns Query result with the oracle data.
 */
export function usePoolOracle(
  pool: Pool | undefined,
  enabled: boolean = true
): UseQueryResult<PoolOracle, Error> {
  const { network } = useSettings();
  return useQuery({
    staleTime: DEFAULT_STALE_TIME,
    queryKey: ['poolOracle', pool?.id],
    enabled: pool !== undefined && enabled,
    queryFn: async () => {
      if (pool !== undefined) {
        if (ORACLE_PRICE_FETCHER !== undefined) {
          const { decimals, latestLedger } = await getOracleDecimals(network, pool.metadata.oracle);
          const prices = await getOraclePrices(
            network,
            ORACLE_PRICE_FETCHER,
            pool.metadata.oracle,
            pool.metadata.reserveList
          );
          return new PoolOracle(pool.metadata.oracle, prices, decimals, latestLedger);
        } else {
          return await pool.loadOracle();
        }
      }
    },
    retry: 1,
    retryDelay: 1000,
  });
}

/**
 * Fetch the user for the given pool and connected wallet.
 * @param poolId - The pool ID
 * @param enabled - Whether the query is enabled (optional - defaults to true)
 * @returns Query result with the user positions.
 */
export function usePoolUser(
  pool: Pool | undefined,
  enabled: boolean = true
): UseQueryResult<PoolUser, Error> {
  const { walletAddress, connected } = useWallet();
  return useQuery({
    staleTime: USER_STALE_TIME,
    queryKey: ['poolPositions', pool?.id, walletAddress],
    enabled: enabled && pool !== undefined && connected,
    placeholderData: new PoolUser(
      walletAddress,
      new Positions(new Map(), new Map(), new Map()),
      new Map()
    ),
    queryFn: async () => {
      if (pool !== undefined && walletAddress !== '') {
        return await pool.loadUser(walletAddress);
      }
    },
  });
}

//********** Backstop Data **********//

/**
 * Fetches the backstop data.
 * @param enabled - Whether the query is enabled (optional - defaults to true)
 * @returns Query result with the backstop data.
 */
export function useBackstop(
  version: Version | undefined,
  enabled: boolean = true
): UseQueryResult<Backstop, Error> {
  const { network } = useSettings();
  return useQuery({
    staleTime: DEFAULT_STALE_TIME,
    queryKey: ['backstop', version],
    enabled: enabled && version !== undefined,
    queryFn: async () => {
      return await Backstop.load(network, version === Version.V2 ? BACKSTOP_ID_V2 : BACKSTOP_ID);
    },
  });
}

/**
 * Fetch the backstop pool data for the given pool ID.
 * @param poolMeta - The pool metadata
 * @param enabled - Whether the query is enabled (optional - defaults to true)
 * @returns Query result with the backstop pool data.
 */
export function useBackstopPool(
  poolMeta: PoolMeta | undefined,
  enabled: boolean = true
): UseQueryResult<BackstopPool, Error> {
  const { network } = useSettings();
  return useQuery({
    staleTime: DEFAULT_STALE_TIME,
    queryKey: ['backstopPool', poolMeta?.id],
    enabled: enabled && poolMeta !== undefined,
    queryFn: async () => {
      if (poolMeta !== undefined) {
        return poolMeta.version === Version.V2
          ? await BackstopPoolV2.load(network, BACKSTOP_ID_V2, poolMeta.id)
          : await BackstopPoolV1.load(network, BACKSTOP_ID, poolMeta.id);
      }
    },
  });
}

/**
 * Fetch the backstop pool user data for the given pool and connected wallet.
 * @param poolId - The pool ID
 * @param enabled - Whether the query is enabled (optional - defaults to true)
 * @returns Query result with the backstop pool user data.
 */
export function useBackstopPoolUser(
  poolMeta: PoolMeta | undefined,
  enabled: boolean = true
): UseQueryResult<BackstopPoolUser, Error> {
  const { network } = useSettings();
  const { walletAddress, connected } = useWallet();
  return useQuery({
    staleTime: USER_STALE_TIME,
    queryKey: ['backstopPoolUser', poolMeta?.id, walletAddress],
    enabled: enabled && poolMeta !== undefined && connected,
    placeholderData: new BackstopPoolUser(
      walletAddress,
      poolMeta?.id ?? '',
      new UserBalance(BigInt(0), [], BigInt(0), BigInt(0)),
      undefined
    ),
    queryFn: async () => {
      if (walletAddress !== '' && poolMeta !== undefined) {
        return await BackstopPoolUser.load(
          network,
          poolMeta.version === Version.V2 ? BACKSTOP_ID_V2 : BACKSTOP_ID,
          poolMeta.id,
          walletAddress
        );
      }
    },
  });
}

//********** General User Data **********//

/**
 * Fetch the account from Horizon for the connected wallet.
 * @param enabled - Whether the query is enabled (optional - defaults to true)
 * @returns Query result with the account data.
 */
export function useHorizonAccount(
  enabled: boolean = true
): UseQueryResult<Horizon.AccountResponse> {
  const { walletAddress, connected } = useWallet();
  const { network } = useSettings();
  return useQuery({
    staleTime: USER_STALE_TIME,
    queryKey: ['account', walletAddress],
    enabled: enabled && connected && walletAddress !== '',
    queryFn: async () => {
      if (walletAddress === '') {
        throw new Error('No wallet address');
      }
      let horizon = new Horizon.Server(network.horizonUrl, network.opts);
      return await horizon.loadAccount(walletAddress);
    },
  });
}

/**
 * Fetch the token balance for the given token ID and connected wallet.
 * Will use the Horizon account data if available.
 * @param tokenId - The token ID
 * @param asset - The Stellar asset (or undefined if a soroban token)
 * @param account - The Horizon account data
 * @param enabled - Whether the query is enabled (optional - defaults to true)
 * @returns Query result with the token balance.
 */
export function useTokenBalance(
  tokenId: string | undefined,
  asset: Asset | undefined,
  account: Horizon.AccountResponse | undefined,
  enabled: boolean = true
): UseQueryResult<bigint> {
  const { walletAddress, connected } = useWallet();
  const { network } = useSettings();
  return useQuery({
    staleTime: USER_STALE_TIME,
    queryKey: ['balance', tokenId, walletAddress, account?.last_modified_ledger],
    enabled: enabled && connected && !!account && walletAddress !== '',
    queryFn: async () => {
      if (walletAddress === '') {
        throw new Error('No wallet address');
      }
      if (tokenId === undefined || tokenId === '') {
        return BigInt(0);
      }

      if (account !== undefined && asset !== undefined) {
        let balance_line = account.balances.find((balance) => {
          if (balance.asset_type == 'native') {
            // @ts-ignore
            return asset.isNative();
          }
          return (
            // @ts-ignore
            balance.asset_code === asset.getCode() &&
            // @ts-ignore
            balance.asset_issuer === asset.getIssuer()
          );
        });
        if (balance_line !== undefined) {
          return BigInt(balance_line.balance.replace('.', ''));
        }
      }
      const stellarRpc = new rpc.Server(network.rpc, network.opts);
      return await getTokenBalance(
        stellarRpc,
        network.passphrase,
        tokenId,
        new Address(walletAddress)
      );
    },
  });
}

//********** Auction Data **********//

/**
 * Fetch auction related events for the given pool ID.
 * @param poolId - The pool ID
 * @param enabled - Whether the query is enabled (optional - defaults to true)
 * @returns An object containing an events and latestLedger field.
 */
export function useAuctionEventsLongQuery(
  poolMeta: PoolMeta | undefined,
  enabled: boolean = true
): UseQueryResult<{ events: PoolV1Event[] | PoolV2Event[]; latestLedger: number }, Error> {
  const { network } = useSettings();
  return useQuery({
    staleTime: 10 * 60 * 1000,
    queryKey: ['auctionEventsLong', poolMeta?.id],
    enabled: enabled && poolMeta !== undefined,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      if (poolMeta === undefined) {
        throw new Error();
      }
      try {
        const stellarRpc = new rpc.Server(network.rpc, network.opts);
        const latestLedger = (await stellarRpc.getLatestLedger()).sequence;
        // default event retention period for RPCs is 17280 ledgers
        // but RPCs currently only scan 10k ledgers per request, provide
        // some buffer to ensure the latest ledger is read
        let queryLedger = Math.round(latestLedger - 9990);
        queryLedger = Math.max(queryLedger, 100);

        return getAuctionEventsQuery(poolMeta, network, queryLedger);
      } catch (e) {
        console.error('Error fetching auction events', e);
        return undefined;
      }
    },
  });
}

/**
 * Fetch auction related events starting from the `lastCurser` or `lastLedgerFetched`.
 * @param poolId - The pool ID
 * @param lastLedgerFetched - The last ledger fetched
 * @param enabled - Whether the query is enabled (optional - defaults to true)
 * @returns An object containing an events and latestLedger field.
 */
export function useAuctionEventsShortQuery(
  poolMeta: PoolMeta | undefined,
  lastLedgerFetched: number,
  enabled: boolean = true
): UseQueryResult<{ events: PoolV1Event[] | PoolV2Event[]; latestLedger: number }, Error> {
  const { network } = useSettings();
  // TODO: Use cursor instead of lastLedger when possible once RPC cursor usage is fixed.
  return useQuery({
    queryKey: ['auctionEventsShort', poolMeta?.id, lastLedgerFetched],
    enabled: enabled && poolMeta !== undefined && lastLedgerFetched > 0,
    refetchInterval: 5 * 1000,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      if (poolMeta === undefined) {
        throw new Error();
      }
      try {
        return getAuctionEventsQuery(poolMeta, network, lastLedgerFetched);
      } catch (e) {
        console.error('Error fetching auction events', e);
        return undefined;
      }
    },
  });
}

/**
 * Fetch the simulating result for a given operation.
 * @param operation_str - The operation XDR string in base64
 * @param enabled - Whether the query is enabled (optional - defaults to true)
 * @returns Query result with the simulation transaction response.
 */
export function useSimulateOperation<T>(
  operation_str: string,
  enabled: boolean = true
): UseQueryResult<rpc.Api.SimulateTransactionResponse> {
  const { walletAddress, connected } = useWallet();
  const { network } = useSettings();
  return useQuery({
    staleTime: USER_STALE_TIME,
    queryKey: ['sim', operation_str],
    enabled: enabled && connected && walletAddress !== '',
    queryFn: async () => {
      if (walletAddress === '') {
        throw new Error('No wallet address');
      }
      let operation = xdr.Operation.fromXDR(operation_str, 'base64');
      const stellarRpc = new rpc.Server(network.rpc, network.opts);
      const account = new Account(walletAddress, '123');
      const tx_builder = new TransactionBuilder(account, {
        networkPassphrase: network.passphrase,
        fee: BASE_FEE,
        timebounds: { minTime: 0, maxTime: Math.floor(Date.now() / 1000) + 5 * 60 * 1000 },
      }).addOperation(operation);
      const transaction = tx_builder.build();
      return await stellarRpc.simulateTransaction(transaction);
    },
  });
}

//********** Misc Data **********//

/**
 * Fetch the token metadata for the given reserve.
 * @param assetId - The reserve assetId
 * @param enabled - Whether the query is enabled (optional - defaults to true)
 * @returns Query result with the token metadata.
 */
export function useTokenMetadata(
  assetId: string | undefined,
  enabled: boolean = true
): UseQueryResult<ReserveTokenMetadata, Error> {
  const { network } = useSettings();
  return useQuery(createTokenMetadataQuery(network, assetId, enabled));
}

/**
 * Fetch the token metadata for the list of assets.
 * @param assetIds - The reserve assetId
 * @param enabled - Whether the query is enabled (optional - defaults to true)
 * @returns Query result with the token metadata.
 */
export function useTokenMetadataList(
  assetIds: string[],
  enabled: boolean = true
): UseQueryResult<ReserveTokenMetadata, Error>[] {
  const { network } = useSettings();
  return useQueries({
    queries: assetIds.map((assetId) => createTokenMetadataQuery(network, assetId, enabled)),
  });
}

/**
 * Helper function to create a token metadata query.
 */
function createTokenMetadataQuery(
  network: Network & {
    horizonUrl: string;
  },
  assetId: string | undefined,
  enabled: boolean = true
): UseQueryOptions<ReserveTokenMetadata, Error> {
  return {
    staleTime: Infinity,
    queryKey: ['tokenMetadata', assetId],
    enabled: enabled && assetId !== undefined && assetId !== '',
    queryFn: async () => {
      if (assetId === undefined || assetId === '') {
        throw new Error('No assetId');
      }
      const horizon = new Horizon.Server(network.horizonUrl, network.opts);
      const tokenMetadata = await TokenMetadata.load(network, assetId);
      const tomlMetadata = await getTokenMetadataFromTOML(horizon, tokenMetadata);
      const reserveTokenMeta: ReserveTokenMetadata = {
        assetId: assetId,
        ...tokenMetadata,
        ...tomlMetadata,
      };
      return reserveTokenMeta;
    },
  };
}

const AUCTION_EVENT_FILTERS = [
  [xdr.ScVal.scvSymbol('fill_auction').toXDR('base64'), '*', '*'],
  [xdr.ScVal.scvSymbol('delete_liquidation_auction').toXDR('base64'), '*'],
  [xdr.ScVal.scvSymbol('new_liquidation_auction').toXDR('base64'), '*'],
  [xdr.ScVal.scvSymbol('new_auction').toXDR('base64'), '*'],
  [xdr.ScVal.scvSymbol('delete_liquidation_auction').toXDR('base64'), '*'],
];
const AUCTION_EVENT_FILTERS_V2 = [
  [xdr.ScVal.scvSymbol('new_auction').toXDR('base64'), '*', '*'],
  [xdr.ScVal.scvSymbol('fill_auction').toXDR('base64'), '*', '*'],
  [xdr.ScVal.scvSymbol('delete_auction').toXDR('base64'), '*', '*'],
];

/**
 * Helper function to fetch auction events based on the pool version.
 */
async function getAuctionEventsQuery(
  poolMeta: PoolMeta,
  network: Network,
  startLedger: number
): Promise<{ events: PoolV1Event[] | PoolV2Event[]; latestLedger: number }> {
  // TODO: add pagination once cursor usage is fixed
  const stellarRpc = new rpc.Server(network.rpc, network.opts);
  const topics = poolMeta.version === Version.V1 ? AUCTION_EVENT_FILTERS : AUCTION_EVENT_FILTERS_V2;
  const resp = await stellarRpc._getEvents({
    startLedger,
    filters: [
      {
        type: 'contract',
        contractIds: [poolMeta.id],
        topics,
      },
    ],
    limit: 1000,
  });

  if (poolMeta.version === Version.V1) {
    let events: PoolV1Event[] = [];
    for (const respEvent of resp.events) {
      let poolEvent = poolEventV1FromEventResponse(respEvent);
      if (poolEvent) events.push(poolEvent);
    }
    return { events, latestLedger: resp.latestLedger };
  } else {
    let events: PoolV2Event[] = [];
    for (const respEvent of resp.events) {
      let poolEvent = poolEventV2FromEventResponse(respEvent);
      if (poolEvent) events.push(poolEvent);
    }
    return { events, latestLedger: resp.latestLedger };
  }
}

/**
 * Fetch the fee stats from the RPC server.
 * @returns Query result with the fee stats.
 */
export function useFeeStats(
  enabled: boolean = true
): UseQueryResult<rpc.Api.GetFeeStatsResponse, Error> {
  const { network } = useSettings();
  return useQuery({
    staleTime: USER_STALE_TIME,
    queryKey: ['feeStats'],
    enabled: enabled,
    queryFn: async () => {
      try {
        let stellarRpc = new rpc.Server(network.rpc, network.opts);
        const feeStats = await stellarRpc.getFeeStats();
        return feeStats;
      } catch (e) {
        console.error('Error fetching fee stats', e);
        return undefined;
      }
    },
  });
}
