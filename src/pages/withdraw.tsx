import { Box, Typography, useTheme } from '@mui/material';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { AprDisplay } from '../components/common/AprDisplay';
import { GoBackHeader } from '../components/common/GoBackHeader';
import { ReserveDetailsBar } from '../components/common/ReserveDetailsBar';
import { Row } from '../components/common/Row';
import { Section, SectionSize } from '../components/common/Section';
import { StackedText } from '../components/common/StackedText';
import { WithdrawAnvil } from '../components/withdraw/WithdrawAnvil';
import { useBackstop, usePool, usePoolOracle, usePoolUser, useTokenMetadata } from '../hooks/api';
import { toBalance, toCompactAddress, toPercentage } from '../utils/formatter';
import { estimateEmissionsApr } from '../utils/math';

const Withdraw: NextPage = () => {
  const theme = useTheme();

  const router = useRouter();
  const { poolId, assetId } = router.query;
  const safePoolId = typeof poolId == 'string' && /^[0-9A-Z]{56}$/.test(poolId) ? poolId : '';
  const safeAssetId = typeof assetId == 'string' && /^[0-9A-Z]{56}$/.test(assetId) ? assetId : '';

  const { data: pool } = usePool(safePoolId);
  const { data: poolUser } = usePoolUser(pool);
  const { data: poolOracle } = usePoolOracle(pool);
  const { data: backstop } = useBackstop();
  const { data: tokenMetadata } = useTokenMetadata(safeAssetId);
  const reserve = pool?.reserves.get(safeAssetId);
  const tokenSymbol = tokenMetadata?.symbol ?? toCompactAddress(safeAssetId);

  const currentDeposit = reserve && poolUser ? poolUser.getCollateralFloat(reserve) : undefined;
  const emissionsPerAsset = reserve !== undefined ? reserve.emissionsPerYearPerSuppliedAsset() : 0;
  const oraclePrice = reserve ? poolOracle?.getPriceFloat(reserve.assetId) : 0;
  const emissionApr =
    backstop && emissionsPerAsset > 0 && oraclePrice
      ? estimateEmissionsApr(emissionsPerAsset, backstop.backstopToken, oraclePrice)
      : undefined;
  return (
    <>
      <Row>
        <GoBackHeader poolId={safePoolId} />
      </Row>
      <ReserveDetailsBar action="withdraw" poolId={safePoolId} activeReserveId={safeAssetId} />

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
              <Typography variant="h4" sx={{ color: theme.palette.lend.main }}>
                {toBalance(currentDeposit)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="h5" sx={{ color: theme.palette.text.secondary }}>
                {tokenSymbol}
              </Typography>
            </Box>
          </Box>
        </Section>
      </Row>
      <Row>
        <Section width={SectionSize.THIRD}>
          <StackedText
            title="Supply APR"
            text={
              reserve ? (
                <AprDisplay
                  assetSymbol={tokenSymbol}
                  assetApr={reserve.supplyApr}
                  emissionSymbol={'BLND'}
                  emissionApr={emissionApr}
                  isSupply={true}
                  direction={'horizontal'}
                />
              ) : (
                ''
              )
            }
            sx={{ width: '100%', padding: '6px' }}
            tooltip="The interest rate earned on a supplied position. This rate will fluctuate based on the market conditions and is accrued to the supplied position."
          ></StackedText>
        </Section>
        <Section width={SectionSize.THIRD}>
          <StackedText
            title="Collateral Factor"
            text={toPercentage(reserve?.getCollateralFactor())}
            sx={{ width: '100%', padding: '6px' }}
            tooltip="The percent of this asset's value added to your borrow capacity."
          ></StackedText>
        </Section>
        <Section width={SectionSize.THIRD}>
          <StackedText
            title="Total Supplied"
            text={toBalance(reserve?.totalSupplyFloat())}
            sx={{ width: '100%', padding: '6px' }}
          ></StackedText>
        </Section>
      </Row>
      <Row>
        <WithdrawAnvil poolId={safePoolId} assetId={safeAssetId} />
      </Row>
    </>
  );
};

export default Withdraw;
