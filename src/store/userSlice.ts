import { BackstopUser, PoolUser, Reserve } from '@blend-capital/blend-sdk';
import { Address, Asset, Horizon } from 'stellar-sdk';
import { StateCreator } from 'zustand';
import { getTokenMetadataFromTOML, StellarTokenMetadata } from '../external/stellar-toml';
import { getTokenBalance } from '../external/token';
import { BLEND_TESTNET_ASSET, USDC_TESTNET_ASSET } from '../utils/token_display';
import { DataStore } from './store';

/**
 * Ledger state for the Blend protocol
 */
export interface UserSlice {
  account: Horizon.AccountResponse | undefined;
  isFunded: boolean | undefined;
  balances: Map<string, bigint>;
  hasTrustline: Map<string, boolean>;
  assetStellarMetadata: Map<string, StellarTokenMetadata>;
  backstopUserData: BackstopUser | undefined;
  userPoolData: Map<string, PoolUser>;

  loadUserData: (id: string) => Promise<void>;
  clearUserData: () => void;
}

export const createUserSlice: StateCreator<DataStore, [], [], UserSlice> = (set, get) => ({
  account: undefined,
  isFunded: undefined,
  balances: new Map<string, bigint>(),
  hasTrustline: new Map<string, boolean>(),
  assetStellarMetadata: new Map<string, StellarTokenMetadata>(),
  backstopUserData: undefined,
  userPoolData: new Map<string, PoolUser>(),

  loadUserData: async (id: string) => {
    try {
      const network = get().network;
      const rpc = get().rpcServer();
      const networkPassphrase = network.passphrase;

      if (get().latestLedgerTimestamp == 0) {
        await get().loadBlendData(true);
      }

      const backstop = get().backstop;
      const pools = get().pools;

      if (backstop == undefined || pools.size == 0) {
        throw new Error('Unable to fetch backstop or pool data');
      }

      // load horizon account
      let account: Horizon.AccountResponse;
      let horizonServer;
      try {
        horizonServer = get().horizonServer();
        account = await horizonServer.loadAccount(id);
      } catch (e) {
        console.error('Account does not exist.');
        set({ isFunded: false });
        throw e;
      }

      // load user data for backstop
      let backstop_user = await backstop.loadUser(network, id);

      // load pool data for user for each tracked pool
      // load token balances for each unique reserve or fetch from the account response
      let user_pool_data = new Map<string, PoolUser>();
      let user_balances = new Map<string, bigint>();
      let hasTrustline = new Map<string, boolean>();
      let assetStellarMetadata = new Map<string, StellarTokenMetadata>();
      /**load usdc and blend balances manually first  */
      const usdcReserve: Asset = new Asset(
        USDC_TESTNET_ASSET.asset_code,
        USDC_TESTNET_ASSET.asset_issuer
      );
      const usdcAssetId = usdcReserve.contractId(networkPassphrase);
      if (!!horizonServer) {
        let metadata = await getTokenMetadataFromTOML(horizonServer, {
          assetId: usdcAssetId,
          tokenMetadata: {
            asset: usdcReserve,
            name: usdcReserve.code,
            symbol: usdcReserve.code,
            decimals: 7,
          },
        } as Reserve);
        assetStellarMetadata.set(usdcAssetId, metadata);
      }

      //  fetch USDC balance from account response
      let usdcBalanceLine = account.balances.find((balance) => {
        return (
          // @ts-ignore
          balance.asset_code === usdcReserve.code &&
          // @ts-ignore
          balance.asset_issuer === usdcReserve.issuer
        );
      });
      let usdcBalanceString = usdcBalanceLine ? usdcBalanceLine.balance.replace('.', '') : '0';
      user_balances.set(usdcReserve.contractId(networkPassphrase), BigInt(usdcBalanceString));
      const blendReserve = new Asset(
        BLEND_TESTNET_ASSET.asset_code,
        BLEND_TESTNET_ASSET.asset_issuer
      );
      const blendAssetId = blendReserve.contractId(networkPassphrase);
      if (!!horizonServer) {
        let metadata = await getTokenMetadataFromTOML(horizonServer, {
          assetId: blendAssetId,
          tokenMetadata: {
            asset: blendReserve,
            name: 'Blend',
            symbol: blendReserve.code,
            decimals: 7,
          },
        } as Reserve);
        assetStellarMetadata.set(blendAssetId, metadata);
      }
      //  fetch USDC balance from account response
      let blendBalanceLine = account.balances.find((balance) => {
        return (
          // @ts-ignore
          balance.asset_code === blendReserve.code &&
          // @ts-ignore
          balance.asset_issuer === blendReserve.issuer
        );
      });
      let blendBalanceString = blendBalanceLine ? blendBalanceLine.balance.replace('.', '') : '0';
      user_balances.set(blendReserve.contractId(networkPassphrase), BigInt(blendBalanceString));

      for (let [pool, pool_data] of Array.from(pools.entries())) {
        let pool_user = await pool_data.loadUser(network, id);
        user_pool_data.set(pool, pool_user);
        const poolReserves = Array.from(pool_data.reserves.values());
        for (let reserve of poolReserves) {
          if (user_balances.has(reserve.assetId)) {
            // duplicate reserve from another pool, skip
            continue;
          }
          if (!!horizonServer) {
            let metadata = await getTokenMetadataFromTOML(horizonServer, reserve);
            assetStellarMetadata.set(reserve.assetId, metadata);
          }
          if (reserve.tokenMetadata.asset != undefined) {
            // stellar asset, fetch balance from account response
            let balance_line = account.balances.find((balance) => {
              if (balance.asset_type == 'native') {
                hasTrustline.set(reserve.assetId, true);
                // @ts-ignore
                return reserve.tokenMetadata.asset.isNative();
              }
              return (
                // @ts-ignore
                balance.asset_code === reserve.tokenMetadata.asset.getCode() &&
                // @ts-ignore
                balance.asset_issuer === reserve.tokenMetadata.asset.getIssuer()
              );
            });

            if (!!balance_line?.balance) {
              hasTrustline.set(reserve.assetId, true);
            } else {
              hasTrustline.set(reserve.assetId, false);
            }
            let balance_string = balance_line ? balance_line.balance.replace('.', '') : '0';
            user_balances.set(reserve.assetId, BigInt(balance_string));
            // load icon
          } else {
            let balance = await getTokenBalance(
              rpc,
              network.passphrase,
              reserve.assetId,
              new Address(id)
            );
            hasTrustline.set(reserve.assetId, balance > BigInt(0));
            user_balances.set(reserve.assetId, balance);
          }
        }
      }
      set({
        account,
        isFunded: true,
        balances: user_balances,
        backstopUserData: backstop_user,
        userPoolData: user_pool_data,
        hasTrustline,
        assetStellarMetadata,
      });
    } catch (e) {
      console.error('Unable to load user data');
      console.error(e);
    }
  },
  clearUserData: () => {
    set({
      account: undefined,
      balances: new Map<string, bigint>(),
      backstopUserData: undefined,
      userPoolData: new Map<string, PoolUser>(),
    });
  },
});
