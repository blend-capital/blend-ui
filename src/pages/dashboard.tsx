import { FixedMath, PoolEstimate, PositionsEstimate } from '@blend-capital/blend-sdk';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Box, Typography, useTheme } from '@mui/material';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { BackstopPreviewBar } from '../components/backstop/BackstopPreviewBar';
import { BorrowMarketList } from '../components/borrow/BorrowMarketList';
import { BorrowPositionList } from '../components/borrow/BorrowPositionList';
import { AllbridgeButton } from '../components/bridge/allbridge';
import { Divider } from '../components/common/Divider';
import { Row } from '../components/common/Row';
import { Section, SectionSize } from '../components/common/Section';
import { ToggleButton } from '../components/common/ToggleButton';
import { TooltipText } from '../components/common/TooltipText';
import { PositionOverview } from '../components/dashboard/PositionOverview';
import { LendMarketList } from '../components/lend/LendMarketList';
import { LendPositionList } from '../components/lend/LendPositionList';
import { NotPoolBar } from '../components/pool/NotPoolBar';
import { PoolExploreBar } from '../components/pool/PoolExploreBar';
import { PoolHealthBanner } from '../components/pool/PoolHealthBanner';
import { useSettings } from '../contexts';
import { usePool, usePoolMeta, usePoolOracle, usePoolUser } from '../hooks/api';
import { NOT_BLEND_POOL_ERROR_MESSAGE } from '../hooks/types';
import { toBalance } from '../utils/formatter';
import { MAINNET_USDC_CONTRACT_ADDRESS } from '../utils/token_display';

const Dashboard: NextPage = () => {
  const router = useRouter();
  const theme = useTheme();
  const { showLend, setShowLend } = useSettings();
  const { poolId } = router.query;
  const safePoolId = typeof poolId == 'string' && /^[0-9A-Z]{56}$/.test(poolId) ? poolId : '';

  const {
    data: poolMeta,
    error: poolMetaError,
    isError: isPoolMetaError,
  } = usePoolMeta(safePoolId);
  const { data: pool, isError: isPoolError } = usePool(poolMeta);
  const { data: poolOracle, isError: isOracleError } = usePoolOracle(pool);
  const { data: userPoolData } = usePoolUser(pool);

  const marketSize =
    poolOracle !== undefined && pool !== undefined
      ? PoolEstimate.build(pool.reserves, poolOracle).totalSupply
      : 0;

  const handleLendClick = () => {
    if (!showLend) {
      setShowLend(true);
    }
  };

  const handleBorrowClick = () => {
    if (showLend) {
      setShowLend(false);
    }
  };

  if (poolMetaError?.message === NOT_BLEND_POOL_ERROR_MESSAGE) {
    return <NotPoolBar poolId={safePoolId} />;
  }

  const userTotalEffectiveCollateral =
    pool && poolOracle && userPoolData
      ? PositionsEstimate.build(pool, poolOracle, userPoolData.positions).totalEffectiveCollateral
      : 0;

  const showMinCollateralInfoBar = poolMeta
    ? !showLend &&
      userTotalEffectiveCollateral < FixedMath.toFloat(poolMeta.minCollateral, poolOracle?.decimals)
    : false;

  return (
    <>
      <PoolHealthBanner poolId={safePoolId} />
      <PoolExploreBar poolId={safePoolId} />
      {pool &&
        Array.from(pool.reserves.keys()).some(
          (assetId) => assetId === MAINNET_USDC_CONTRACT_ADDRESS
        ) && <AllbridgeButton />}
      <Divider />
      <BackstopPreviewBar poolId={safePoolId} />
      <Divider />
      <Row>
        <Box sx={{ paddingLeft: '6px' }}>
          <Typography variant="h2" sx={{ padding: '6px' }}>
            Your positions
          </Typography>
        </Box>

        {userPoolData && (
          <TooltipText
            tooltip={
              'The total number of supply and borrow positions you have created in this pool out of the maximum allowed.'
            }
            width={'auto'}
            textColor="inherit"
            helpIconColor="primary.main"
            sx={{
              color: theme.palette.primary.main,
              backgroundColor: theme.palette.primary.opaque,
              margin: '6px',
              padding: '6px',
              marginRight: '12px',
              borderRadius: '4px',
              boxShadow:
                '0px 3px 1px -2px rgba(0, 0, 0, 0.2), 0px 2px 2px 0px rgba(0, 0, 0, 0.14), 0px 1px 5px 0px rgba(0, 0, 0, 0.12)',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Typography variant="body2" sx={{ marginRight: '4px' }}>
                {'Positions used'}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                {` ${
                  Array.from(userPoolData.positions.collateral.entries()).length +
                  Array.from(userPoolData.positions.liabilities.entries()).length
                }/${pool?.metadata.maxPositions}`}
              </Typography>
            </Box>
          </TooltipText>
        )}
      </Row>
      <PositionOverview poolId={safePoolId} />
      <LendPositionList poolId={safePoolId} />
      <BorrowPositionList poolId={safePoolId} />
      <Divider />
      <Row>
        <Section width={SectionSize.FULL} sx={{ padding: '0px' }}>
          <ToggleButton
            active={showLend}
            palette={theme.palette.lend}
            sx={{ width: '50%', padding: '12px' }}
            onClick={handleLendClick}
          >
            Supply
          </ToggleButton>
          <ToggleButton
            active={!showLend}
            palette={theme.palette.borrow}
            sx={{ width: '50%', padding: '12px' }}
            onClick={handleBorrowClick}
          >
            Borrow
          </ToggleButton>
        </Section>
      </Row>
      <Row sx={{ padding: '6px', justifyContent: 'space-between' }}>
        <Typography variant="body1">{`Assets to ${showLend ? 'supply' : 'borrow'}`}</Typography>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            padding: '6px',
          }}
        >
          <Typography variant="body2" mr={1}>
            Market size:
          </Typography>
          <Typography variant="body1">{`$${toBalance(marketSize)}`}</Typography>
        </Box>
      </Row>
      {showMinCollateralInfoBar && (
        <Section
          width={SectionSize.FULL}
          type="alt"
          sx={{
            alignItems: 'center',
            justifyContent: 'flex-start',
            margin: '6px',
            color: theme.palette.text.primary,
            backgroundColor: theme.palette.background.paper,
            border: '0px solid red',
          }}
        >
          <InfoOutlinedIcon
            sx={{
              height: '16px',
              width: '16px',
              marginBottom: '2px',
              marginRight: '6px',
            }}
          />
          <Typography variant="body2">
            Users must have a collateral value of $
            {toBalance(poolMeta?.minCollateral, poolOracle?.decimals)} to borrow from this pool
          </Typography>
        </Section>
      )}
      <Divider />
      {showLend ? <LendMarketList poolId={safePoolId} /> : <BorrowMarketList poolId={safePoolId} />}
    </>
  );
};

export default Dashboard;
