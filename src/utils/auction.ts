import { AuctionData, AuctionType, FixedMath, Pool, PoolOracle } from '@blend-capital/blend-sdk';

/**
 * The auction normalized to underlying assets and their oracle values. The underlying assets are calculated based
 * on the current pool state. For old auctions, this might be slightly different than the actual assets transferred.
 * However, this is assumed to be OK to prevent a lot of complexity in tracking historical pool states. In general usage,
 * assets don't change much over a short period of time.
 */
export interface AuctionEstimates {
  /**
   * The lot assets and amount in underlying, using the most recent pool state
   */
  lot: Map<string, number>;
  /**
   * The bid assets and amount in underlying, using the most recent pool state
   */
  bid: Map<string, number>;
  /**
   * The lot assets and value in USD, using the most recent pool state and oracle prices.
   *
   * Contains 0 if the oracle price is not available for an asset.
   */
  lotValue: Map<string, number>;
  /**
   * The bid assets and value in USD, using the most recent pool state and oracle prices
   *
   * Contains 0 if the oracle price is not available for an asset.
   */
  bidValue: Map<string, number>;
  /**
   * The total lot value in USD. This is the sum of all lotValue entries.
   *
   * Is 0 if oracle prices are not available.
   */
  totalLotValue: number;
  /**
   * The total bid value in USD. This is the sum of all bidValue entries.
   *
   * Is 0 if oracle prices are not available.
   */
  totalBidValue: number;
}

/**
 * Calculate the auction estimates based on the current pool state and oracle prices. If no oracle price exists,
 * the value estimates will be 0.
 *
 * If the pool does not contain a reserve for an asset in the auction when expected, undefined is returned.
 *
 * @param auction The auction data
 * @param type The auction type
 * @param pool The pool the auction belongs to
 * @param oracle The pool oracle, or undefined if not available
 * @param backstopTokenPrice The backstop token price, or undefined if not available
 * @returns The auction estimates, or undefined
 */
export function estAuction(
  auction: AuctionData,
  type: AuctionType,
  pool: Pool,
  oracle: PoolOracle | undefined,
  backstopTokenPrice: number | undefined
): AuctionEstimates | undefined {
  let lot = new Map<string, number>();
  let lotValue = new Map<string, number>();
  let bid = new Map<string, number>();
  let bidValue = new Map<string, number>();
  let totalLotValue = 0;
  let totalBidValue = 0;

  // @dev: The incoming data is loaded asynchronously, so while typescript thinks it's fine
  // there is a chance it's undefined at runtime
  if (pool === undefined || auction == undefined) {
    return undefined;
  }

  // process lot
  for (const [asset, amount] of Array.from(auction.lot.entries())) {
    // default to 0 to ensure missing oracle prices are recorded as 0 value
    const price = oracle?.getPriceFloat(asset) ?? 0;
    switch (type) {
      case AuctionType.BadDebt: {
        const underlying = FixedMath.toFloat(amount, 7);
        const value = underlying * (backstopTokenPrice ?? 0);
        lot.set(asset, underlying);
        lotValue.set(asset, value);
        totalLotValue += value;
        break;
      }
      case AuctionType.Interest: {
        const reserve = pool.reserves.get(asset);
        const underlying = FixedMath.toFloat(amount, reserve?.config.decimals);
        const value = underlying * price;
        lot.set(asset, underlying);
        lotValue.set(asset, value);
        totalLotValue += value;
        break;
      }
      case AuctionType.Liquidation: {
        const reserve = pool.reserves.get(asset);
        if (!reserve) {
          console.error(`Reserve not found for lot asset ${asset} in auction`);
          return undefined;
        }
        const underlying = reserve.toAssetFromBTokenFloat(amount);
        const value = underlying * price;
        lot.set(asset, underlying);
        lotValue.set(asset, value);
        totalLotValue += value;
        break;
      }
    }
  }

  for (const [asset, amount] of Array.from(auction.bid.entries())) {
    switch (type) {
      case AuctionType.Interest: {
        const underlying = FixedMath.toFloat(amount, 7);
        const value = underlying * (backstopTokenPrice ?? 0);
        bid.set(asset, underlying);
        bidValue.set(asset, value);
        totalBidValue += value;
        break;
      }
      default: {
        const price = oracle?.getPriceFloat(asset) ?? 0;
        const reserve = pool.reserves.get(asset);
        if (!reserve) {
          console.error(`Reserve not found for bid asset ${asset} in auction`);
          return undefined;
        }
        const underlying = reserve.toAssetFromDTokenFloat(amount);
        const value = underlying * price;
        bid.set(asset, underlying);
        bidValue.set(asset, value);
        totalBidValue += value;
        break;
      }
    }
  }
  return {
    lot,
    lotValue,
    bid,
    bidValue,
    totalLotValue,
    totalBidValue,
  };
}
