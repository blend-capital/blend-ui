import { Box, Typography, useTheme } from '@mui/material';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { GoBackHeader } from '../components/common/GoBackHeader';
import { RateDisplay } from '../components/common/RateDisplay';
import { ReserveDetailsBar } from '../components/common/ReserveDetailsBar';
import { Row } from '../components/common/Row';
import { Section, SectionSize } from '../components/common/Section';
import { StackedText } from '../components/common/StackedText';
import { NotPoolBar } from '../components/pool/NotPoolBar';
import { RepayAnvil } from '../components/repay/RepayAnvil';
import {
  useBackstop,
  useHorizonAccount,
  usePool,
  usePoolMeta,
  usePoolOracle,
  usePoolUser,
  useTokenBalance,
  useTokenMetadata,
} from '../hooks/api';
import { NOT_BLEND_POOL_ERROR_MESSAGE } from '../hooks/types';
import { toBalance, toCompactAddress, toPercentage } from '../utils/formatter';
import { estimateEmissionsApr } from '../utils/math';

const Repay: NextPage = () => {
  const theme = useTheme();
  const router = useRouter();
  const { poolId, assetId } = router.query;
  const safePoolId = typeof poolId == 'string' && /^[0-9A-Z]{56}$/.test(poolId) ? poolId : '';
  const safeAssetId = typeof assetId == 'string' && /^[0-9A-Z]{56}$/.test(assetId) ? assetId : '';

  const { data: poolMeta, error: poolError } = usePoolMeta(safePoolId);
  const { data: pool } = usePool(poolMeta);
  const { data: poolUser } = usePoolUser(pool);
  const { data: tokenMetadata } = useTokenMetadata(safeAssetId);
  const { data: horizonAccount } = useHorizonAccount();
  const reserve = pool?.reserves.get(safeAssetId);
  const symbol = tokenMetadata?.symbol ?? toCompactAddress(safeAssetId);
  const { data: tokenBalance } = useTokenBalance(
    reserve?.assetId,
    tokenMetadata?.asset,
    horizonAccount,
    reserve !== undefined
  );
  const { data: poolOracle } = usePoolOracle(pool);
  const { data: backstop } = useBackstop(poolMeta?.version);

  const emissionsPerAsset =
    reserve && reserve.borrowEmissions !== undefined
      ? reserve.borrowEmissions.emissionsPerYearPerToken(
          reserve.totalLiabilities(),
          reserve.config.decimals
        )
      : 0;
  const oraclePrice = reserve ? poolOracle?.getPriceFloat(reserve.assetId) : 0;
  const emissionApr =
    backstop && emissionsPerAsset > 0 && oraclePrice
      ? estimateEmissionsApr(emissionsPerAsset, backstop.backstopToken, oraclePrice)
      : undefined;

  const currentDebt = reserve && poolUser ? poolUser.getLiabilitiesFloat(reserve) : undefined;

  if (poolError?.message === NOT_BLEND_POOL_ERROR_MESSAGE) {
    return <NotPoolBar poolId={safePoolId} />;
  }

  return (
    <>
      <Row>
        <GoBackHeader poolId={safePoolId} />
      </Row>
      <ReserveDetailsBar action="repay" poolId={safePoolId} activeReserveId={safeAssetId} />
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
                Debt
              </Typography>
              <Typography variant="h4" sx={{ color: theme.palette.borrow.main }}>
                {toBalance(currentDebt)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="h5" sx={{ color: theme.palette.text.secondary }}>
                {symbol}
              </Typography>
            </Box>
          </Box>
        </Section>
      </Row>
      <Row>
        <Section width={SectionSize.THIRD}>
          <StackedText
            title="Borrow APY"
            text={
              reserve ? (
                <RateDisplay
                  version={poolMeta?.version}
                  assetSymbol={symbol}
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
            sx={{ width: '100%', padding: '6px' }}
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
            title="Wallet Balance"
            text={toBalance(tokenBalance, reserve?.config.decimals)}
            sx={{ width: '100%', padding: '6px' }}
          ></StackedText>
        </Section>
      </Row>
      <Row>
        <RepayAnvil poolId={safePoolId} assetId={safeAssetId} />
      </Row>
    </>
  );
};

export default Repay;
