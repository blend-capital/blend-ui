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
import { Skeleton } from '../common/Skeleton';

export const AssetBorrowInfo: React.FC<ReserveComponentProps> = ({ poolId, assetId }) => {
  const theme = useTheme();

  const { data: poolMeta } = usePoolMeta(poolId);
  const { data: pool } = usePool(poolMeta);
  const { data: poolOracle } = usePoolOracle(pool);
  const { data: backstop } = useBackstop(poolMeta?.version);
  const { data: poolEmissions } = usePoolEmissions(pool);
  const oraclePrice = poolOracle?.getPriceFloat(assetId);
  const reserve = pool?.reserves.get(assetId);
  const { data: tokenMetadata } = useTokenMetadata(assetId);
  const reserveEmissions = poolEmissions?.find((e) => e.assetId === assetId);
  const emissionsPerAsset =
    reserveEmissions?.borrowEmissions !== undefined && reserve
      ? reserveEmissions.borrowEmissions.emissionsPerYearPerToken(
          reserve.totalLiabilities(),
          reserve.config.decimals
        )
      : 0;
  const emissionApr =
    backstop && emissionsPerAsset && emissionsPerAsset > 0 && oraclePrice
      ? estimateEmissionsApr(emissionsPerAsset, backstop.backstopToken, oraclePrice)
      : undefined;

  if (!pool || !reserve || !oraclePrice) {
    return <Skeleton />;
  }

  const tokenSymbol = tokenMetadata?.symbol ?? toCompactAddress(assetId);

  return (
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
          <Circle fontSize="inherit" sx={{ width: '8px', color: theme.palette.borrow.main }} />
          Borrow Info
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
            assetApr={reserve.borrowApr}
            emissionSymbol={'BLND'}
            emissionApr={emissionApr}
            isSupply={false}
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
          <Typography sx={{ padding: '6px' }}>Total Borrowed</Typography>
          <Typography sx={{ padding: '6px', color: theme.palette.borrow.main }}>
            {toBalance(reserve.totalLiabilitiesFloat() * oraclePrice)}
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
          <Typography sx={{ padding: '6px' }}>Liability Factor</Typography>
          <Typography sx={{ padding: '6px' }}>
            {toPercentage(reserve.getLiabilityFactor())}
          </Typography>
        </Box>
      </Row>
      <LinkBox
        sx={{ width: '100%' }}
        to={{ pathname: '/borrow', query: { poolId: poolId, assetId: reserve.assetId } }}
      >
        <Row>
          <OpaqueButton
            palette={theme.palette.borrow}
            sx={{
              width: '100%',
              alignItems: 'center',
              justifyContent: 'center',

              margin: '6px',
              fontSize: '24px',
            }}
          >
            Borrow
          </OpaqueButton>
        </Row>
      </LinkBox>
    </Section>
  );
};
