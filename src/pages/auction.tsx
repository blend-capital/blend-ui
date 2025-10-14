import {
  Auctions,
  getAuctionsfromV1Events,
  getAuctionsfromV2Events,
  PoolV1Event,
  PoolV2Event,
  Version,
} from '@blend-capital/blend-sdk';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningIcon from '@mui/icons-material/Warning';
import { Box, Typography, useTheme } from '@mui/material';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { FilledAuctionCard } from '../components/auction/FilledAuctionCard';
import { OngoingAuctionCard } from '../components/auction/OngoingAuctionCard';
import { Divider } from '../components/common/Divider';
import { Row } from '../components/common/Row';
import { Section, SectionSize } from '../components/common/Section';
import { Skeleton } from '../components/common/Skeleton';
import { NotPoolBar } from '../components/pool/NotPoolBar';
import { PoolExploreBar } from '../components/pool/PoolExploreBar';
import { PoolOracleError } from '../components/pool/PoolOracleErrorBanner';
import { TxStatus, useWallet } from '../contexts/wallet';
import {
  useAuctionEventsLongQuery,
  useAuctionEventsShortQuery,
  useBackstop,
  usePool,
  usePoolMeta,
  usePoolOracle,
} from '../hooks/api';
import { NOT_BLEND_POOL_ERROR_MESSAGE } from '../hooks/types';

const Auction: NextPage = () => {
  const theme = useTheme();
  const router = useRouter();
  const { poolId } = router.query;
  const safePoolId = typeof poolId == 'string' && /^[0-9A-Z]{56}$/.test(poolId) ? poolId : '';
  const { txStatus } = useWallet();

  const { data: poolMeta, error: poolError } = usePoolMeta(safePoolId);
  const { data: pool, isError: isPoolLoadingError } = usePool(poolMeta);
  const { isError: isOracleError } = usePoolOracle(pool);
  const { data: backstop } = useBackstop(poolMeta?.version);
  let { data: pastEvents, isError: isLongEventsError } = useAuctionEventsLongQuery(poolMeta);
  const {
    data: recentEvents,
    refetch: refetchShortEvents,
    isError: isShortEventsError,
  } = useAuctionEventsShortQuery(
    poolMeta,
    pastEvents?.latestLedger ?? 0,
    pastEvents !== undefined && pastEvents.latestLedger > 0
  );

  const allEvents = [...(pastEvents?.events ?? []), ...(recentEvents?.events ?? [])];
  // ensure events are sorted in ascending order by ledger
  allEvents.sort((a, b) => a.ledger - b.ledger);
  let auctions: Auctions = { filled: [], ongoing: [] };
  if (pool && backstop) {
    if (poolMeta?.version === Version.V1) {
      auctions = getAuctionsfromV1Events(allEvents as PoolV1Event[], backstop.id);
    } else {
      auctions = getAuctionsfromV2Events(allEvents as PoolV2Event[]);
    }
  }
  const curLedger = recentEvents?.latestLedger ?? pastEvents?.latestLedger ?? 0;

  useEffect(() => {
    if (txStatus === TxStatus.SUCCESS) {
      refetchShortEvents();
    }
  }, [txStatus, refetchShortEvents]);

  const hasData = pool && backstop && pastEvents !== undefined;
  const hasAuctions = auctions.filled.length > 0 || auctions.ongoing.length > 0;
  const hasError = isPoolLoadingError || isLongEventsError || isShortEventsError;

  if (poolError?.message === NOT_BLEND_POOL_ERROR_MESSAGE) {
    return <NotPoolBar poolId={safePoolId} />;
  }

  return (
    <>
      <Row>
        <PoolExploreBar poolId={safePoolId} />
      </Row>
      <Divider />
      {isOracleError && (
        <Row>
          <PoolOracleError />
        </Row>
      )}
      {hasData ? (
        hasAuctions ? (
          <>
            {auctions.ongoing.map((auction, index) => {
              return (
                <OngoingAuctionCard
                  key={index}
                  index={index}
                  auction={auction}
                  poolId={safePoolId}
                  pool={pool}
                  currLedger={curLedger}
                />
              );
            })}
            {auctions.filled.reverse().map((auction, index) => {
              return (
                <FilledAuctionCard
                  key={index}
                  index={index}
                  auction={auction}
                  poolId={safePoolId}
                  pool={pool}
                />
              );
            })}
          </>
        ) : (
          <Section
            width={SectionSize.FULL}
            sx={{
              background: theme.palette.info.opaque,
              color: theme.palette.text.primary,
              display: 'flex',
              justifyContent: 'flex-start',
              alignItems: 'center',
              padding: '12px',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-start',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <InfoOutlinedIcon />
              <Typography variant="body2">No recent auctions found for this pool.</Typography>
            </Box>
          </Section>
        )
      ) : hasError ? (
        <Section
          width={SectionSize.FULL}
          sx={{
            background: theme.palette.warning.opaque,
            color: theme.palette.warning.main,
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'center',
            padding: '12px',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-start',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <WarningIcon />
            <Typography variant="body2">
              Unable to load auctions for this pool. Please check back later.
            </Typography>
          </Box>
        </Section>
      ) : (
        <Skeleton />
      )}
    </>
  );
};

export default Auction;
