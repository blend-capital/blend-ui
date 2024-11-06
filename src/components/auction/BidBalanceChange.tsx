import { AuctionType, Pool, PoolUser, Positions } from '@blend-capital/blend-sdk';
import { BoxProps } from '@mui/material';
import { useBackstop, useHorizonAccount, usePoolUser, useTokenBalance } from '../../hooks/api';
import { toBalance } from '../../utils/formatter';
import { ValueChange } from '../common/ValueChange';

export interface BidBalanceChangeProps extends BoxProps {
  pool: Pool;
  bidAmount: bigint;
  auctionType: AuctionType;
  assetId: string;
  newPosition?: Positions;
}

export const BidBalanceChange: React.FC<BidBalanceChangeProps> = ({
  pool,
  bidAmount,
  auctionType,
  assetId,
  newPosition,
}) => {
  const { data: horizonAccount } = useHorizonAccount();
  const { data: backstop } = useBackstop();
  const { data: lpTokenBalance } = useTokenBalance(
    backstop?.backstopToken?.id ?? '',
    undefined,
    horizonAccount,
    auctionType === AuctionType.Interest || auctionType === AuctionType.BadDebt
  );
  const { data: poolUser } = usePoolUser(pool);

  const reserve = pool.reserves.get(assetId);
  switch (auctionType) {
    case AuctionType.Interest:
      if (lpTokenBalance && backstop) {
        return (
          <ValueChange
            title="Lp Token Balance"
            curValue={`${toBalance(lpTokenBalance, 7)}%`}
            newValue={`${toBalance(lpTokenBalance - bidAmount, 7)}%`}
          />
        );
      }
    case AuctionType.BadDebt:
    case AuctionType.Liquidation: {
      if (reserve && poolUser && newPosition) {
        const newPoolUser = new PoolUser(poolUser.userId, newPosition, new Map());
        return (
          <ValueChange
            key={assetId}
            title={`${reserve.tokenMetadata.symbol} liability`}
            curValue={`${toBalance(poolUser?.getLiabilitiesFloat(reserve) ?? 0)} ${
              reserve.tokenMetadata.symbol
            }`}
            newValue={`${toBalance(newPoolUser?.getLiabilitiesFloat(reserve) ?? 0)} ${
              reserve.tokenMetadata.symbol
            }`}
          />
        );
      }
    }
    default:
      return <></>;
  }
};