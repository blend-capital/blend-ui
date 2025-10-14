import { AuctionType, Pool, ScaledAuction } from '@blend-capital/blend-sdk';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Box, Typography, useTheme } from '@mui/material';
import { useMemo } from 'react';
import { useBackstop, usePoolOracle } from '../../hooks/api';
import { estAuction } from '../../utils/auction';
import { toCompactAddress } from '../../utils/formatter';
import { DividerSection } from '../common/DividerSection';
import { PoolComponentProps } from '../common/PoolComponentProps';
import { Row } from '../common/Row';
import { Section, SectionSize } from '../common/Section';
import { StackedText } from '../common/StackedText';
import { StackedTextBox } from '../common/StackedTextBox';
import { BidList } from './BidList';
import { LotList } from './LotList';

export interface FilledAuctionCardProps extends PoolComponentProps {
  pool: Pool;
  auction: ScaledAuction;
  index: number;
}

export const FilledAuctionCard: React.FC<FilledAuctionCardProps> = ({ pool, auction, sx }) => {
  const theme = useTheme();
  const { data: poolOracle } = usePoolOracle(pool);
  const { data: backstop } = useBackstop(pool.version);

  const { auctionEstimate } = useMemo(() => {
    const auctionEstimate = estAuction(
      auction.data,
      auction.type,
      pool,
      poolOracle,
      backstop?.backstopToken.lpTokenPrice
    );
    return {
      auctionEstimate,
    };
  }, [auction, poolOracle, backstop, pool]);

  return (
    <Section width={SectionSize.FULL} sx={{ flexDirection: 'column', marginBottom: '12px', ...sx }}>
      <Box
        sx={{
          width: '100%',
        }}
      >
        <Row>
          <Box
            sx={{
              margin: '6px',
              padding: '6px',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Typography variant="h3" sx={{ marginRight: '12px' }}>
              Auction {toCompactAddress(auction.user)}
            </Typography>
            <Box
              sx={{
                padding: '4px',
                color: theme.palette.positive.main,
                background: theme.palette.positive.opaque,
                borderRadius: '5px',
                lineHeight: '100%',
              }}
            >
              *{AuctionType[auction.type]}*
            </Box>
          </Box>
        </Row>
        <Row>
          <StackedTextBox name="Started" text={` ${auction.data.block} `} sx={{ width: '50%' }} />
          <Box
            sx={{
              width: '50%',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px',
              margin: '6px',
              borderRadius: '5px',
              color: theme.palette.text.primary,
              background: theme.palette.background.default,
            }}
          >
            <StackedText
              title={'Block Filled'}
              text={`${auction.scaleBlock}`}
              textColor="inherit"
              sx={{ width: '50%', padding: '6px' }}
            />
            <Box
              component="a"
              href={`${process.env.NEXT_PUBLIC_STELLAR_EXPERT_URL}/tx/${auction.fillHash}`}
              target="_blank"
              rel="noopener"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px',
                paddingLeft: '12px',
                paddingRight: '12px',
                margin: '6px',
                borderRadius: '5px',
                color: theme.palette.text.primary,
                textDecoration: 'none',
                '&:hover': {
                  color: theme.palette.positive.main,
                  cursor: 'pointer',
                },
              }}
            >
              <Typography variant="body2">View</Typography>
              <OpenInNewIcon fontSize="inherit" />
            </Box>
          </Box>
        </Row>
      </Box>
      <LotList
        pool={pool}
        lot={auctionEstimate?.lot ?? new Map()}
        lotValue={auctionEstimate?.lotValue ?? new Map()}
        type={
          auction.type === AuctionType.Interest || auction.type === AuctionType.BadDebt
            ? 'Underlying'
            : 'Collateral'
        }
      />
      <DividerSection />
      <BidList
        pool={pool}
        bid={auctionEstimate?.bid ?? new Map()}
        bidValue={auctionEstimate?.bidValue ?? new Map()}
        type={auction.type === AuctionType.Interest ? 'Underlying' : 'Liability'}
      />

      <Box
        sx={{
          margin: '6px',
          padding: '6px',
          color: theme.palette.positive.main,
          background: theme.palette.positive.opaque,
          borderRadius: '5px',
        }}
      >
        <Typography variant="body1" align="center">
          Filled
        </Typography>
      </Box>
    </Section>
  );
};
