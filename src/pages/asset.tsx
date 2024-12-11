import { Typography, useTheme } from '@mui/material';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { AssetBorrowInfo } from '../components/asset/AssetBorrowInfo';
import { AssetSupplyInfo } from '../components/asset/AssetSupplyInfo';
import { InterestGraph } from '../components/asset/InterestGraph';
import { AllbridgeButton } from '../components/bridge/allbridge';
import { Divider } from '../components/common/Divider';
import { ReserveExploreBar } from '../components/common/ReserveExplorerBar';
import { Row } from '../components/common/Row';
import { Section, SectionSize } from '../components/common/Section';
import { Skeleton } from '../components/common/Skeleton';
import { StackedTextBox } from '../components/common/StackedTextBox';
import { PoolMenu } from '../components/pool/PoolMenu';
import { useSettings, ViewType } from '../contexts';
import { usePool, usePoolOracle } from '../hooks/api';
import { toPercentage } from '../utils/formatter';

const Asset: NextPage = () => {
  const router = useRouter();
  const theme = useTheme();
  const { viewType } = useSettings();

  const { poolId, assetId } = router.query;
  const safePoolId = typeof poolId == 'string' && /^[0-9A-Z]{56}$/.test(poolId) ? poolId : '';
  const { data: pool } = usePool(safePoolId);
  const { data: poolOracle, isError: isOracleError } = usePoolOracle(pool);
  let safeAssetId = '';
  if (assetId === undefined) {
    safeAssetId = pool ? pool.config.reserveList[0] : '';
  } else if (typeof assetId == 'string' && /^[0-9A-Z]{56}$/.test(assetId)) {
    safeAssetId = assetId;
  }
  const reserve = pool?.reserves.get(safeAssetId);
  const hasData = pool && poolOracle && reserve;

  return (
    <>
      <Row>
        <Section width={SectionSize.FULL} sx={{ marginTop: '12px' }}>
          <PoolMenu poolId={safePoolId} />
        </Section>
      </Row>
      <ReserveExploreBar poolId={safePoolId} assetId={safeAssetId} />
      {reserve?.tokenMetadata.symbol === 'USDC' && <AllbridgeButton />}
      {hasData ? (
        <>
          <Divider />
          <Row
            sx={{
              display: 'flex',
              flexDirection: viewType !== ViewType.REGULAR ? 'column' : 'row',
            }}
          >
            <AssetSupplyInfo poolId={safePoolId} assetId={safeAssetId} />
            <AssetBorrowInfo poolId={safePoolId} assetId={safeAssetId} />
          </Row>

          <Section
            width={SectionSize.FULL}
            sx={{
              dislay: 'flex',
              flexDirection: 'column',
              marginBottom: '48px',
              display: 'flex',
              background: theme.palette.background.paper,
            }}
          >
            <Row sx={{ margin: '4px 4px 4px 6px', paddingLeft: '6px' }}>
              <Typography variant="h3" sx={{ color: theme.palette.text.primary }}>
                Interest Rate Model
              </Typography>
            </Row>
            <Row>
              <InterestGraph poolId={safePoolId} assetId={safeAssetId} reserve={reserve} />
            </Row>

            <Row>
              <StackedTextBox
                name={'Utilization'}
                text={toPercentage(reserve.getUtilizationFloat())}
                sx={{
                  width: '100%',
                  padding: '6px',
                  border: '1px solid #2775C9',
                }}
              />
              <StackedTextBox
                name={'Target Utilization'}
                text={toPercentage(reserve.config.util / 1e7)}
                sx={{ width: '100%', padding: '6px' }}
              />
              <StackedTextBox
                name={'Max Utilization'}
                text={toPercentage(reserve.config.max_util / 1e7)}
                sx={{ width: '100%', padding: '6px' }}
              />
            </Row>
          </Section>
        </>
      ) : (
        <Skeleton />
      )}
    </>
  );
};

export default Asset;
