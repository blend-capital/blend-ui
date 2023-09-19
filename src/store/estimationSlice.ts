import { Backstop, Pool as PoolContract } from 'blend-sdk';
import { StateCreator } from 'zustand';
import { PoolBalance, UserBalance } from './backstopSlice';
import { Pool, PoolData, PoolUserData, ReserveBalance } from './poolSlice';
import { DataStore, useStore } from './store';

export type PoolEstimates = {
  total_backstop_take_base: number;
  total_supply_base: number;
  total_liabilities_base: number;
  reserve_est: ReserveEstimates[];
};

export type ReserveEstimates = {
  id: string;
  decimals: number;
  supplied: number;
  borrowed: number;
  available: number;
  apy: number;
  supply_apy: number;
  util: number;
  b_rate: number;
  d_rate: number;
  c_factor: number; // @dev - Duplicate data allows market components to avoid reading from the poolSlice
  l_factor: number;
};

export type PoolUserEstimates = {
  net_apy: number;
  supply_apy: number;
  borrow_apy: number;
  total_supplied_base: number;
  total_borrowed_base: number;
  e_collateral_base: number;
  e_liabilities_base: number;
  reserve_estimates: Map<string, UserReserveEstimates>;
  emission_balance: bigint;
};

export type UserReserveEstimates = {
  asset: number;
  supplied: number;
  borrowed: number;
};

export type BackstopPoolEstimates = {
  backstopSize: number;
  backstopApy: number;
  q4wRate: number;
  shareRate: number;
};

export type BackstopUserEstimates = {
  availableToQueue: number;
  depositBalance: number;
  walletBalance: number;
  q4wUnlockedAmount: number;
  q4w: Backstop.Q4W[];
};
/**
 * Estimate ledger data to a given ledger number, while producing human readable values
 */
export interface EstimationSlice {
  pool_est: Map<string, PoolEstimates>;
  pool_user_est: Map<string, PoolUserEstimates>;
  backstop_user_est: Map<string, BackstopUserEstimates>;
  backstop_pool_est: Map<string, BackstopPoolEstimates>;
  loadPoolData: (
    pool_id: string,
    user_id?: string | undefined,
    force_reload?: boolean
  ) => Promise<void>;
  loadBackstopData: (
    pool_id: string,
    user_id?: string | undefined,
    force_reload?: boolean
  ) => Promise<void>;
}

export const createEstimationSlice: StateCreator<DataStore, [], [], EstimationSlice> = (
  set,
  get
) => ({
  pool_est: new Map<string, PoolEstimates>(),
  pool_user_est: new Map<string, PoolUserEstimates>(),
  backstop_pool_est: new Map<string, BackstopPoolEstimates>(),
  backstop_user_est: new Map<string, BackstopUserEstimates>(),

  loadPoolData: async (
    pool_id: string,
    user_id?: string | undefined,
    force_reload?: boolean
  ): Promise<void> => {
    try {
      const stellar = get().rpcServer();
      let tx_response = await stellar.getTransaction(
        '0000000000000000000000000000000000000000000000000000000000000000'
      ); // TODO: File issue/pr to add getLatestLedger endpoint
      let latest_ledger_close = tx_response.latestLedgerCloseTime;
      let poolData = get().poolData.get(pool_id);
      let pool = get().pools.get(pool_id);
      console.log(`Estimating pool data for ${pool_id} to ledger: ${latest_ledger_close}`);

      if (
        !poolData ||
        Number(poolData.lastUpdated) + Number(60) < latest_ledger_close ||
        !pool ||
        force_reload
      ) {
        console.log(`Loading pool data for ${pool_id} from ledger: ${latest_ledger_close}`);
        await get().refreshPoolData(pool_id, latest_ledger_close);
        poolData = get().poolData.get(pool_id);
        pool = get().pools.get(pool_id);
      }

      if (!pool || !poolData) {
        throw Error('Invalid Pool');
      }

      let backstop_take_rate = pool.config.bstop_rate / 1e9;
      let pool_est: PoolEstimates = {
        total_supply_base: 0,
        total_liabilities_base: 0,
        total_backstop_take_base: 0,
        reserve_est: [],
      };
      for (const res of Array.from(poolData.reserves.values())) {
        let reserve_est = buildReserveEstimate(pool, res, latest_ledger_close);
        let price = poolData.poolPrices.get(res.asset_id) ?? 1;
        pool_est.total_supply_base += reserve_est.supplied * price;
        pool_est.total_liabilities_base += reserve_est.borrowed * price;
        pool_est.total_backstop_take_base +=
          reserve_est.supplied * price * reserve_est.supply_apy * backstop_take_rate;
        pool_est.reserve_est.push(reserve_est);
      }

      if (user_id) {
        let userData = get().poolUserData.get(pool_id);
        if (
          !userData ||
          Number(userData.lastUpdated) + Number(60) < latest_ledger_close ||
          force_reload
        ) {
          console.log(
            `Loading pool position data for ${user_id} from ledger: ${latest_ledger_close}`
          );
          await get().refreshUserData(pool_id, user_id, latest_ledger_close);
          userData = get().poolUserData.get(pool_id);
        }
        if (!userData) {
          throw Error('Unable to estimate pool user data');
        }
        let user_est = buildPoolUserEstimate(pool_est, userData, poolData);
        let userEmissionBal = estimatePoolUserEmissionBalance(
          userData,
          poolData,
          latest_ledger_close
        );
        user_est.emission_balance = userEmissionBal;
        useStore.setState((prev) => ({
          pool_est: new Map(prev.pool_est).set(pool_id, pool_est),
          pool_user_est: new Map(prev.pool_user_est).set(pool_id, user_est),
        }));
      } else {
        useStore.setState((prev) => ({
          pool_est: new Map(prev.pool_est).set(pool_id, pool_est),
        }));
      }
    } catch (e) {
      console.error(`Unable to load pool data for ${pool_id}`);
    }
  },

  loadBackstopData: async (
    pool_id: string,
    user_id?: string | undefined,
    force_reload?: boolean
  ): Promise<void> => {
    try {
      const stellar = get().rpcServer();
      let tx_response = await stellar.getTransaction(
        '0000000000000000000000000000000000000000000000000000000000000000'
      ); // TODO: File issue/pr to add getLatestLedger endpoint
      let latest_ledger_close = tx_response.latestLedgerCloseTime;
      console.log(`Estimating backstop data for ${pool_id} to ledger: ${latest_ledger_close}`);

      const poolEst = get().pool_est.get(pool_id);
      let backstopData = get().backstopData;
      let backstopPoolBalance = get().backstopPoolData.get(pool_id);

      if (
        !backstopData ||
        Number(backstopData.lastUpdated) + Number(60) < latest_ledger_close ||
        force_reload
      ) {
        console.log(`Loading backstop data from ledger: ${latest_ledger_close}`);
        await get().refreshBackstopData(latest_ledger_close);
        backstopData = get().backstopData;
      }

      if (
        !backstopPoolBalance ||
        Number(backstopPoolBalance.lastUpdated) + Number(60) < latest_ledger_close ||
        force_reload
      ) {
        console.log(`Loading backstop data for ${pool_id} from ledger: ${latest_ledger_close}`);
        await get().refreshBackstopPoolData(pool_id, undefined, latest_ledger_close);
        backstopPoolBalance = get().backstopPoolData.get(pool_id);
      }

      if (backstopPoolBalance && poolEst) {
        const tokenToBase = Number(backstopData.backstopTokenPrice) / 1e7;
        const estBackstopSize = (Number(backstopPoolBalance.tokens) / 1e7) * tokenToBase;
        const estBackstopApy = poolEst.total_backstop_take_base / estBackstopSize;
        const estQ4WRate = Number(backstopPoolBalance.q4w) / Number(backstopPoolBalance.shares);
        const shareRate = Number(backstopPoolBalance.tokens) / Number(backstopPoolBalance.shares);

        if (user_id) {
          let backstopUserData = get().backstopUserData.get(pool_id);
          if (
            !backstopUserData ||
            Number(backstopUserData.lastUpdated) + Number(60) < latest_ledger_close
          ) {
            console.log(
              `Loading backstop position data for ${user_id} from ledger: ${latest_ledger_close}`
            );
            await get().refreshBackstopPoolData(pool_id, user_id, latest_ledger_close);
            backstopUserData = get().backstopUserData.get(pool_id);
          }
          if (!backstopUserData) {
            throw Error('Unable to load backstop user data');
          }
          const backstopUserEst = buildBackstopUserEstimate(backstopUserData, backstopPoolBalance);
          useStore.setState((prev) => ({
            backstop_pool_est: new Map(prev.backstop_pool_est).set(pool_id, {
              backstopSize: estBackstopSize,
              backstopApy: estBackstopApy,
              q4wRate: estQ4WRate,
              shareRate: shareRate,
            }),
            backstop_user_est: new Map(prev.backstop_user_est).set(pool_id, backstopUserEst),
          }));
        } else {
          useStore.setState((prev) => ({
            backstop_pool_est: new Map(prev.backstop_pool_est).set(pool_id, {
              backstopSize: estBackstopSize,
              backstopApy: estBackstopApy,
              q4wRate: estQ4WRate,
              shareRate: shareRate,
            }),
          }));
        }
      }
    } catch (e) {
      console.error('Unable to load backstop data', e);
    }
  },
});

/********** Estimation Helpers **********/

function buildReserveEstimate(
  pool: Pool,
  reserve: PoolContract.Reserve,
  lastUpdated: number
): ReserveEstimates {
  let decimal_bstop_rate = pool.config.bstop_rate / 1e8; // TODO: Fix after pool redeploy updates bstop rate
  let est_res_data = reserve.estimateData(decimal_bstop_rate, lastUpdated);
  console.log('data: ', decimal_bstop_rate);
  return {
    id: reserve.asset_id,
    decimals: reserve.config.decimals,
    supplied: est_res_data.total_supply * est_res_data.b_rate,
    borrowed: est_res_data.total_liabilities * est_res_data.d_rate,
    available: Number(reserve.pool_tokens) / 10 ** reserve.config.decimals,
    apy: est_res_data.cur_apy,
    supply_apy: est_res_data.cur_apy * est_res_data.cur_util * (1 - decimal_bstop_rate),
    util: est_res_data.cur_util,
    b_rate: est_res_data.b_rate,
    d_rate: est_res_data.d_rate,
    c_factor: reserve.config.c_factor / 1e7,
    l_factor: reserve.config.l_factor / 1e7,
  };
}

function buildUserReserveEstimates(
  reserve_est: ReserveEstimates,
  user_res_balance: ReserveBalance,
  decimals: number
): UserReserveEstimates {
  const scaler = 10 ** decimals;
  return {
    asset: Number(user_res_balance.asset) / scaler,
    supplied: (Number(user_res_balance.b_token) / scaler) * reserve_est.b_rate,
    borrowed: (Number(user_res_balance.d_token) / scaler) * reserve_est.d_rate,
  };
}

function buildPoolUserEstimate(
  pool_est: PoolEstimates,
  userData: PoolUserData,
  poolData: PoolData
): PoolUserEstimates {
  let user_est: PoolUserEstimates = {
    net_apy: 0,
    supply_apy: 0,
    borrow_apy: 0,
    total_supplied_base: 0,
    total_borrowed_base: 0,
    e_collateral_base: 0,
    e_liabilities_base: 0,
    reserve_estimates: new Map(),
    emission_balance: BigInt(0),
  };
  for (const res_est of pool_est.reserve_est ?? []) {
    let user_balance = userData?.reserveBalances.get(res_est.id);
    if (user_balance) {
      let decimals = poolData.reserves.get(res_est.id)?.config.decimals ?? 0;
      let user_res_est = buildUserReserveEstimates(res_est, user_balance, decimals);
      let price = poolData?.poolPrices.get(res_est.id) ?? 1;
      let res_supplied_base = user_res_est.supplied * price;
      let res_borrowed_base = user_res_est.borrowed * price;
      user_est.total_supplied_base += res_supplied_base;
      user_est.total_borrowed_base += res_borrowed_base;
      user_est.e_collateral_base += res_supplied_base * res_est.c_factor;
      user_est.e_liabilities_base += res_borrowed_base / res_est.l_factor;
      user_est.supply_apy += res_supplied_base * res_est.supply_apy;
      user_est.borrow_apy += res_borrowed_base * res_est.apy;
      user_est.net_apy += res_supplied_base * res_est.supply_apy - res_borrowed_base * res_est.apy;
      user_est.reserve_estimates.set(res_est.id, user_res_est);
    }
  }
  user_est.supply_apy = user_est.supply_apy / user_est.total_supplied_base;
  user_est.borrow_apy = user_est.borrow_apy / user_est.total_borrowed_base;
  user_est.net_apy =
    user_est.net_apy / (user_est.total_supplied_base + user_est.total_borrowed_base);

  return user_est;
}

function estimatePoolUserEmissionBalance(
  userData: PoolUserData,
  poolData: PoolData,
  latestLedgerClose: number
): bigint {
  let userEmissionBal = userData.totalEmissions;
  for (const res of Array.from(poolData?.reserves.values() ?? [])) {
    const supply_bal = userData.reserveBalances.get(res.asset_id)?.b_token ?? BigInt(0);
    const liability_bal = userData.reserveBalances.get(res.asset_id)?.d_token ?? BigInt(0);

    const liability_emission = poolData.reserveEmissions.get(res.config.index * 2);
    const supply_emission = poolData.reserveEmissions.get(res.config.index * 2 + 1);
    const user_liability_emission = userData.emissionsData.get(res.config.index * 2);
    const user_supply_emission = userData.emissionsData.get(res.config.index * 2 + 1);

    if (liability_emission && user_liability_emission) {
      userEmissionBal +=
        liability_bal * (liability_emission.reserveIndex - user_liability_emission.userIndex);
      if (res.data.d_supply > 0) {
        userEmissionBal +=
          (liability_bal *
            liability_emission.eps *
            (BigInt(latestLedgerClose) - liability_emission.lastTime)) /
          res.data.d_supply;
      }
    }
    if (supply_emission && user_supply_emission) {
      userEmissionBal +=
        supply_bal * (supply_emission.reserveIndex - user_supply_emission.userIndex);

      if (res.data.b_supply > 0) {
        userEmissionBal +=
          (supply_bal *
            supply_emission.eps *
            (BigInt(latestLedgerClose) - supply_emission.lastTime)) /
          res.data.b_supply;
      }
    }
  }
  return userEmissionBal;
}

function buildBackstopUserEstimate(
  backstopUserData: UserBalance,
  backstopPoolBalance: PoolBalance
): BackstopUserEstimates {
  const shareRate = Number(backstopPoolBalance.tokens) / Number(backstopPoolBalance.shares);
  const backstopDeposit = backstopUserData.shares;
  const backstopWalletBalance = backstopUserData.tokens;
  const depositBalance = (Number(backstopDeposit ?? 0) / 1e7) * shareRate;
  const walletBalance = Number(backstopWalletBalance) / 1e7;

  let unlockedAmount = BigInt(0);
  let lockedList: Backstop.Q4W[] = [];
  const NOW_SECONDS = Math.floor(Date.now() / 1000);
  for (const q4w of backstopUserData.q4w) {
    if (q4w.exp < NOW_SECONDS) {
      // unlocked, only display a single unlocked entry
      unlockedAmount += q4w.amount / BigInt(1e7);
    } else {
      lockedList.push(q4w);
    }
  }
  const unqueuedBalance = (Number(backstopUserData.shares) / 1e7) * shareRate;
  const queuedBalance =
    lockedList.reduce((total, q4w) => total + Number(q4w.amount) / 1e7, 0) + Number(unlockedAmount);
  const availableToQueue = unqueuedBalance - queuedBalance - Number(unlockedAmount);
  return {
    availableToQueue,
    depositBalance,
    walletBalance,
    q4wUnlockedAmount: (Number(unlockedAmount) / 1e7) * shareRate,
    q4w: lockedList,
  };
}
