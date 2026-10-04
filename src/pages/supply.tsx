import { FixedMath, ReserveConfigV2 } from '@blend-capital/blend-sdk';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Box, Link, Typography, useTheme } from '@mui/material';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { SupplyCapWarning } from '../components/asset/SupplyCapWarning';
import { AllbridgeButton } from '../components/bridge/allbridge';
import { GoBackHeader } from '../components/common/GoBackHeader';
import { RateDisplay } from '../components/common/RateDisplay';
import { ReserveDetailsBar } from '../components/common/ReserveDetailsBar';
import { Row } from '../components/common/Row';
import { Section, SectionSize } from '../components/common/Section';
import { StackedText } from '../components/common/StackedText';
import { LendAnvil } from '../components/lend/LendAnvil';
import { NotPoolBar } from '../components/pool/NotPoolBar';
import {
  useBackstop,
  useHorizonAccount,
  usePool,
  usePoolMeta,
  usePoolOracle,
  useTokenBalance,
  useTokenMetadata,
} from '../hooks/api';
import { NOT_BLEND_POOL_ERROR_MESSAGE } from '../hooks/types';
import { toBalance, toCompactAddress, toPercentage } from '../utils/formatter';
import { estimateEmissionsApr } from '../utils/math';
import { getTokenLinkFromReserve } from '../utils/token';
import { MAINNET_USDC_CONTRACT_ADDRESS } from '../utils/token_display';

const Supply: NextPage = () => {
  const theme = useTheme();

  const router = useRouter();
  const { poolId, assetId } = router.query;
  const safePoolId = typeof poolId == 'string' && /^[0-9A-Z]{56}$/.test(poolId) ? poolId : '';
  const safeAssetId = typeof assetId == 'string' && /^[0-9A-Z]{56}$/.test(assetId) ? assetId : '';

  const { data: poolMeta, error: poolError } = usePoolMeta(safePoolId);
  const { data: pool } = usePool(poolMeta);
  const { data: tokenMetadata } = useTokenMetadata(safeAssetId);
  const reserve = pool?.reserves.get(safeAssetId);
  const symbol = tokenMetadata?.symbol ?? toCompactAddress(safeAssetId);
  const { data: horizonAccount } = useHorizonAccount();
  const { data: tokenBalance } = useTokenBalance(
    reserve?.assetId,
    tokenMetadata?.asset,
    horizonAccount,
    reserve !== undefined
  );
  const { data: poolOracle } = usePoolOracle(pool);
  const { data: backstop } = useBackstop(poolMeta?.version);

  const emissionsPerAsset =
    reserve && reserve.supplyEmissions !== undefined
      ? reserve.supplyEmissions.emissionsPerYearPerToken(
          reserve.totalSupply(),
          reserve.config.decimals
        )
      : 0;
  const oraclePrice = reserve ? poolOracle?.getPriceFloat(reserve.assetId) : 0;
  const emissionApr =
    backstop && emissionsPerAsset > 0 && oraclePrice
      ? estimateEmissionsApr(emissionsPerAsset, backstop.backstopToken, oraclePrice)
      : undefined;

  const atSupplyLimit =
    reserve && reserve.config instanceof ReserveConfigV2
      ? FixedMath.toFloat(reserve.config.supply_cap, reserve.config.decimals) -
          reserve.totalSupplyFloat() <=
        0
      : false;

  if (poolError?.message === NOT_BLEND_POOL_ERROR_MESSAGE) {
    return <NotPoolBar poolId={safePoolId} />;
  }

  return (
    <>
      <Row>
        <GoBackHeader poolId={safePoolId} />
      </Row>

      <ReserveDetailsBar action="supply" poolId={safePoolId} activeReserveId={safeAssetId} />
      {safeAssetId === MAINNET_USDC_CONTRACT_ADDRESS && <AllbridgeButton />}

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
                Balance
              </Typography>
              <Typography variant="h4" sx={{ color: theme.palette.lend.main }}>
                {toBalance(tokenBalance, reserve?.config.decimals)}
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
                  {symbol}
                </Typography>
                <OpenInNewIcon fontSize="inherit" />
              </Link>
            </Box>
          </Box>
        </Section>
      </Row>
      <Row>
        <Section width={SectionSize.THIRD} sx={{ justifyContent: 'center' }}>
          <StackedText
            title="Supply APY"
            text={
              reserve ? (
                <RateDisplay
                  version={poolMeta?.version}
                  assetSymbol={symbol}
                  assetRate={reserve.estSupplyApy}
                  emissionSymbol={'BLND'}
                  emissionApr={emissionApr}
                  rateType={'earned'}
                  direction={'horizontal'}
                />
              ) : (
                ''
              )
            }
            sx={{ width: '100%', padding: '6px' }}
            tooltip="The estimated compounding interest rate earned on a supplied position. This rate will fluctuate based on the market conditions, and accrues to the supplied position automatically."
          ></StackedText>
        </Section>
        <Section width={SectionSize.THIRD}>
          <StackedText
            title="Collateral Factor"
            text={toPercentage(reserve?.getCollateralFactor())}
            sx={{ padding: '6px' }}
            tooltip="The percent of this asset's value added to your borrow capacity."
          ></StackedText>
        </Section>
        <Section
          width={SectionSize.THIRD}
          sx={{ justifyContent: 'space-between', alignItems: 'center' }}
        >
          <StackedText
            title="Total Supplied"
            text={toBalance(reserve?.totalSupplyFloat())}
            sx={{ padding: '6px' }}
          />
          {atSupplyLimit && <SupplyCapWarning symbol={symbol} sx={{ marginRight: '6px' }} />}
        </Section>
      </Row>
      <LendAnvil poolId={safePoolId} assetId={safeAssetId} />
    </>
  );
};

export default Supply;
