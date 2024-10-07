import { BackstopPoolEst, BackstopPoolUserEst } from '@blend-capital/blend-sdk';
import { useTheme } from '@mui/material';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { AuctionCard } from '../components/auction/AuctionCard';
import { Divider } from '../components/common/Divider';
import { GoBackHeader } from '../components/common/GoBackHeader';
import { Row } from '../components/common/Row';
import { Skeleton } from '../components/common/Skeleton';
import {
  useAuctionEventsLongQuery,
  useAuctionEventsShortQuery,
  useBackstop,
  useBackstopPool,
  useBackstopPoolUser,
  useHorizonAccount,
  usePool,
  usePoolOracle,
  useTokenBalance,
} from '../hooks/api';
import { processAuctionEvents } from '../utils/auction';

const Auction: NextPage = () => {
  const theme = useTheme();
  const router = useRouter();
  const { poolId } = router.query;
  const safePoolId = typeof poolId == 'string' && /^[0-9A-Z]{56}$/.test(poolId) ? poolId : '';

  const { data: pool } = usePool(safePoolId);
  const { data: oracle } = usePoolOracle(pool);
  const { data: backstop } = useBackstop();
  const { data: backstopPoolData } = useBackstopPool(safePoolId);
  const { data: userBackstopPoolData } = useBackstopPoolUser(safePoolId);
  const { data: horizonAccount } = useHorizonAccount();
  const { data: lpBalance } = useTokenBalance(
    backstop?.backstopToken?.id ?? '',
    undefined,
    horizonAccount
  );
  let { data: events } = useAuctionEventsLongQuery(safePoolId);
  let curser =
    Array.isArray(events) && events[events.length - 1] ? events[events.length - 1].id : '';
  const { data: recentEvents } = useAuctionEventsShortQuery(safePoolId, curser);
  events = events?.concat(recentEvents?.events ?? []);
  curser = Array.isArray(events) && events[events.length - 1] ? events[events.length - 1].id : '';

  const auctions =
    oracle && pool && backstop
      ? processAuctionEvents(
          events ?? [],
          oracle,
          pool,
          backstop.backstopToken,
          recentEvents?.latestLedger ?? 0
        )
      : [];

  const backstopPoolEst =
    backstop !== undefined && backstopPoolData !== undefined
      ? BackstopPoolEst.build(backstop.backstopToken, backstopPoolData.poolBalance)
      : undefined;

  const backstopUserEst =
    userBackstopPoolData !== undefined && backstop !== undefined && backstopPoolData !== undefined
      ? BackstopPoolUserEst.build(backstop, backstopPoolData, userBackstopPoolData)
      : undefined;
  return (
    <>
      <Row>
        <GoBackHeader name={pool?.config?.name} />
      </Row>
      <Divider />

      {pool !== undefined ? (
        auctions.map((auction, index) => {
          return (
            <AuctionCard
              key={index}
              index={index}
              onLoaded={function (index: number): void {
                throw new Error('Function not implemented.');
              }}
              auctionDisplay={auction}
              poolId={safePoolId}
              pool={pool}
              currLedger={recentEvents?.latestLedger ? recentEvents.latestLedger + 1 : 0}
            />
          );
        })
      ) : (
        <Skeleton />
      )}
      {/* {pool !== undefined ? (
        <AuctionCard
          index={0}
          onLoaded={function (index: number): void {
            throw new Error('Function not implemented.');
          }}
          poolId={''}
          pool={pool}
        />
      ) : (
        <Skeleton />
      )} */}
    </>
  );
};

export default Auction;
