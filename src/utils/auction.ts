import {
  AuctionData,
  BackstopToken,
  FixedMath,
  Pool,
  PoolEvent,
  PoolEventType,
  PoolOracle,
} from '@blend-capital/blend-sdk';
export enum AuctionType {
  Liquidation = 0,
  BadDebt = 1,
  Interest = 2,
}

export interface AuctionDisplay {
  auctionData: AuctionData;
  auctionType: AuctionType;
  user: string;
  bidValue: number;
  lotValue: number;
  timestamp: string;
  filled: boolean;
  blockFilled?: number;
}

export function processAuctionEvents(
  events: PoolEvent[],
  poolOracle: PoolOracle,
  pool: Pool,
  backstopToken: BackstopToken,
  currLedger: number
): AuctionDisplay[] {
  let auctions: AuctionDisplay[] = [];
  for (const event of events ?? []) {
    switch (event.eventType) {
      case PoolEventType.NewLiquidationAuction:
        auctions.unshift({
          auctionData: event.auctionData,
          user: event.user,
          auctionType: AuctionType.Liquidation,
          bidValue: 0,
          lotValue: 0,
          timestamp: event.ledgerClosedAt,
          filled: false,
        });
        break;
      case PoolEventType.NewAuction:
        auctions.unshift({
          auctionData: event.auctionData,
          user: pool.config.backstop ?? '',
          auctionType: event.auctionType as AuctionType,
          bidValue: 0,
          lotValue: 0,
          timestamp: event.ledgerClosedAt,
          filled: false,
        });
        break;
      case PoolEventType.FillAuction:
        const index = auctions.findIndex(
          (auction) => auction.user === event.user && auction.auctionType === event.auctionType
        );
        if (index !== -1) {
          let auction = auctions[index];
          if (event.fillAmount < BigInt(100)) {
            auction.auctionData = scaleAuction(
              auction.auctionData,
              event.ledger,
              Number(event.fillAmount)
            );
          } else {
            auction.auctionData = scaleAuction(auction.auctionData, event.ledger, 0);
            auction.filled = true;
            auction.blockFilled = event.ledger;
          }
          auctions[index] = auction;
        }
        break;
      case PoolEventType.DeleteLiquidationAuction:
        const deleteIndex = auctions.findIndex((auction) => auction.user === event.user);
        if (deleteIndex !== -1) {
          auctions.splice(deleteIndex, 1);
        }
        break;
    }
  }
  for (const auction of auctions) {
    if (!auction.filled) {
      auction.auctionData = scaleAuction(auction.auctionData, currLedger, 0);
    }
    auction.lotValue = Array.from(auction.auctionData.lot.entries()).reduce(
      (acc, [asset, amount]) => {
        if (pool.reserves.get(asset) === undefined) {
          return acc + FixedMath.toFloat(amount, 7) * backstopToken.lpTokenPrice;
        }
        return (
          acc +
          FixedMath.toFloat(amount, pool.reserves.get(asset)?.config.decimals) *
            (poolOracle.getPriceFloat(asset) ?? 0)
        );
      },
      0
    );

    auction.bidValue = Array.from(auction.auctionData.bid.entries()).reduce(
      (acc, [asset, amount]) => {
        if (pool.reserves.get(asset) === undefined) {
          return acc + FixedMath.toFloat(amount, 7) * backstopToken.lpTokenPrice;
        }
        return (
          acc +
          FixedMath.toFloat(amount, pool.reserves.get(asset)?.config.decimals) *
            (poolOracle.getPriceFloat(asset) ?? 0)
        );
      },
      0
    );
  }
  return auctions;
}

/**
 * Scale an auction to the block the auction is to be filled and the percent which will be filled.
 * @param auction - The auction to scale
 * @param fillBlock - The block to scale to
 * @param fillPercent - The percent to scale to
 * @returns The scaled auction
 */
export function scaleAuction(
  auction: AuctionData,
  fillBlock: number,
  fillPercent: number
): AuctionData {
  let scaledAuction: AuctionData = {
    block: auction.block,
    bid: new Map(),
    lot: new Map(),
  };
  let lotModifier;
  let bidModifier;
  const fillBlockDelta = fillBlock - auction.block;
  if (fillBlockDelta <= 200) {
    lotModifier = fillBlockDelta / 200;
    bidModifier = 1;
  } else {
    lotModifier = 1;
    if (fillBlockDelta < 400) {
      bidModifier = 1 - (fillBlockDelta - 200) / 200;
    } else {
      bidModifier = 0;
    }
  }
  for (let [assetId, amount] of Array.from(auction.lot)) {
    let scaledLot = Math.floor(Number(amount) * lotModifier * (1 - fillPercent / 100));
    if (scaledLot > 0) {
      scaledAuction.lot.set(assetId, BigInt(scaledLot));
    }
  }

  for (let [assetId, amount] of Array.from(auction.bid)) {
    const scaledBid = Math.ceil(Number(amount) * bidModifier * (1 - fillPercent / 100));
    if (scaledBid > 0) {
      scaledAuction.bid.set(assetId, BigInt(scaledBid));
    }
  }
  return scaledAuction;
}

// export function calculateAuctionProfit(auction: AuctionData, oracle: PoolOracle): number {}
