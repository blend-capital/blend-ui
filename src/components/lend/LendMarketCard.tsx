import { Reserve } from '@blend-capital/blend-sdk';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Box, Typography, useTheme } from '@mui/material';
import { ViewType, useSettings } from '../../contexts';
import {
  useBackstop,
  useHorizonAccount,
  usePool,
  usePoolEmissions,
  usePoolOracle,
  useTokenBalance,
  useTokenMetadata,
} from '../../hooks/api';
import * as formatter from '../../utils/formatter';
import { estimateEmissionsApr } from '../../utils/math';
import { AprDisplay } from '../common/AprDisplay';
import { CustomButton } from '../common/CustomButton';
import { LinkBox } from '../common/LinkBox';
import { PoolComponentProps } from '../common/PoolComponentProps';
import { SectionBase } from '../common/SectionBase';
import { TokenHeader } from '../common/TokenHeader';

export interface LendMarketCardProps extends PoolComponentProps {
  reserve: Reserve;
}

export const LendMarketCard: React.FC<LendMarketCardProps> = ({
  poolId,
  reserve,
  sx,
  ...props
}) => {
  const theme = useTheme();
  const { viewType, version } = useSettings();

  const { data: userAccount } = useHorizonAccount();
  const { data: tokenMetadata } = useTokenMetadata(reserve.assetId);
  const { data: userTokenBalance } = useTokenBalance(
    reserve.assetId,
    tokenMetadata?.asset,
    userAccount
  );
  const { data: backstop } = useBackstop();
  const { data: pool } = usePool(poolId);
  const { data: poolOracle } = usePoolOracle(pool);
  const { data: poolEmissions } = usePoolEmissions(pool);

  const symbol = tokenMetadata?.symbol ?? formatter.toCompactAddress(reserve.assetId);
  const oraclePrice = poolOracle?.getPriceFloat(reserve.assetId);
  const reserveEmissions = poolEmissions?.find((e) => e.assetId === reserve.assetId);
  const emissionsPerAsset =
    reserveEmissions?.supplyEmissions !== undefined && reserve
      ? reserveEmissions.supplyEmissions.emissionsPerYearPerToken(
          reserve.totalSupply(),
          reserve.config.decimals
        )
      : 0;
  const emissionApr =
    backstop && emissionsPerAsset && emissionsPerAsset > 0 && oraclePrice
      ? estimateEmissionsApr(emissionsPerAsset, backstop.backstopToken, oraclePrice)
      : undefined;

  const tableNum = viewType === ViewType.REGULAR ? 5 : 3;
  const tableWidth = `${(100 / tableNum).toFixed(2)}%`;
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
        to={{ pathname: '/supply', query: { poolId: poolId, assetId: reserve.assetId, version } }}
      >
        <CustomButton
          sx={{
            width: '100%',
            '&:hover': {
              color: theme.palette.lend.main,
            },
          }}
        >
          <TokenHeader reserve={reserve} sx={{ width: tableWidth }} />
          <Box
            sx={{
              width: tableWidth,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Typography variant="body1">
              {formatter.toBalance(userTokenBalance, reserve.config.decimals)}
            </Typography>
          </Box>

          <Box
            sx={{
              width: tableWidth,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <AprDisplay
              assetSymbol={symbol}
              assetApr={reserve.supplyApr}
              emissionSymbol="BLND"
              emissionApr={emissionApr}
              isSupply={true}
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
              <Typography variant="body1">
                {formatter.toPercentage(reserve.getCollateralFactor())}
              </Typography>
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
