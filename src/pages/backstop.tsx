import {
  BackstopClaimV1Args,
  BackstopClaimV2Args,
  BackstopContractV1,
  BackstopContractV2,
  BackstopPoolEst,
  BackstopPoolUserEst,
  ContractErrorType,
  FixedMath,
  parseError,
  parseResult,
  Version,
} from '@blend-capital/blend-sdk';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Box, Tooltip, Typography } from '@mui/material';
import { rpc, scValToBigInt, xdr } from '@stellar/stellar-sdk';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { BackstopAPR } from '../components/backstop/BackstopAPR';
import { BackstopQueueMod } from '../components/backstop/BackstopQueueMod';
import { AnvilAlert } from '../components/common/AnvilAlert';
import { CustomButton } from '../components/common/CustomButton';
import { Divider } from '../components/common/Divider';
import { FlameIcon } from '../components/common/FlameIcon';
import { Icon } from '../components/common/Icon';
import { LinkBox } from '../components/common/LinkBox';
import { OpaqueButton } from '../components/common/OpaqueButton';
import { Row } from '../components/common/Row';
import { Section, SectionSize } from '../components/common/Section';
import { SectionBase } from '../components/common/SectionBase';
import { StackedText } from '../components/common/StackedText';
import { TooltipText } from '../components/common/TooltipText';
import { NotPoolBar } from '../components/pool/NotPoolBar';
import { PoolExploreBar } from '../components/pool/PoolExploreBar';
import { PoolHealthBanner } from '../components/pool/PoolHealthBanner';
import { useSettings } from '../contexts/settings';
import { useWallet } from '../contexts/wallet';
import {
  useBackstop,
  useBackstopPool,
  useBackstopPoolUser,
  useHorizonAccount,
  usePoolMeta,
  useSimulateOperation,
  useTokenBalance,
} from '../hooks/api';
import { NOT_BLEND_POOL_ERROR_MESSAGE } from '../hooks/types';
import theme from '../theme';
import { CometClient } from '../utils/comet';
import { toBalance, toPercentage } from '../utils/formatter';

const Backstop: NextPage = () => {
  const router = useRouter();
  const { isV2Enabled } = useSettings();
  const { connected, walletAddress, backstopClaim, restore } = useWallet();

  const { poolId } = router.query;
  const safePoolId = typeof poolId == 'string' && /^[0-9A-Z]{56}$/.test(poolId) ? poolId : '';

  const { data: poolMeta, error: poolError } = usePoolMeta(safePoolId);
  const { data: backstop } = useBackstop(poolMeta?.version);
  const { data: backstopPoolData } = useBackstopPool(poolMeta);
  const { data: userBackstopPoolData } = useBackstopPoolUser(poolMeta);
  const { data: horizonAccount } = useHorizonAccount();
  const { data: lpBalance } = useTokenBalance(
    backstop?.backstopToken?.id ?? '',
    undefined,
    horizonAccount
  );

  const backstopPoolEst =
    backstop !== undefined && backstopPoolData !== undefined
      ? BackstopPoolEst.build(backstop.backstopToken, backstopPoolData.poolBalance)
      : undefined;

  const backstopUserEst =
    userBackstopPoolData !== undefined && backstop !== undefined && backstopPoolData !== undefined
      ? BackstopPoolUserEst.build(backstop, backstopPoolData, userBackstopPoolData)
      : undefined;

  const backstopDepositUSD =
    backstopUserEst?.tokens && backstop?.backstopToken.lpTokenPrice
      ? backstopUserEst?.tokens * backstop.backstopToken.lpTokenPrice
      : undefined;

  const lpBalanceUSD =
    lpBalance && backstop?.backstopToken.lpTokenPrice
      ? (Number(lpBalance) / 1e7) * backstop.backstopToken.lpTokenPrice
      : undefined;

  let claimOp = '';

  if (isV2Enabled && poolMeta?.version == Version.V2) {
    const claimArgs: BackstopClaimV2Args = {
      from: walletAddress,
      pool_addresses: [safePoolId],
      min_lp_tokens_out: BigInt(0),
    };
    let backstopContract = new BackstopContractV2(process.env.NEXT_PUBLIC_BACKSTOP_V2 ?? '');
    claimOp =
      safePoolId && walletAddress !== '' && backstopContract
        ? backstopContract.claim(claimArgs)
        : '';
  } else {
    const claimArgs: BackstopClaimV1Args = {
      from: walletAddress,
      pool_addresses: [safePoolId],
      to: walletAddress,
    };
    let backstopContract = new BackstopContractV1(process.env.NEXT_PUBLIC_BACKSTOP ?? '');
    claimOp =
      safePoolId && walletAddress !== '' && backstopContract
        ? backstopContract.claim(claimArgs)
        : '';
  }

  const {
    data: claimSimResult,
    isLoading: isClaimLoading,
    refetch: refetchClaimSim,
  } = useSimulateOperation(claimOp, backstop !== undefined && claimOp !== '' && connected);
  const isRestore =
    isClaimLoading === false &&
    claimSimResult !== undefined &&
    rpc.Api.isSimulationRestore(claimSimResult);
  const isError =
    isClaimLoading === false &&
    claimSimResult !== undefined &&
    rpc.Api.isSimulationError(claimSimResult);

  const cometContract =
    backstop !== undefined ? new CometClient(backstop.backstopToken.id) : undefined;
  const lpMintEstOp =
    backstop && cometContract && backstopUserEst && walletAddress !== ''
      ? cometContract
          .depositTokenInGetLPOut({
            depositTokenAddress: backstop.config.blndTkn,
            depositTokenAmount: FixedMath.toFixed(backstopUserEst.emissions, 7),
            minLPTokenAmount: BigInt(0),
            user: backstop.id,
          })
          .toXDR('base64')
      : undefined;

  const { data: mintSimResult, refetch: refetchMintSim } = useSimulateOperation(
    lpMintEstOp ?? '',
    lpMintEstOp !== undefined && !isRestore
  );
  let lpTokenEmissions: bigint = BigInt(0);
  if (mintSimResult && rpc.Api.isSimulationSuccess(mintSimResult)) {
    lpTokenEmissions =
      parseResult(mintSimResult, (xdrString: string) => {
        return scValToBigInt(xdr.ScVal.fromXDR(xdrString, 'base64'));
      }) ?? BigInt(0);
  }

  const backstopClaimUSD =
    lpTokenEmissions && backstop?.backstopToken.lpTokenPrice
      ? (Number(lpTokenEmissions) / 1e7) * backstop.backstopToken.lpTokenPrice
      : undefined;

  const handleClaimEmissionsClick = async () => {
    if (connected && poolMeta && userBackstopPoolData) {
      let claimArgs: BackstopClaimV1Args | BackstopClaimV2Args;
      if (isV2Enabled && poolMeta.version == Version.V2) {
        claimArgs = {
          from: walletAddress,
          pool_addresses: [safePoolId],
          min_lp_tokens_out: BigInt(0),
        };
      } else {
        claimArgs = { from: walletAddress, pool_addresses: [safePoolId], to: walletAddress };
      }
      await backstopClaim(poolMeta, claimArgs, false);
      refetchClaimSim();
      refetchMintSim();
    }
  };

  const renderClaimButton = () => {
    if (!isRestore && !isError)
      return (
        <CustomButton
          sx={{
            width: '100%',
            margin: '6px',
            padding: '12px',
            color: theme.palette.text.primary,
            backgroundColor: theme.palette.background.default,
            '&:hover': {
              color: theme.palette.primary.main,
            },
          }}
          onClick={handleClaimEmissionsClick}
        >
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
            <FlameIcon />
            <Icon
              src={`/icons/tokens/blndusdclp.svg`}
              alt={`blndusdclp`}
              sx={{ height: '30px', width: '30px', marginRight: '12px' }}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <Box sx={{ display: 'flex', flexDirection: 'row' }}>
                <Typography variant="h4" sx={{ marginRight: '6px' }}>
                  {toBalance(lpTokenEmissions, 7)}
                </Typography>
                <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
                  BLND-USDC LP
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
                {`$${toBalance(backstopClaimUSD)}`}
              </Typography>
            </Box>
          </Box>
          <ArrowForwardIcon fontSize="inherit" />
        </CustomButton>
      );
    else {
      let disabled = false;
      let buttonText = '';
      let buttonTooltip = undefined;
      let onClick = undefined;
      if (isRestore) {
        buttonText = 'Restore Data';
        onClick = handleRestore;
      } else if (isError) {
        const claimError = parseError(claimSimResult);
        buttonText = 'Error checking claim';
        buttonTooltip = 'Erorr while checking claim amount: ' + ContractErrorType[claimError.type];
        disabled = true;
      }
      return (
        <Tooltip
          title={buttonTooltip}
          placement="top-start"
          enterTouchDelay={0}
          enterDelay={500}
          leaveTouchDelay={3000}
        >
          <Box sx={{ width: '100%' }}>
            <CustomButton
              sx={{
                width: '100%',
                padding: '12px',
                color: theme.palette.text.primary,
                backgroundColor: theme.palette.background.default,
                '&:hover': {
                  color: theme.palette.primary.main,
                },
              }}
              disabled={disabled}
              onClick={handleClaimEmissionsClick}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'flex-start',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <Box
                  sx={{
                    borderRadius: '50%',
                    backgroundColor: theme.palette.warning.opaque,
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Icon
                    alt="BLND Token Icon"
                    src="/icons/tokens/blnd-yellow.svg"
                    height="24px"
                    width="18px"
                    isCircle={false}
                  />
                </Box>
                <TooltipText
                  tooltip={buttonTooltip ?? ''}
                  width="auto"
                  textVariant="body1"
                  textColor={'inherit'}
                >
                  {buttonText}
                </TooltipText>
              </Box>
              <ArrowForwardIcon fontSize="inherit" />
            </CustomButton>
          </Box>
        </Tooltip>
      );
    }
  };

  const handleRestore = async () => {
    if (claimSimResult && rpc.Api.isSimulationRestore(claimSimResult)) {
      await restore(claimSimResult);
      refetchClaimSim();
    }
  };

  if (poolError?.message === NOT_BLEND_POOL_ERROR_MESSAGE) {
    return <NotPoolBar poolId={safePoolId} />;
  }

  return (
    <>
      <PoolHealthBanner poolId={safePoolId} />
      <PoolExploreBar poolId={safePoolId} />
      <Row>
        <SectionBase type="alt" sx={{ margin: '6px', padding: '6px' }}>
          Backstop Manager
        </SectionBase>
      </Row>
      <Divider />
      <Box
        width={SectionSize.FULL}
        sx={{
          display: 'flex',
          margin: '6px',
        }}
      >
        <AnvilAlert
          severity={'warning'}
          message={
            'Due to an issue with Comet, the underlying protocol of the BLND-USDC LP token, the backstop APR is incorrect.'
          }
          extraContent={undefined}
        />
      </Box>
      <Row>
        <Section width={SectionSize.THIRD}>
          <BackstopAPR poolId={safePoolId} />
        </Section>
        <Section width={SectionSize.THIRD}>
          <StackedText
            title="Q4W"
            text={toPercentage(backstopPoolEst?.q4wPercentage)}
            sx={{ width: '100%', padding: '6px' }}
            tooltip="Percent of capital insuring this pool queued for withdrawal (Q4W). A higher percent indicates potential risks."
          ></StackedText>
        </Section>
        <Section width={SectionSize.THIRD}>
          <StackedText
            title="Total Deposited"
            text={`$${toBalance(backstopPoolEst?.totalSpotValue)}`}
            sx={{ width: '100%', padding: '6px' }}
          ></StackedText>
        </Section>
      </Row>
      {isRestore && (
        <Row>
          <Section
            width={SectionSize.FULL}
            sx={{
              flexDirection: 'column',
              paddingTop: '12px',
            }}
          >
            <Typography variant="body2" sx={{ margin: '6px' }}>
              Emissions to claim
            </Typography>
            <Row>
              <CustomButton
                sx={{
                  width: '100%',
                  margin: '6px',
                  padding: '12px',
                  color: theme.palette.text.primary,
                  backgroundColor: theme.palette.background.default,
                  '&:hover': {
                    color: theme.palette.warning.main,
                  },
                }}
                onClick={handleRestore}
              >
                <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                  <Box
                    sx={{
                      borderRadius: '50%',
                      backgroundColor: theme.palette.warning.opaque,
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Icon
                      alt="BLND Token Icon"
                      src="/icons/tokens/blnd-yellow.svg"
                      height="24px"
                      width="18px"
                      isCircle={false}
                    />
                  </Box>
                  <Typography variant="h4" sx={{ marginLeft: '6px' }}>
                    {`Restore Data`}
                  </Typography>
                </Box>
                <ArrowForwardIcon fontSize="inherit" />
              </CustomButton>
            </Row>
          </Section>
        </Row>
      )}
      {!isRestore && lpTokenEmissions !== undefined && lpTokenEmissions > BigInt(0) && (
        <Row>
          <Section
            width={SectionSize.FULL}
            sx={{
              flexDirection: 'column',
              paddingTop: '12px',
            }}
          >
            <Typography variant="body2" sx={{ margin: '6px' }}>
              Emissions to claim
            </Typography>
            <Row>{renderClaimButton()}</Row>
          </Section>
        </Row>
      )}
      <Row>
        <Section
          width={SectionSize.FULL}
          sx={{
            flexDirection: 'column',
            paddingTop: '12px',
          }}
        >
          <Typography variant="body2" sx={{ margin: '6px' }}>
            Your BLND-USDC LP Token Balance
          </Typography>
          <Box
            sx={{
              width: SectionSize.FULL,
              margin: '6px',
              padding: '12px',
              color: theme.palette.text.primary,
              backgroundColor: theme.palette.background.default,
              borderRadius: '5px',
              display: 'flex',
              justifyContent: 'flex-start',
              alignItems: 'center',
            }}
          >
            <Icon
              src={`/icons/tokens/blndusdclp.svg`}
              alt={`blndusdclp`}
              sx={{ height: '30px', width: '30px', marginRight: '12px' }}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', flexDirection: 'row' }}>
                <Typography variant="h4" sx={{ marginRight: '6px' }}>
                  {toBalance(lpBalance, 7)}
                </Typography>
                <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
                  BLND-USDC LP
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
                {`$${toBalance(lpBalanceUSD)}`}
              </Typography>
            </Box>
          </Box>
          <Box
            sx={{
              width: SectionSize.FULL,
              margin: '6px',
              borderRadius: '5px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <LinkBox sx={{ width: SectionSize.TILE }} to={{ pathname: '/backstop-token' }}>
              <OpaqueButton palette={theme.palette.primary} sx={{ width: '100%', padding: '6px' }}>
                Manage
              </OpaqueButton>
            </LinkBox>
            <LinkBox
              sx={{ width: SectionSize.TILE }}
              to={{ pathname: '/backstop-deposit', query: { poolId: poolId } }}
            >
              <OpaqueButton palette={theme.palette.backstop} sx={{ width: '100%', padding: '6px' }}>
                Backstop Deposit
              </OpaqueButton>
            </LinkBox>
          </Box>
        </Section>
      </Row>

      <Row sx={{ display: 'flex', flexDirection: 'column' }}>
        <Section
          width={SectionSize.FULL}
          sx={{
            flexDirection: 'column',
            paddingTop: '12px',
            backgroundColor: theme.palette.background.paper,
          }}
        >
          <Typography variant="body2" sx={{ margin: '6px' }}>
            Your backstop deposit
          </Typography>
          <Row>
            <Box
              sx={{
                width: '100%',
                margin: '6px',
                padding: '12px',
                color: theme.palette.text.primary,
                backgroundColor: theme.palette.background.default,
                borderRadius: '5px',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                <Icon
                  src={`/icons/tokens/blndusdclp.svg`}
                  alt={`blndusdclp`}
                  sx={{ height: '30px', width: '30px', marginRight: '12px' }}
                />
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', flexDirection: 'row' }}>
                    <Typography variant="h4" sx={{ marginRight: '6px' }}>
                      {toBalance(backstopUserEst?.tokens)}
                    </Typography>
                    <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
                      BLND-USDC LP
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
                    {`$${toBalance(backstopDepositUSD)}`}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Row>
          <LinkBox
            sx={{ width: '100%', paddingRight: '12px' }}
            to={{ pathname: 'backstop-q4w', query: { poolId: poolId } }}
          >
            <OpaqueButton
              palette={theme.palette.positive}
              sx={{ width: '100%', margin: '6px', padding: '6px' }}
            >
              Queue for Withdrawal
            </OpaqueButton>
          </LinkBox>
        </Section>
      </Row>
      <BackstopQueueMod poolId={safePoolId} />
    </>
  );
};

export default Backstop;
