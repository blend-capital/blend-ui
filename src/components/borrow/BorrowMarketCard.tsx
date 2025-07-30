import { FixedMath, Reserve } from '@blend-capital/blend-sdk';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Box, Typography, useTheme } from '@mui/material';
import { ViewType, useSettings } from '../../contexts';
import * as formatter from '../../utils/formatter';

import {
  useBackstop,
  usePool,
  usePoolMeta,
  usePoolOracle,
  useTokenMetadata,
} from '../../hooks/api';
import { estimateEmissionsApr } from '../../utils/math';
import { CustomButton } from '../common/CustomButton';
import { LinkBox } from '../common/LinkBox';
import { PoolComponentProps } from '../common/PoolComponentProps';
import { RateDisplay } from '../common/RateDisplay';
import { SectionBase } from '../common/SectionBase';
import { TokenHeader } from '../common/TokenHeader';

export interface BorrowMarketCardProps extends PoolComponentProps {
  reserve: Reserve;
}

export const BorrowMarketCard: React.FC<BorrowMarketCardProps> = ({
  poolId,
  reserve,
  sx,
  ...props
}) => {
  const theme = useTheme();
  const { viewType } = useSettings();

  const { data: poolMeta } = usePoolMeta(poolId);
  const { data: backstop } = useBackstop(poolMeta?.version);
  const { data: pool } = usePool(poolMeta);
  const { data: poolOracle } = usePoolOracle(pool);
  const { data: tokenMetadata } = useTokenMetadata(reserve.assetId);
  const symbol = tokenMetadata?.symbol ?? formatter.toCompactAddress(reserve.assetId);

  const maxUtilFloat = reserve ? FixedMath.toFloat(BigInt(reserve.config.max_util), 7) : 1;
  const totalSupplied = reserve ? reserve.totalSupplyFloat() : 0;
  const availableToBorrow = reserve
    ? Math.max(totalSupplied * maxUtilFloat - reserve.totalLiabilitiesFloat(), 0)
    : 0;

  const tableNum = viewType === ViewType.REGULAR ? 5 : 3;
  const tableWidth = `${(100 / tableNum).toFixed(2)}%`;
  const liabilityFactor = reserve.getLiabilityFactor();

  const oraclePrice = poolOracle?.getPriceFloat(reserve.assetId);
  const emissionsPerAsset =
    reserve && reserve.borrowEmissions !== undefined
      ? reserve.borrowEmissions.emissionsPerYearPerToken(
          reserve.totalLiabilities(),
          reserve.config.decimals
        )
      : 0;
  const emissionApr =
    backstop && emissionsPerAsset && emissionsPerAsset > 0 && oraclePrice
      ? estimateEmissionsApr(emissionsPerAsset, backstop.backstopToken, oraclePrice)
      : undefined;

  return (
    <SectionBase
      sx={{
        type: 'alt',
        display: 'flex',
        width: '100%',
        padding: '6px',
        marginBottom: '12px',
        ...sx,
      }}
      {...props}
    >
      <LinkBox
        sx={{ width: '100%' }}
        to={{ pathname: '/borrow', query: { poolId: poolId, assetId: reserve.assetId } }}
      >
        <CustomButton
          sx={{
            width: '100%',
            '&:hover': {
              color: theme.palette.borrow.main,
            },
          }}
        >
          <TokenHeader assetId={reserve.assetId} sx={{ width: tableWidth }} />
          <Box
            sx={{
              width: tableWidth,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Typography variant="body1">{formatter.toBalance(availableToBorrow)}</Typography>
          </Box>

          <Box
            sx={{
              width: tableWidth,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <RateDisplay
              assetSymbol={symbol}
              assetRate={reserve.estBorrowApy}
              emissionSymbol="BLND"
              emissionApr={emissionApr}
              rateType={'charged'}
              direction="vertical"
            />
          </Box>
          {viewType !== ViewType.MOBILE && (
            <Box
              sx={{
                width: tableWidth,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Typography variant="body1">{formatter.toPercentage(liabilityFactor)}</Typography>
            </Box>
          )}
          <Box
            sx={{
              width: viewType === ViewType.MOBILE ? 'auto' : tableWidth,
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
            }}
          >
            <ArrowForwardIcon fontSize="inherit" />
          </Box>
        </CustomButton>
      </LinkBox>
    </SectionBase>
  );
};
