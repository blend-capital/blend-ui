import { ReserveConfigV2 } from '@blend-capital/blend-sdk';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Box, Button, Typography, useTheme } from '@mui/material';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { AssetBorrowInfo } from '../components/asset/AssetBorrowInfo';
import { AssetConfig } from '../components/asset/AssetConfig';
import { AssetStatusBox } from '../components/asset/AssetStatusBox';
import { AssetSupplyInfo } from '../components/asset/AssetSupplyInfo';
import { InterestGraph } from '../components/asset/InterestGraph';
import { AllbridgeButton } from '../components/bridge/allbridge';
import { Divider } from '../components/common/Divider';
import { ReserveExploreBar } from '../components/common/ReserveExplorerBar';
import { Row } from '../components/common/Row';
import { Section, SectionSize } from '../components/common/Section';
import { Skeleton } from '../components/common/Skeleton';
import { StackedTextBox } from '../components/common/StackedTextBox';
import { NotPoolBar } from '../components/pool/NotPoolBar';
import { PoolMenu } from '../components/pool/PoolMenu';
import { useSettings, ViewType } from '../contexts';
import { usePool, usePoolMeta, usePoolOracle, useTokenMetadata } from '../hooks/api';
import { NOT_BLEND_POOL_ERROR_MESSAGE } from '../hooks/types';
import { toCompactAddress, toPercentage } from '../utils/formatter';

const Asset: NextPage = () => {
  const router = useRouter();
  const theme = useTheme();
  const { viewType } = useSettings();

  const { poolId, assetId } = router.query;
  const safePoolId = typeof poolId == 'string' && /^[0-9A-Z]{56}$/.test(poolId) ? poolId : '';

  const { data: poolMeta, error: poolError } = usePoolMeta(safePoolId);
  const { data: pool } = usePool(poolMeta);
  const { data: poolOracle } = usePoolOracle(pool);
  let safeAssetId = '';
  if (assetId === undefined) {
    safeAssetId = pool ? Array.from(pool.reserves.keys())[0] : '';
  } else if (typeof assetId == 'string' && /^[0-9A-Z]{56}$/.test(assetId)) {
    safeAssetId = assetId;
  }
  const { data: tokenMetadata } = useTokenMetadata(safeAssetId);
  const symbol = tokenMetadata?.symbol ?? toCompactAddress(safeAssetId);
  const reserve = pool?.reserves.get(safeAssetId);
  const assetStatus =
    reserve && reserve.config instanceof ReserveConfigV2 ? reserve.config.enabled : true;

  const hasData = pool && poolOracle && reserve;

  if (poolError?.message === NOT_BLEND_POOL_ERROR_MESSAGE) {
    return <NotPoolBar poolId={safePoolId} />;
  }

  return (
    <>
      <Row>
        <Section width={SectionSize.FULL} sx={{ marginTop: '12px' }}>
          <PoolMenu poolId={safePoolId} />
        </Section>
      </Row>
      <ReserveExploreBar poolId={safePoolId} assetId={safeAssetId} />
      {symbol === 'USDC' && <AllbridgeButton />}
      {hasData ? (
        <>
          <Divider />
          <Row>
            <Section
              width={SectionSize.FULL}
              sx={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: theme.palette.background.paper,
              }}
            >
              <Typography sx={{ padding: '6px' }}>Status</Typography>
              <AssetStatusBox titleColor="inherit" status={assetStatus} />
            </Section>
          </Row>
          <Row>
            <Section
              width={SectionSize.FULL}
              sx={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: theme.palette.background.paper,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'flex-start',
                }}
              >
                <Typography sx={{ padding: '6px' }}>Oracle Price</Typography>
                <Button
                  sx={{
                    alignItems: 'center',
                    padding: 0,
                    cursor: 'pointer',
                    minWidth: '0px',
                    color: theme.palette.text.primary,
                  }}
                  onClick={() =>
                    window.open(
                      `${process.env.NEXT_PUBLIC_STELLAR_EXPERT_URL}/contract/${pool.metadata.oracle}`,
                      '_blank'
                    )
                  }
                >
                  <OpenInNewIcon fontSize="inherit" />
                </Button>
              </Box>

              <Typography sx={{ padding: '6px' }}>
                {`$${poolOracle.getPriceFloat(reserve.assetId)?.toFixed(2) ?? ''}`}
              </Typography>
            </Section>
          </Row>

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
              marginBottom: '12px',
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
            <Row
              sx={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'stretch',
                flexFlow: 'row wrap',
              }}
            >
              <StackedTextBox
                name={'Utilization'}
                text={toPercentage(reserve.getUtilizationFloat())}
                sx={{
                  flex: 1,
                  border: '1px solid #2775C9',
                }}
              />
              <StackedTextBox
                name={'Target Utilization'}
                text={toPercentage(reserve.config.util / 1e7)}
                sx={{
                  flex: 1,
                }}
              />
              <StackedTextBox
                name={'Max Utilization'}
                text={toPercentage(reserve.config.max_util / 1e7)}
                sx={{
                  flex: 1,
                }}
              />
            </Row>
          </Section>
          <Row
            sx={{
              dislay: 'flex',
              marginBottom: '12px',
              display: 'flex',
            }}
          >
            <AssetConfig poolId={safePoolId} assetId={safeAssetId} />
          </Row>
        </>
      ) : (
        <Skeleton />
      )}
    </>
  );
};

export default Asset;
