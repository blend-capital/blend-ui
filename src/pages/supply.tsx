import { Box, Typography, useTheme } from '@mui/material';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { GoBackHeader } from '../components/common/GoBackHeader';
import { ReserveDropdown } from '../components/common/ReserveDropdown';
import { Row } from '../components/common/Row';
import { Section, SectionSize } from '../components/common/Section';
import { StackedText } from '../components/common/StackedText';
import { LendAnvil } from '../components/lend/LendAnvil';
import { useStore } from '../store/store';
import { toBalance, toPercentage } from '../utils/formatter';

const Supply: NextPage = () => {
  const theme = useTheme();

  const router = useRouter();
  const { poolId, assetId } = router.query;
  const safePoolId = typeof poolId == 'string' && /^[0-9A-Z]{56}$/.test(poolId) ? poolId : '';
  const safeAssetId = typeof assetId == 'string' && /^[0-9A-Z]{56}$/.test(assetId) ? assetId : '';

  const poolData = useStore((state) => state.pools.get(safePoolId));
  const userBalance = useStore((state) => state.balances.get(safeAssetId));
  const reserve = poolData?.reserves.get(safeAssetId);

  return (
    <>
      <Row>
        <GoBackHeader name={poolData?.config.name} />
      </Row>
      <Row>
        <Section width={SectionSize.FULL} sx={{ marginTop: '12px', marginBottom: '12px' }}>
          <ReserveDropdown action="Supply" poolId={safePoolId} activeReserveId={safeAssetId} />
        </Section>
      </Row>
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
                {toBalance(userBalance, reserve?.config.decimals)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="h5" sx={{ color: theme.palette.text.secondary }}>
                {reserve?.tokenMetadata?.symbol ?? ''}
              </Typography>
            </Box>
          </Box>
        </Section>
      </Row>
      <Row>
        <Section width={SectionSize.THIRD}>
          <StackedText
            title="Supply APY"
            text={toPercentage(reserve?.estimates.supplyApy)}
            sx={{ width: '100%', padding: '6px' }}
          ></StackedText>
        </Section>
        <Section width={SectionSize.THIRD}>
          <StackedText
            title="Collateral factor"
            text={toPercentage(reserve?.getCollateralFactor())}
            sx={{ width: '100%', padding: '6px' }}
          ></StackedText>
        </Section>
        <Section width={SectionSize.THIRD}>
          <StackedText
            title="Total supplied"
            text={toBalance(reserve?.estimates.supplied)}
            sx={{ width: '100%', padding: '6px' }}
          ></StackedText>
        </Section>
      </Row>
      <LendAnvil poolId={safePoolId} assetId={safeAssetId} />
    </>
  );
};

export default Supply;
