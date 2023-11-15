import * as BlendSdk from '@blend-capital/blend-sdk';
import { Address } from 'soroban-client';
import { StateCreator } from 'zustand';
import { getTokenBalance } from '../external/token';
import { DataStore, useStore } from './store';

export interface BackstopPoolData extends BlendSdk.BackstopPoolData {
  lastUpdated: number;
}

export interface BackstopUserData extends BlendSdk.BackstopUserData {
  walletBalance: bigint;
  lastUpdated: number;
}

export interface BackstopConfig extends BlendSdk.BackstopConfig {
  lastUpdated: number;
}

/**
 * Ledger state for the backstop
 */
export interface BackstopSlice {
  backstopContract: BlendSdk.BackstopClient;
  backstopConfig: BackstopConfig;
  backstopPoolData: Map<string, BackstopPoolData>;
  backstopUserData: Map<string, BackstopUserData>;
  refreshBackstopData: (latest_ledger_close: number) => Promise<void>;
  refreshBackstopPoolData: (
    pool_id: string,
    user_id: string | undefined,
    latest_ledger_close: number
  ) => Promise<void>;
}

export const createBackstopSlice: StateCreator<DataStore, [], [], BackstopSlice> = (set, get) => ({
  backstopContract: new BlendSdk.BackstopClient(
    'CDTPZ5PCK5COX73S5MABIZ3G3A6CLC3HDYQOHSXH6ZMN2VWHVRXAJO74'
  ),
  backstopConfig: {
    blndTkn: 'NULL',
    usdcTkn: 'NULL',
    backstopTkn: 'NULL',
    poolFactory: 'NULL',
    rewardZone: [],
    lpValue: {
      blndPerShare: BigInt(0),
      usdcPerShare: BigInt(0),
    },
    lastUpdated: 0,
  },
  backstopPoolData: new Map<string, BackstopPoolData>(),
  backstopUserData: new Map<string, BackstopUserData>(),

  refreshBackstopData: async (latest_ledger_close: number) => {
    try {
      const network = get().network;
      const contract = get().backstopContract;
      const backstopConfig = await BlendSdk.BackstopConfig.load(network, contract.address);
      const poolData = new Map<string, BackstopPoolData>();
      backstopConfig.rewardZone.forEach(async (poolId) => {
        const backstopPoolData = await BlendSdk.BackstopPoolData.load(
          network,
          contract.address,
          poolId
        );
        poolData.set(poolId, {
          lastUpdated: latest_ledger_close,
          poolBalance: backstopPoolData.poolBalance,
          poolEps: backstopPoolData.poolEps,
          emissions: backstopPoolData.emissions,
        });
      });
      set({
        backstopPoolData: poolData,
        backstopConfig: {
          blndTkn: backstopConfig.blndTkn,
          usdcTkn: backstopConfig.usdcTkn,
          backstopTkn: backstopConfig.backstopTkn,
          poolFactory: backstopConfig.poolFactory,
          rewardZone: backstopConfig.rewardZone,
          lpValue: backstopConfig.lpValue,
          lastUpdated: latest_ledger_close,
        },
      });
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
      const network = get().network;
      const contract = get().backstopContract;
      const stellar = get().rpcServer();
      const backstopConfig = get().backstopConfig;

      let backstopPoolData = await BlendSdk.BackstopPoolData.load(
        network,
        contract.address,
        pool_id
      );

      if (user_id) {
        let userData = await BlendSdk.BackstopUserData.load(
          network,
          contract.address,
          pool_id,
          user_id
        );
        let userBackstopWalletBalance = await getTokenBalance(
          stellar,
          network.passphrase,
          backstopConfig.backstopTkn,
          Address.fromString(user_id)
        );
        useStore.setState((prev) => ({
          backstopUserData: new Map(prev.backstopUserData).set(pool_id, {
            userBalance: userData.userBalance,
            walletBalance: userBackstopWalletBalance,
            userEmissions: userData.userEmissions,
            lastUpdated: latest_ledger_close,
          }),
          backstopPoolData: new Map(prev.backstopPoolData).set(pool_id, {
            lastUpdated: latest_ledger_close,
            poolBalance: backstopPoolData.poolBalance,
            poolEps: backstopPoolData.poolEps,
            emissions: backstopPoolData.emissions,
          }),
        }));
      } else {
        useStore.setState((prev) => ({
          backstopPoolData: new Map(prev.backstopPoolData).set(pool_id, {
            lastUpdated: latest_ledger_close,
            poolBalance: backstopPoolData.poolBalance,
            poolEps: backstopPoolData.poolEps,
            emissions: backstopPoolData.emissions,
          }),
        }));
      }
    } catch (e) {
      console.error('unable to refresh backstop pool data:', e);
    }
  },
});
