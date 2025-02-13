import { Circle } from '@mui/icons-material';
import { Box, Typography, useTheme } from '@mui/material';
import {
  useBackstop,
  usePool,
  usePoolEmissions,
  usePoolMeta,
  usePoolOracle,
  useTokenMetadata,
} from '../../hooks/api';
import { toBalance, toCompactAddress, toPercentage } from '../../utils/formatter';
import { estimateEmissionsApr } from '../../utils/math';
import { AprDisplay } from '../common/AprDisplay';
import { LinkBox } from '../common/LinkBox';
import { OpaqueButton } from '../common/OpaqueButton';
import { ReserveComponentProps } from '../common/ReserveComponentProps';
import { Row } from '../common/Row';
import { Section, SectionSize } from '../common/Section';

export const AssetSupplyInfo: React.FC<ReserveComponentProps> = ({ poolId, assetId }) => {
  const { data: poolMeta } = usePoolMeta(poolId);
  const { data: pool } = usePool(poolMeta);
  const { data: poolOracle } = usePoolOracle(pool);
  const { data: backstop } = useBackstop(poolMeta?.version);
  const { data: tokenMetadata } = useTokenMetadata(assetId);
  const { data: poolEmissions } = usePoolEmissions(pool);
  const tokenSymbol = tokenMetadata?.symbol ?? toCompactAddress(assetId);
  const oraclePrice = poolOracle?.getPriceFloat(assetId);
  const reserve = pool?.reserves.get(assetId);
  const reserveEmissions = poolEmissions?.find((e) => e.assetId === assetId);
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
  const hasData = pool && poolOracle && reserve && oraclePrice;
  const theme = useTheme();

  return (
    <>
      {hasData && (
        <Section
          width={SectionSize.FULL}
          sx={{ padding: '6px', display: 'flex', flexDirection: 'column' }}
        >
          <Row sx={{ padding: '6px' }}>
            <Typography
              sx={{
                padding: '6px',
                display: 'flex',
                gap: '4px',
                alignItems: 'center',
              }}
              variant="body2"
              color={theme.palette.text.primary}
            >
              <Circle fontSize="inherit" sx={{ width: '8px', color: theme.palette.lend.main }} />
              Supply Info
            </Typography>
          </Row>
          <Row>
            <Box
              sx={{
                width: '100%',
                padding: '6px',
                margin: '6px',
                borderRadius: '5px',
                display: 'flex',
                justifyContent: 'space-between',
                background: theme.palette.background.default,
              }}
            >
              <Typography sx={{ padding: '6px' }}>APR</Typography>
              <AprDisplay
                assetSymbol={tokenSymbol}
                assetApr={reserve.supplyApr}
                emissionSymbol={'BLND'}
                emissionApr={emissionApr}
                isSupply={true}
                direction={'horizontal'}
              />
            </Box>
          </Row>
          <Row>
            <Box
              sx={{
                width: '100%',
                padding: '6px',
                margin: '6px',
                borderRadius: '5px',
                display: 'flex',
                justifyContent: 'space-between',
                background: theme.palette.background.default,
              }}
            >
              <Typography sx={{ padding: '6px' }}>Total Supplied</Typography>
              <Typography sx={{ padding: '6px', color: theme.palette.lend.main }}>
                {toBalance(reserve.totalSupplyFloat() * oraclePrice)}
              </Typography>
            </Box>
          </Row>
          <Row>
            <Box
              sx={{
                width: '100%',
                padding: '6px',
                margin: '6px',
                borderRadius: '5px',
                display: 'flex',
                justifyContent: 'space-between',
                background: theme.palette.background.default,
              }}
            >
              <Typography sx={{ padding: '6px' }}>Collateral Factor</Typography>
              <Typography sx={{ padding: '6px' }}>
                {toPercentage(reserve.getCollateralFactor())}
              </Typography>
            </Box>
          </Row>
          <LinkBox
            sx={{ width: '100%' }}
            to={{ pathname: '/supply', query: { poolId: poolId, assetId: reserve.assetId } }}
          >
            <Row>
              <OpaqueButton
                palette={theme.palette.lend}
                sx={{
                  width: '100%',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '6px',
                  fontSize: '24px',
                }}
              >
                Supply
              </OpaqueButton>
            </Row>
          </LinkBox>
        </Section>
      )}
    </>
  );
};
