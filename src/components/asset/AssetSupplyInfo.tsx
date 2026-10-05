import { FixedMath, ReserveConfigV2 } from '@blend-capital/blend-sdk';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import Circle from '@mui/icons-material/Circle';
import { Box, Typography, useTheme } from '@mui/material';
import {
  useBackstop,
  usePool,
  usePoolMeta,
  usePoolOracle,
  useTokenMetadata,
} from '../../hooks/api';
import { toBalance, toCompactAddress, toPercentage } from '../../utils/formatter';
import { estimateEmissionsApr } from '../../utils/math';
import { LinkBox } from '../common/LinkBox';
import { OpaqueButton } from '../common/OpaqueButton';
import { RateDisplay } from '../common/RateDisplay';
import { ReserveComponentProps } from '../common/ReserveComponentProps';
import { Row } from '../common/Row';
import { Section, SectionSize } from '../common/Section';
import { SupplyCapWarning } from './SupplyCapWarning';

export const AssetSupplyInfo: React.FC<ReserveComponentProps> = ({ poolId, assetId }) => {
  const { data: poolMeta } = usePoolMeta(poolId);
  const { data: pool } = usePool(poolMeta);
  const { data: poolOracle } = usePoolOracle(pool);
  const { data: backstop } = useBackstop(poolMeta?.version);
  const { data: tokenMetadata } = useTokenMetadata(assetId);
  const tokenSymbol = tokenMetadata?.symbol ?? toCompactAddress(assetId);
  const oraclePrice = poolOracle?.getPriceFloat(assetId);
  const reserve = pool?.reserves.get(assetId);
  const emissionsPerAsset =
    reserve && reserve.supplyEmissions !== undefined
      ? reserve.supplyEmissions.emissionsPerYearPerToken(
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
  const atSupplyLimit =
    reserve && reserve.config instanceof ReserveConfigV2
      ? FixedMath.toFloat(reserve.config.supply_cap, reserve.config.decimals) -
          reserve.totalSupplyFloat() <=
        0
      : false;

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
              <Typography sx={{ padding: '6px' }}>APY</Typography>
              <RateDisplay
                version={poolMeta?.version}
                assetSymbol={tokenSymbol}
                assetRate={reserve.estSupplyApy}
                emissionSymbol={'BLND'}
                emissionApr={emissionApr}
                rateType={'earned'}
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
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Typography sx={{ padding: '6px' }}>Total Supplied</Typography>
                {atSupplyLimit && <SupplyCapWarning symbol={tokenSymbol} />}
              </Box>
              <Typography sx={{ padding: '6px', color: theme.palette.lend.main }}>
                {toBalance(reserve.totalSupplyFloat())}
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
            sx={{ width: '100%', height: '100%' }}
            to={{ pathname: '/supply', query: { poolId: poolId, assetId: reserve.assetId } }}
          >
            <Row>
              <OpaqueButton
                palette={theme.palette.lend}
                sx={{
                  display: 'flex',
                  width: '100%',
                  height: '100%',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  margin: '6px',
                  padding: '12px',
                }}
              >
                Supply
                <ArrowForwardIcon fontSize="inherit" />
              </OpaqueButton>
            </Row>
          </LinkBox>
        </Section>
      )}
    </>
  );
};
