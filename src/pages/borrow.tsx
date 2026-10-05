import { FixedMath } from '@blend-capital/blend-sdk';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Box, Link, Typography, useTheme } from '@mui/material';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { BorrowAnvil } from '../components/borrow/BorrowAnvil';
import { GoBackHeader } from '../components/common/GoBackHeader';
import { RateDisplay } from '../components/common/RateDisplay';
import { ReserveDetailsBar } from '../components/common/ReserveDetailsBar';
import { Row } from '../components/common/Row';
import { Section, SectionSize } from '../components/common/Section';
import { StackedText } from '../components/common/StackedText';
import { NotPoolBar } from '../components/pool/NotPoolBar';
import { useBackstop, usePool, usePoolMeta, usePoolOracle, useTokenMetadata } from '../hooks/api';
import { NOT_BLEND_POOL_ERROR_MESSAGE } from '../hooks/types';
import { toBalance, toCompactAddress, toPercentage } from '../utils/formatter';
import { estimateEmissionsApr } from '../utils/math';
import { getTokenLinkFromReserve } from '../utils/token';

const Borrow: NextPage = () => {
  const theme = useTheme();

  const router = useRouter();
  const { poolId, assetId } = router.query;
  const safePoolId = typeof poolId == 'string' && /^[0-9A-Z]{56}$/.test(poolId) ? poolId : '';
  const safeAssetId = typeof assetId == 'string' && /^[0-9A-Z]{56}$/.test(assetId) ? assetId : '';

  const { data: poolMeta, error: poolError } = usePoolMeta(safePoolId);
  const { data: pool } = usePool(poolMeta);
  const { data: poolOracle } = usePoolOracle(pool);
  const { data: backstop } = useBackstop(poolMeta?.version);
  const { data: tokenMetadata } = useTokenMetadata(safeAssetId);

  const reserve = pool?.reserves.get(safeAssetId);
  const tokenSymbol = tokenMetadata?.symbol ?? toCompactAddress(safeAssetId);

  const maxUtilFloat = reserve ? FixedMath.toFloat(BigInt(reserve.config.max_util), 7) : 1;
  const totalSupplied = reserve ? reserve.totalSupplyFloat() : 0;
  const availableToBorrow = reserve
    ? Math.max(totalSupplied * maxUtilFloat - reserve.totalLiabilitiesFloat(), 0)
    : 0;
  const oraclePrice = reserve ? poolOracle?.getPriceFloat(reserve.assetId) : 0;
  const emissionsPerAsset =
    reserve && reserve.borrowEmissions !== undefined
      ? reserve.borrowEmissions.emissionsPerYearPerToken(
          reserve.totalLiabilities(),
          reserve.config.decimals
        )
      : 0;
  const emissionApr =
    backstop && emissionsPerAsset > 0 && oraclePrice
      ? estimateEmissionsApr(emissionsPerAsset, backstop.backstopToken, oraclePrice)
      : undefined;

  if (poolError?.message === NOT_BLEND_POOL_ERROR_MESSAGE) {
    return <NotPoolBar poolId={safePoolId} />;
  }

  return (
    <>
      <Row>
        <GoBackHeader poolId={safePoolId} />
      </Row>
      <ReserveDetailsBar action="borrow" poolId={safePoolId} activeReserveId={safeAssetId} />
      <Row>
        <Section width={SectionSize.FULL} sx={{ padding: '12px' }}>
          <Box
            sx={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px',
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'row' }}>
              <Typography variant="h5" sx={{ marginRight: '6px' }}>
                Available
              </Typography>
              <Typography variant="h4" sx={{ color: theme.palette.borrow.main }}>
                {toBalance(availableToBorrow, reserve?.config.decimals)}
              </Typography>
            </Box>
            <Box>
              <Link
                target="_blank"
                href={getTokenLinkFromReserve(reserve)}
                variant="h5"
                rel="noopener"
                sx={{
                  color: theme.palette.text.secondary,
                  cursor: 'pointer',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  borderBottom: '.5px solid transparent',
                  '&:hover': {
                    borderBottom: `.5px solid ${theme.palette.text.secondary}`,
                  },
                }}
              >
                <Typography variant="h5" sx={{ color: theme.palette.text.secondary }}>
                  {tokenSymbol}
                </Typography>
                <OpenInNewIcon fontSize="inherit" />
              </Link>
            </Box>
          </Box>
        </Section>
      </Row>
      <Row>
        <Section
          width={SectionSize.THIRD}
          style={{ display: 'flex', justifyContent: 'space-between' }}
        >
          <StackedText
            title="Borrow APY"
            text={
              reserve ? (
                <RateDisplay
                  version={poolMeta?.version}
                  assetSymbol={tokenSymbol}
                  assetRate={reserve.estBorrowApy}
                  emissionSymbol={'BLND'}
                  emissionApr={emissionApr}
                  rateType={'charged'}
                  direction={'horizontal'}
                />
              ) : (
                ''
              )
            }
            sx={{ padding: '6px' }}
            tooltip="The estimated compounding interest rate charged for a borrowed position. This rate will fluctuate based on the market conditions, and accrues to the borrowed position automatically."
          ></StackedText>
        </Section>
        <Section width={SectionSize.THIRD}>
          <StackedText
            title="Liability Factor"
            text={toPercentage(reserve?.getLiabilityFactor())}
            sx={{ width: '100%', padding: '6px' }}
            tooltip="The percent of this asset's value subtracted from your borrow capacity."
          ></StackedText>
        </Section>
        <Section width={SectionSize.THIRD}>
          <StackedText
            title="Total Borrowed"
            text={toBalance(reserve?.totalLiabilitiesFloat())}
            sx={{ width: '100%', padding: '6px' }}
          ></StackedText>
        </Section>
      </Row>
      <BorrowAnvil poolId={safePoolId} assetId={safeAssetId} />
    </>
  );
};

export default Borrow;
