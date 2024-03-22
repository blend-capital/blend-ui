import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Box, Collapse, Skeleton, useTheme } from '@mui/material';
import { useState } from 'react';
import { useStore } from '../../store/store';
import { toBalance } from '../../utils/formatter';
import { LinkBox } from '../common/LinkBox';
import { OpaqueButton } from '../common/OpaqueButton';
import { PoolComponentProps } from '../common/PoolComponentProps';
import { Row } from '../common/Row';
import { Section, SectionSize } from '../common/Section';
import { StackedTextHLBox } from '../common/StackedTextHLBox';
import { TokenIcon } from '../common/TokenIcon';
import { PoolHeader } from '../pool/PoolHeader';
import { MarketCardCollapse } from './MarketCardCollapse';

export const MarketCard: React.FC<PoolComponentProps> = ({ poolId, sx }) => {
  const theme = useTheme();

  const poolData = useStore((state) => state.pools.get(poolId));
  const backstopPoolData = useStore((state) => state.backstop?.pools.get(poolId));

  const [expand, setExpand] = useState(false);
  const [rotateArrow, setRotateArrow] = useState(false);

  const rotate = rotateArrow ? 'rotate(180deg)' : 'rotate(0)';

  if (!poolData || !backstopPoolData) {
    return (
      <Section
        width={SectionSize.FULL}
        sx={{ flexDirection: 'column', marginBottom: '12px', ...sx }}
      >
        <Skeleton variant="rectangular" />
      </Section>
    );
  }

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
          <PoolHeader name={poolData.config.name} sx={{ margin: '6px', padding: '6px' }} />
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
            text={`$${toBalance(
              isFinite(poolData.estimates.totalSupply) ? poolData.estimates.totalSupply : 0
            )}`}
            palette={theme.palette.lend}
            sx={{ width: '33.33%' }}
          ></StackedTextHLBox>
          <StackedTextHLBox
            name="Borrowed"
            text={`$${toBalance(
              isFinite(poolData.estimates.totalBorrow) ? poolData.estimates.totalBorrow : 0
            )}`}
            palette={theme.palette.borrow}
            sx={{ width: '33.33%' }}
          ></StackedTextHLBox>
          <StackedTextHLBox
            name="Backstop"
            text={`$${toBalance(
              isFinite(backstopPoolData.estimates.totalSpotValue)
                ? backstopPoolData.estimates.totalSpotValue
                : 0
            )}`}
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
              {poolData.config.reserveList.map((reserveId) => {
                return (
                  <TokenIcon
                    assetId={reserveId}
                    key={reserveId}
                    symbol={reserveId}
                    sx={{ marginRight: '6px' }}
                  />
                );
              })}
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
      <Collapse in={expand} sx={{ width: '100%' }}>
        <MarketCardCollapse
          poolData={poolData}
          backstopPoolData={backstopPoolData}
        ></MarketCardCollapse>
      </Collapse>
    </Section>
  );
};
