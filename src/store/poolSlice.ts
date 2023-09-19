import { data_entry_converter, Oracle, Pool } from 'blend-sdk';
import { Address, Server, xdr } from 'soroban-client';
import { Durability } from 'soroban-client/lib/server';
import { StateCreator } from 'zustand';
import { getTokenBalance } from '../utils/stellar_rpc';
import { TOKEN_META } from '../utils/token_display';
import { DataStore, useStore } from './store';

export type ReserveBalance = {
  asset: bigint;
  b_token: bigint;
  d_token: bigint;
};

export type Pool = {
  id: string;
  name: string;
  admin: string;
  config: Pool.PoolConfig;
  reserves: string[];
};

export type PoolData = {
  reserves: Map<string, Pool.Reserve>;
  poolPrices: Map<string, number>;
  reserveEmissions: Map<number, ReserveEmission>;
  lastUpdated: number;
};

export type PoolUserData = {
  reserveBalances: Map<string, ReserveBalance>;
  emissionsData: Map<number, UserReserveEmission>;
  totalEmissions: bigint;
  lastUpdated: number;
};

export type ReserveEmission = {
  eps: bigint;
  reserveIndex: bigint;
  lastTime: bigint;
  expiration: bigint;
};

export type UserReserveEmission = {
  userIndex: bigint;
  accrued: bigint;
};

/**
 * Ledger state for a set of pools
 */
export interface PoolSlice {
  pools: Map<string, Pool>;
  poolData: Map<string, PoolData>;
  poolUserData: Map<string, PoolUserData>;

  refreshPoolData: (pool_id: string, latest_ledger_close: number) => Promise<void>;
  refreshUserData: (pool_id: string, user: string, latest_ledger_close: number) => Promise<void>;
}

export const createPoolSlice: StateCreator<DataStore, [], [], PoolSlice> = (set, get) => ({
  pools: new Map<string, Pool>(),
  poolData: new Map<string, PoolData>(),
  poolUserData: new Map<string, PoolUserData>(),

  refreshPoolData: async (pool_id: string, latest_ledger_close: number) => {
    try {
      const stellar = get().rpcServer();
      const network = get().passphrase;
      let pool = get().pools.get(pool_id);

      let set_pool = false;
      if (pool == undefined) {
        pool = await loadPool(stellar, pool_id);
        set_pool = true;
      }
      const prices = await loadOraclePrices(stellar, pool);
      const pool_reserves = await loadReservesForPool(stellar, network, pool);
      const reserveEmissions = await loadPoolEmissionData(
        stellar,
        pool_id,
        Array.from(pool_reserves.values())
      );

      if (set_pool) {
        useStore.setState((prev) => ({
          poolData: new Map(prev.poolData).set(pool_id, {
            poolPrices: prices,
            reserves: pool_reserves,
            reserveEmissions,
            lastUpdated: latest_ledger_close,
          }),
          pools: new Map(prev.pools).set(pool_id, pool as Pool),
        }));
      } else {
        useStore.setState((prev) => ({
          poolData: new Map(prev.poolData).set(pool_id, {
            poolPrices: prices,
            reserves: pool_reserves,
            reserveEmissions,
            lastUpdated: latest_ledger_close,
          }),
        }));
      }
    } catch (e) {
      console.error(`unable to refresh data for pool ${pool_id}`);
    }
  },

  refreshUserData: async (pool_id: string, user: string, latest_ledger_close: number) => {
    try {
      const stellar = get().rpcServer();
      const network = get().passphrase;
      const reserve_map = get().poolData.get(pool_id)?.reserves;
      const reserveEmissionData = get().poolData.get(pool_id)?.reserveEmissions;

      if (!reserve_map || !reserveEmissionData) {
        throw Error('unknown pool');
      }
      const user_reserve_balances = await loadUserForPool(
        stellar,
        network,
        pool_id,
        reserve_map,
        user
      );

      let total_user_emissions = BigInt(0);
      let userEmissionMap = new Map<number, UserReserveEmission>();
      for (const entry of Array.from(reserve_map.entries())) {
        const reserve = entry[1];
        const liability_token_index = reserve.config.index * 2;
        const supply_token_index = reserve.config.index * 2 + 1;

        let reserve_liability_emis_data = reserveEmissionData.get(liability_token_index);
        let user_liability_emis_data = await loadUserReserveEmissions(
          stellar,
          liability_token_index,
          user,
          pool_id
        );
        if (user_liability_emis_data && reserve_liability_emis_data) {
          total_user_emissions += user_liability_emis_data.accrued;
          userEmissionMap.set(liability_token_index, user_liability_emis_data);
        }

        let reserve_supply_emis_data = reserveEmissionData.get(supply_token_index);
        let user_supply_emis_data = await loadUserReserveEmissions(
          stellar,
          supply_token_index,
          user,
          pool_id
        );
        if (user_supply_emis_data && reserve_supply_emis_data) {
          total_user_emissions += user_supply_emis_data.accrued;
          userEmissionMap.set(supply_token_index, user_supply_emis_data);
        }
      }
      useStore.setState((prev) => ({
        poolUserData: new Map(prev.poolUserData).set(pool_id, {
          reserveBalances: user_reserve_balances,
          emissionsData: userEmissionMap,
          totalEmissions: total_user_emissions,
          lastUpdated: latest_ledger_close,
        }),
      }));
    } catch (e) {
      console.error('unable to refresh user emission data', e);
    }
  },
});

/********** Contract Data Helpers **********/

async function loadPool(stellar: Server, pool_id: string): Promise<Pool> {
  try {
    // const contractInstanceXDR = xdr.LedgerKey.contractData(
    //   new xdr.LedgerKeyContractData({
    //     contract: Address.fromString(pool_id).toScAddress(),
    //     key: xdr.ScVal.scvLedgerKeyContractInstance(),
    //     durability: xdr.ContractDataDurability.persistent(),
    //     bodyType: xdr.ContractEntryBodyType.dataEntry(),
    //   })
    // );
    // const entries_results = (await stellar.getLedgerEntries([contractInstanceXDR])).entries ?? [];
    // let instance_entry = xdr.LedgerEntryData.fromXDR(entries_results[0].xdr, 'base64')
    //   .contractData()
    //   .body()
    //   .data()
    //   .val()
    //   .instance()
    //   .storage();
    // if (instance_entry == undefined) {
    //   throw Error('unable to load pool instance');
    // }
    // console.log(JSON.stringify(instance_entry));
    let admin = 'GBL7YWXVK666DA74WNK2ZVLMYEWPOF22AVBXUGUMXP2Y64QVCSG5MSN3';
    let name = 'Teapot';
    let pool_config = new Pool.PoolConfig(
      10000000,
      'CBHUDJEU424QFNEHL3APGZBXRRPURAYR5FDMQXW6O6WUVUNK3R25LAJ3',
      0
    );

    // let config_datakey = Pool.PoolDataKeyToXDR({ tag: 'PoolConfig' });
    // config_datakey = xdr.ScVal.fromXDR(config_datakey.toXDR());
    // let config_entry = await stellar.getContractData(pool_id, config_datakey);
    // let pool_config = Pool.PoolConfig.fromContractDataXDR(config_entry.xdr);

    // let admin_datakey = Pool.PoolDataKeyToXDR({ tag: 'Admin' });
    // admin_datakey = xdr.ScVal.fromXDR(admin_datakey.toXDR());
    // let admin_entry = await stellar.getContractData(pool_id, admin_datakey);
    // let admin = data_entry_converter.toString(admin_entry.xdr);

    let res_list_datakey = Pool.PoolDataKeyToXDR({ tag: 'ResList' });
    res_list_datakey = xdr.ScVal.fromXDR(res_list_datakey.toXDR());
    let res_list_entry = await stellar.getContractData(pool_id, res_list_datakey);
    let res_list = data_entry_converter.toStringArray(res_list_entry.xdr, 'hex');

    // let name_datakey = Pool.PoolDataKeyToXDR({ tag: 'Name' });
    // name_datakey = xdr.ScVal.fromXDR(name_datakey.toXDR());
    // let name_entry = await stellar.getContractData(pool_id, name_datakey);
    // let name = data_entry_converter.toString(name_entry.xdr, 'utf-8');

    return {
      id: pool_id,
      name,
      admin: admin,
      config: pool_config,
      reserves: res_list,
    };
  } catch (e) {
    console.error(`unable to load pool: ${pool_id}`, e);
    throw Error();
  }
}

async function loadReservesForPool(
  stellar: Server,
  network: string,
  pool: Pool
): Promise<Map<string, Pool.Reserve>> {
  let reserve_map = new Map<string, Pool.Reserve>();
  for (const asset_id of pool.reserves) {
    try {
      // load config
      let config_datakey = Pool.PoolDataKeyToXDR({ tag: 'ResConfig', values: [asset_id] });
      config_datakey = xdr.ScVal.fromXDR(config_datakey.toXDR());
      let config_entry = await stellar.getContractData(pool.id, config_datakey);
      let reserve_config = Pool.ReserveConfig.fromContractDataXDR(config_entry.xdr);
      // load data
      let data_datakey = Pool.PoolDataKeyToXDR({ tag: 'ResData', values: [asset_id] });
      data_datakey = xdr.ScVal.fromXDR(data_datakey.toXDR());
      let data_entry = await stellar.getContractData(pool.id, data_datakey);
      let reserve_data = Pool.ReserveData.fromContractDataXDR(data_entry.xdr);
      // TODO: Find a better way to do this...
      let symbol: string = TOKEN_META[asset_id as keyof typeof TOKEN_META]?.code ?? 'unknown';
      console.log(asset_id);
      console.log(symbol);
      console.log(JSON.stringify(reserve_data, null, 2));
      // load token information
      let pool_balance = await getTokenBalance(
        stellar,
        network,
        asset_id,
        Address.fromString(pool.id)
      );
      let reserve = new Pool.Reserve(asset_id, symbol, pool_balance, reserve_config, reserve_data);
      // add reserve object to map
      reserve_map.set(asset_id, reserve);
    } catch (e) {
      console.error(`failed to load reserve ${asset_id}: `, e);
    }
  }
  return reserve_map;
}

async function loadUserForPool(
  stellar: Server,
  network: string,
  pool_id: string,
  reserves: Map<string, Pool.Reserve>,
  user_id: string
): Promise<Map<string, ReserveBalance>> {
  let user_balance_map = new Map<string, ReserveBalance>();
  try {
    let user_address = new Address(user_id);
    let positions_datakey = Pool.PoolDataKeyToXDR({ tag: 'Positions', values: [user_id] });
    positions_datakey = xdr.ScVal.fromXDR(positions_datakey.toXDR());
    let user_positions: Pool.Positions | undefined;

    try {
      let user_config_entry = await stellar.getContractData(pool_id, positions_datakey);
      user_positions = Pool.PositionsFromXDR(user_config_entry.xdr);
    } catch {
      // user has not touched pool yet
      console.error('unable to refresh user positions');
      user_positions = undefined;
    }
    for (const res_entry of Array.from(reserves.entries())) {
      try {
        let asset_id = res_entry[0];
        let reserve = res_entry[1];
        let config_index = reserve.config.index;
        let asset_balance = await getTokenBalance(stellar, network, asset_id, user_address);
        let supply = BigInt(0);
        let liability = BigInt(0);
        if (user_positions) {
          supply = user_positions.collateral.get(config_index) ?? BigInt(0);
          liability = user_positions.liabilities.get(config_index) ?? BigInt(0);
        }
        user_balance_map.set(asset_id, {
          asset: asset_balance,
          b_token: supply,
          d_token: liability,
        });
      } catch (e) {
        console.error(`failed to update user data for ${res_entry[0]}: `, e);
      }
    }
  } catch (e) {
    console.error('TODO: Write an error', e);
  }
  return user_balance_map;
}

async function loadOraclePrices(stellar: Server, pool: Pool): Promise<Map<string, number>> {
  let price_map = new Map<string, number>();
  let decimals = 7;
  for (const asset_id of pool.reserves) {
    try {
      let price_datakey = xdr.ScVal.scvVec([
        xdr.ScVal.scvSymbol('Prices'),
        Address.fromString(asset_id).toScVal(),
      ]);
      let price_entry = await stellar.getContractData(
        pool.config.oracle,
        price_datakey,
        Durability.Temporary
      );
      let priceData = Oracle.PriceDataFromXDR(price_entry.xdr);

      let price = Number(priceData.price) / 10 ** decimals;
      price_map.set(asset_id, price);
    } catch (e: any) {
      console.error(`unable to fetch a price for ${asset_id}:`, e);
    }
  }
  return price_map;
}

async function loadReserveEmissions(
  stellar: Server,
  reserve_token_index: number,
  pool_id: string
): Promise<ReserveEmission | undefined> {
  try {
    let emissionConfigKey = Pool.PoolDataKeyToXDR({
      tag: 'EmisConfig',
      values: [reserve_token_index],
    });
    emissionConfigKey = xdr.ScVal.fromXDR(emissionConfigKey.toXDR());
    let emissionConfigEntry = await stellar.getContractData(pool_id, emissionConfigKey);
    if (emissionConfigEntry == undefined) {
      return undefined;
    }

    let emissionDataKey = Pool.PoolDataKeyToXDR({ tag: 'EmisData', values: [reserve_token_index] });
    emissionDataKey = xdr.ScVal.fromXDR(emissionDataKey.toXDR());
    let emis_data_entry = await stellar.getContractData(pool_id, emissionDataKey);

    let emissionData = Pool.ReserveEmissionsDataFromXDR(emis_data_entry.xdr);
    let emissionConfig = Pool.ReserveEmissionsConfigFromXDR(emissionConfigEntry.xdr);

    return {
      eps: emissionConfig.eps,
      reserveIndex: emissionData.index,
      lastTime: emissionData.last_time,
      expiration: emissionConfig.expiration,
    };
  } catch (e) {
    // console.error('unable to fetch reserve emission data', e);
  }
}

async function loadPoolEmissionData(
  stellar: Server,
  pool_id: string,
  reserves: Pool.Reserve[]
): Promise<Map<number, ReserveEmission>> {
  let reserveEmissionMap = new Map<number, ReserveEmission>();
  try {
    for (const reserve of reserves) {
      const liability_token_index = reserve.config.index * 2;
      const supply_token_index = reserve.config.index * 2 + 1;
      let liability_emis_data = await loadReserveEmissions(stellar, liability_token_index, pool_id);
      if (liability_emis_data) {
        reserveEmissionMap.set(liability_token_index, liability_emis_data);
      }

      let supply_emis_data = await loadReserveEmissions(stellar, supply_token_index, pool_id);
      if (supply_emis_data) {
        reserveEmissionMap.set(supply_token_index, supply_emis_data);
      }
    }
  } catch (e) {
    // console.error('unable to refresh reserve emission data', e);
  }
  return reserveEmissionMap;
}

async function loadUserReserveEmissions(
  stellar: Server,
  reserve_token_index: number,
  user: string,
  pool_id: string
): Promise<UserReserveEmission | undefined> {
  try {
    let userDataKey = Pool.PoolDataKeyToXDR({
      tag: 'UserEmis',
      values: [{ user, reserve_id: reserve_token_index }],
    });
    userDataKey = xdr.ScVal.fromXDR(userDataKey.toXDR());
    let userDataEntry = await stellar.getContractData(pool_id, userDataKey);
    const userEmission = Pool.UserEmissionDataFromXDR(userDataEntry.xdr);
    return {
      userIndex: userEmission.index,
      accrued: userEmission.accrued,
    };
  } catch (e) {
    // console.error('unable to fetch user reserve emission data', e, reserve_token_index);
  }
}
