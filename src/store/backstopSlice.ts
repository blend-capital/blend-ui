import { Backstop, data_entry_converter } from 'blend-sdk';
import { Address, Server, xdr } from 'soroban-client';
import { StateCreator } from 'zustand';
import { getTokenBalance } from '../utils/stellar_rpc';
import { DataStore, useStore } from './store';
export interface PoolBalance extends Backstop.PoolBalance {
  lastUpdated: number;
}

export interface UserBalance extends Backstop.UserBalance {
  tokens: bigint;
  lastUpdated: number;
}

export type BackstopData = {
  backstopToken: string;
  backstopTokenPrice: bigint;
  rewardZone: string[];
  lastUpdated: number;
};

/**
 * Ledger state for the backstop
 */
export interface BackstopSlice {
  backstopContract: Backstop.BackstopOpBuilder;
  backstopData: BackstopData;
  backstopPoolData: Map<string, PoolBalance>;
  backstopUserData: Map<string, UserBalance>;
  refreshBackstopData: (latest_ledger_close: number) => Promise<void>;
  refreshBackstopPoolData: (
    pool_id: string,
    user_id: string | undefined,
    latest_ledger_close: number
  ) => Promise<void>;
}

export const createBackstopSlice: StateCreator<DataStore, [], [], BackstopSlice> = (set, get) => ({
  backstopContract: new Backstop.BackstopOpBuilder(
    'CA6Q7P3GLROQ6RY7FNQD7OFXHURWYYIQMGIFAPFPLAMVRH6YRBBXVCL5'
  ),
  backstopData: {
    backstopToken: 'CCQMEQ66Q4VRZQB44LIIBFJFVRDBNUDRLHNSFSV7BKNOV727XWNDJ6R5',
    backstopTokenPrice: BigInt(0.05e7),
    rewardZone: [],
    lastUpdated: 0,
  },
  backstopPoolData: new Map<string, PoolBalance>(),
  backstopUserData: new Map<string, UserBalance>(),

  refreshBackstopData: async (latest_ledger_close: number) => {
    try {
      const contract = get().backstopContract;
      const stellar = get().rpcServer();

      let rz_datakey = Backstop.BackstopDataKeyToXDR({ tag: 'RewardZone' });
      rz_datakey = xdr.ScVal.fromXDR(rz_datakey.toXDR());
      let rz_dataEntry = await stellar.getContractData(contract._contract.contractId(), rz_datakey);
      let rz = data_entry_converter.toStringArray(rz_dataEntry.xdr, 'hex');
      const poolBackstopBalMap = new Map<string, PoolBalance>();
      for (const rz_pool of rz) {
        const pool_balance = await loadPoolBackstopBalance(stellar, contract, rz_pool);
        pool_balance.lastUpdated = latest_ledger_close;
        poolBackstopBalMap.set(rz_pool, pool_balance);
      }
      let backstopData = get().backstopData;
      backstopData.rewardZone = rz;
      backstopData.lastUpdated = latest_ledger_close;

      set({ backstopData: backstopData });
    } catch (e) {
      console.error('unable to refresh backstop data:', e);
    }
  },
  refreshBackstopPoolData: async (
    pool_id: string,
    user_id: string | undefined,
    latest_ledger_close: number
  ) => {
    try {
      const contract = get().backstopContract;
      const stellar = get().rpcServer();
      const network = get().passphrase;
      const backstopData = get().backstopData;

      let pool_backstop_balance = await loadPoolBackstopBalance(stellar, contract, pool_id);
      pool_backstop_balance.lastUpdated = latest_ledger_close;
      if (user_id) {
        let user_balance = await loadUserBalance(stellar, contract, pool_id, user_id);
        let token_balance = await getTokenBalance(
          stellar,
          network,
          backstopData.backstopToken,
          Address.fromString(user_id)
        );
        user_balance.tokens = token_balance;
        user_balance.lastUpdated = latest_ledger_close;
        useStore.setState((prev) => ({
          backstopUserData: new Map(prev.backstopUserData).set(pool_id, user_balance),
          backstopPoolData: new Map(prev.backstopPoolData).set(pool_id, pool_backstop_balance),
        }));
      } else {
        useStore.setState((prev) => ({
          backstopPoolData: new Map(prev.backstopPoolData).set(pool_id, pool_backstop_balance),
        }));
      }
    } catch (e) {
      console.error('unable to refresh backstop pool data:', e);
    }
  },
});

/********** Contract Data Helpers **********/

async function loadUserBalance(
  stellar: Server,
  contract: Backstop.BackstopOpBuilder,
  pool_id: string,
  user_id: string
): Promise<UserBalance> {
  try {
    let user_balance_datakey = Backstop.BackstopDataKeyToXDR({
      tag: 'UserBalance',
      values: [{ pool: pool_id, user: user_id }],
    });
    user_balance_datakey = xdr.ScVal.fromXDR(user_balance_datakey.toXDR());
    let user_balance_dataEntry = await stellar.getContractData(
      contract._contract.contractId(),
      user_balance_datakey
    );
    let user_balance = Backstop.UserBalanceFromXDR(user_balance_dataEntry.xdr);
    return {
      shares: user_balance.shares,
      q4w: user_balance.q4w,
      lastUpdated: 0,
      tokens: BigInt(0),
    };
  } catch (e: any) {
    if (e?.message?.includes('not found') === false) {
      console.error('unable to fetch shares for: ', pool_id);
      console.error(e);
    }
    // user balance not found, can assume a deposit of zero
    return { shares: BigInt(0), q4w: [], lastUpdated: 0, tokens: BigInt(0) };
  }
}

async function loadPoolBackstopBalance(
  stellar: Server,
  contract: Backstop.BackstopOpBuilder,
  pool_id: string
): Promise<PoolBalance> {
  try {
    let pool_balance_datakey = Backstop.BackstopDataKeyToXDR({
      tag: 'PoolBalance',
      values: [pool_id],
    });
    pool_balance_datakey = xdr.ScVal.fromXDR(pool_balance_datakey.toXDR());
    let pool_balance_entry = await stellar.getContractData(
      contract._contract.contractId(),
      pool_balance_datakey
    );
    const pool_balance = Backstop.PoolBalanceFromXDR(pool_balance_entry.xdr);
    return {
      shares: pool_balance.shares,
      tokens: pool_balance.tokens,
      q4w: pool_balance.q4w,
      lastUpdated: 0,
    };
  } catch (e: any) {
    console.error(`unable to load backstop pool data for ${pool_id}:`, e);
    console.error(`unable to load backstop pool data for ${pool_id}:`, e);
    return {
      shares: BigInt(0),
      tokens: BigInt(0),
      q4w: BigInt(0),
      lastUpdated: 0,
    };
  }
}
