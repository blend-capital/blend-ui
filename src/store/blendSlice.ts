import { Backstop, Pool } from '@blend-capital/blend-sdk';
import { StateCreator } from 'zustand';
import { DataStore } from './store';

export const BACKSTOP_ID = 'CAYRY4MZ42MAT3VLTXCILUG7RUAPELZDCDSI2BWBYUJWIDDWW3HQV5LU';
/**
 * Ledger state for the Blend protocol
 */
export interface BlendSlice {
  backstop: Backstop | undefined;
  pools: Map<string, Pool>;
  latestLedger: number;
  latestLedgerTimestamp: number;

  loadBlendData: (force_update: boolean, pool_id?: string, user_id?: string) => Promise<void>;
}

export const createBlendSlice: StateCreator<DataStore, [], [], BlendSlice> = (set, get) => ({
  backstop: undefined,
  pools: new Map<string, Pool>(),
  latestLedger: 0,
  latestLedgerTimestamp: 0,

  loadBlendData: async (force_update: boolean, pool_id?: string, user_id?: string) => {
    try {
      const network = get().network;
      // get latest ledger close time (TODO: File issue to include close time on getLatestLedger)
      const rpc = get().rpcServer();
      let tx_response = await rpc.getTransaction(
        '0000000000000000000000000000000000000000000000000000000000000000'
      );
      let latest_ledger = Number(tx_response.latestLedger);
      let latest_ledger_close = Number(tx_response.latestLedgerCloseTime);

      if (
        !force_update &&
        get().backstop !== undefined &&
        latest_ledger_close < get().latestLedgerTimestamp + 30
      ) {
        return;
      }

      let backstop = await Backstop.load(
        network,
        BACKSTOP_ID,
        pool_id ? [pool_id] : [],
        true,
        latest_ledger_close
      );

      // all pools in the reward zone + the request pools are loaded on the backstop
      let pools = new Map<string, Pool>();
      for (let pool of Array.from(backstop.pools.keys())) {
        try {
          let pool_data = await Pool.load(network, pool, latest_ledger_close);
          pools.set(pool, pool_data);
        } catch (e) {
          console.error('Unable to load pool data for pool ' + pool);
          console.error(e);
        }
      }

      set({
        backstop,
        pools,
        latestLedger: latest_ledger,
        latestLedgerTimestamp: latest_ledger_close,
      });

      // load data into user slice after an updated, if a user is specified
      if (user_id) {
        await get().loadUserData(user_id);
      }
    } catch (e) {
      console.error('Unable to load Blend data');
      console.error(e);
    }
  },
});
