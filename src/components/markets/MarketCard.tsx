import { BackstopPoolEst, PoolEstimate } from '@blend-capital/blend-sdk';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Box, Collapse, Typography, useTheme } from '@mui/material';
import { useEffect, useState } from 'react';
import { useSettings, ViewType } from '../../contexts';
import {
  useBackstop,
  useBackstopPool,
  usePool,
  usePoolMeta,
  usePoolOracle,
  useTokenMetadataList,
} from '../../hooks/api';
import { toBalance } from '../../utils/formatter';
import { ReserveTokenMetadata } from '../../utils/token';
import { LinkBox } from '../common/LinkBox';
import { OpaqueButton } from '../common/OpaqueButton';
import { PoolComponentProps } from '../common/PoolComponentProps';
import { Row } from '../common/Row';
import { Section, SectionSize } from '../common/Section';
import { Skeleton } from '../common/Skeleton';
import { StackedTextHLBox } from '../common/StackedTextHLBox';
import { TokenIcon } from '../common/TokenIcon';
import { PoolHeader } from '../pool/PoolHeader';
import { PoolHealthBanner } from '../pool/PoolHealthBanner';
import { MarketCardCollapse } from './MarketCardCollapse';

export interface MarketCardProps extends PoolComponentProps {
  index: number;
  onLoaded: (
    poolId: string,
    index: number,
    poolData: {
      name: string;
      poolTvl: number;
      backstopTvl: number;
      tokenMetadataList: ReserveTokenMetadata[];
    }
  ) => void;
}

export const MarketCard: React.FC<MarketCardProps> = ({ poolId, index, onLoaded, sx }) => {
  const theme = useTheme();
  const { trackPool, viewType } = useSettings();

  const { data: poolMeta } = usePoolMeta(poolId);
  const { data: backstop } = useBackstop(poolMeta?.version);
  const { data: pool } = usePool(poolMeta);
  const { data: poolOracle } = usePoolOracle(pool);
  const { data: backstopPool } = useBackstopPool(poolMeta);
  const [expand, setExpand] = useState(false);
  const [rotateArrow, setRotateArrow] = useState(false);
  const rotate = rotateArrow ? 'rotate(180deg)' : 'rotate(0)';

  const isRegularView = viewType === ViewType.REGULAR;

  const tokenMetadataList = useTokenMetadataList(pool ? Array.from(pool.reserves.keys()) : []);

  useEffect(() => {
    if (
      poolMeta !== undefined &&
      pool !== undefined &&
      backstopPool !== undefined &&
      backstop !== undefined &&
      poolOracle !== undefined
    ) {
      const poolEst = poolOracle ? PoolEstimate.build(pool.reserves, poolOracle) : undefined;
      const backstopPoolEst = BackstopPoolEst.build(
        backstop.backstopToken,
        backstopPool.poolBalance
      );
      const processedTokenMetadata: ReserveTokenMetadata[] = tokenMetadataList
        .filter((result) => result.data !== undefined)
        .map((result) => result.data!)
        .filter((data): data is ReserveTokenMetadata => data !== null);

      onLoaded(poolId, index, {
        name: poolMeta.name,
        poolTvl: poolEst ? poolEst.totalSupply - poolEst.totalBorrowed : 0,
        backstopTvl: backstopPoolEst?.totalSpotValue ?? 0,
        tokenMetadataList: processedTokenMetadata,
      });
      trackPool(poolMeta);
    }
  }, [pool, backstopPool, backstop, poolOracle, tokenMetadataList]);

  if (
    poolMeta === undefined ||
    pool === undefined ||
    poolOracle === undefined ||
    backstopPool === undefined ||
    backstop === undefined
  ) {
    return <Skeleton height={'100px'} />;
  }

  const poolEst = poolOracle ? PoolEstimate.build(pool.reserves, poolOracle) : undefined;
  const backstopPoolEst = BackstopPoolEst.build(backstop.backstopToken, backstopPool.poolBalance);
  return (
    <Section width={SectionSize.FULL} sx={{ flexDirection: 'column', marginBottom: '12px', ...sx }}>
      <Box
        onClick={() => {
          setExpand(!expand);
          setRotateArrow(!rotateArrow);
        }}
        sx={{
          width: '100%',
          '&:hover': {
            cursor: 'pointer',
            filter: 'brightness(110%)',
          },
        }}
      >
        <Row>
          <PoolHeader
            name={poolMeta.name}
            version={poolMeta.version}
            sx={{ margin: '6px', padding: '6px' }}
          />

          <Box
            sx={{
              margin: '6px',
              padding: '6px',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Box
              sx={{ color: theme.palette.text.secondary, paddingRight: '12px', lineHeight: '100%' }}
            >
              Details
            </Box>
            <ArrowDropDownIcon
              sx={{
                color: theme.palette.text.secondary,
                transform: rotate,
                transition: 'all 0.2s linear',
              }}
            />
          </Box>
        </Row>
        <Row>
          <StackedTextHLBox
            name="Supplied"
            text={`$${toBalance(poolEst?.totalSupply)}`}
            palette={theme.palette.lend}
            sx={{ width: '33.33%' }}
          ></StackedTextHLBox>
          <StackedTextHLBox
            name="Borrowed"
            text={`$${toBalance(poolEst?.totalBorrowed)}`}
            palette={theme.palette.borrow}
            sx={{ width: '33.33%' }}
          ></StackedTextHLBox>
          <StackedTextHLBox
            name="Backstop"
            text={`$${toBalance(backstopPoolEst.totalSpotValue)}`}
            palette={theme.palette.backstop}
            sx={{ width: '33.33%' }}
          ></StackedTextHLBox>
        </Row>
      </Box>
      <Row>
        <LinkBox
          sx={{ width: '100%', marginRight: '12px' }}
          to={{ pathname: '/dashboard', query: { poolId: poolId } }}
        >
          <OpaqueButton
            palette={theme.palette.primary}
            sx={{
              width: '100%',
              margin: '6px',
              padding: '6px',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Box sx={{ margin: '6px', height: '30px', display: 'flex' }}>
              {Array.from(pool.reserves.values()).map((reserve, index) => {
                if (!isRegularView && index > 3) return null; // Limit to 4 icons
                return (
                  <TokenIcon
                    key={reserve.assetId}
                    assetId={reserve.assetId}
                    sx={{ marginRight: '6px' }}
                  />
                );
              })}
              {!isRegularView && pool.reserves.size > 4 && (
                <Typography variant="body2" alignSelf={'end'}>
                  +{pool.reserves.size - 4}
                </Typography>
              )}
            </Box>
            <Box sx={{ padding: '6px', display: 'flex', flexDirection: 'row', height: '30px' }}>
              <Box sx={{ paddingRight: '12px', lineHeight: '100%' }}>Dashboard</Box>
              <Box>
                <ArrowForwardIcon fontSize="inherit" />
              </Box>
            </Box>
          </OpaqueButton>
        </LinkBox>
      </Row>
      <PoolHealthBanner poolId={poolId} />

      <Collapse in={expand} sx={{ width: '100%' }}>
        <MarketCardCollapse
          pool={pool}
          oracle={poolOracle}
          poolEst={poolEst}
          backstopPool={backstopPool}
          backstopPoolEst={backstopPoolEst}
        ></MarketCardCollapse>
      </Collapse>
    </Section>
  );
};
