import {
  FixedMath,
  parseResult,
  PoolContract,
  PoolUser,
  Positions,
  PositionsEstimate,
  RequestType,
  SubmitArgs,
} from '@blend-capital/blend-sdk';
import { Box, CircularProgress, Typography, useTheme } from '@mui/material';
import { SorobanRpc } from '@stellar/stellar-sdk';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { useSettings, ViewType } from '../../contexts';
import { TxStatus, TxType, useWallet } from '../../contexts/wallet';
import { useHorizonAccount, usePool, usePoolOracle, usePoolUser } from '../../hooks/api';
import { RPC_DEBOUNCE_DELAY, useDebouncedState } from '../../hooks/debounce';
import { toBalance, toPercentage } from '../../utils/formatter';
import { requiresTrustline } from '../../utils/horizon';
import { scaleInputToBigInt } from '../../utils/scval';
import { getErrorFromSim, SubmitError } from '../../utils/txSim';
import { AnvilAlert } from '../common/AnvilAlert';
import { InputBar } from '../common/InputBar';
import { InputButton } from '../common/InputButton';
import { OpaqueButton } from '../common/OpaqueButton';
import { ReserveComponentProps } from '../common/ReserveComponentProps';
import { Row } from '../common/Row';
import { Section, SectionSize } from '../common/Section';
import { Skeleton } from '../common/Skeleton';
import { TxOverview } from '../common/TxOverview';
import { toUSDBalance } from '../common/USDBalance';
import { Value } from '../common/Value';
import { ValueChange } from '../common/ValueChange';

export const BorrowAnvil: React.FC<ReserveComponentProps> = ({ poolId, assetId }) => {
  const theme = useTheme();
  const { viewType } = useSettings();

  const { connected, walletAddress, poolSubmit, txStatus, txType, createTrustlines, isLoading } =
    useWallet();

  const { data: pool } = usePool(poolId);
  const { data: poolOracle } = usePoolOracle(pool);
  const { data: poolUser } = usePoolUser(pool);
  const reserve = pool?.reserves.get(assetId);
  const decimals = reserve?.config.decimals ?? 7;
  const symbol = reserve?.tokenMetadata.symbol ?? 'token';
  const { data: horizonAccount } = useHorizonAccount();

  const [toBorrow, setToBorrow] = useState<string>('');
  const [simResponse, setSimResponse] = useState<SorobanRpc.Api.SimulateTransactionResponse>();
  const [parsedSimResult, setParsedSimResult] = useState<Positions>();
  const [loadingEstimate, setLoadingEstimate] = useState<boolean>(false);
  const loading = isLoading || loadingEstimate;

  if (txStatus === TxStatus.SUCCESS && txType === TxType.CONTRACT && Number(toBorrow) != 0) {
    setToBorrow('');
  }

  const handleSubmitTransaction = async (sim: boolean) => {
    if (toBorrow && connected && reserve) {
      let submitArgs: SubmitArgs = {
        from: walletAddress,
        to: walletAddress,
        spender: walletAddress,
        requests: [
          {
            amount: scaleInputToBigInt(toBorrow, reserve.config.decimals),
            address: reserve.assetId,
            request_type: RequestType.Borrow,
          },
        ],
      };
      return await poolSubmit(poolId, submitArgs, sim);
    }
  };

  useDebouncedState(toBorrow, RPC_DEBOUNCE_DELAY, txType, async () => {
    setSimResponse(undefined);
    setParsedSimResult(undefined);
    let response = await handleSubmitTransaction(true);
    if (response) {
      setSimResponse(response);
      if (SorobanRpc.Api.isSimulationSuccess(response)) {
        setParsedSimResult(parseResult(response, PoolContract.parsers.submit));
      }
    }
    setLoadingEstimate(false);
  });

  async function handleAddAssetTrustline() {
    if (connected && reserve?.tokenMetadata?.asset) {
      const reserveAsset = reserve?.tokenMetadata?.asset;
      await createTrustlines([reserveAsset]);
    }
  }

  const AddTrustlineButton = (
    <OpaqueButton
      onClick={handleAddAssetTrustline}
      palette={theme.palette.warning}
      sx={{ padding: '6px 24px', margin: '12px auto' }}
    >
      Add {reserve?.tokenMetadata.asset?.code} Trustline
    </OpaqueButton>
  );

  const { isSubmitDisabled, isMaxDisabled, reason, disabledType, extraContent, isError } =
    useMemo(() => {
      const hasTokenTrustline = !requiresTrustline(horizonAccount, reserve?.tokenMetadata?.asset);
      if (!hasTokenTrustline) {
        let submitError: SubmitError = {
          isSubmitDisabled: true,
          isError: true,
          isMaxDisabled: true,
          reason: 'You need a trustline for this asset in order to borrow it.',
          disabledType: 'warning',
          extraContent: AddTrustlineButton,
        };
        return submitError;
      } else {
        return getErrorFromSim(toBorrow, decimals, loading, simResponse, undefined);
      }
    }, [toBorrow, simResponse, poolUser, horizonAccount]);

  if (pool === undefined || reserve === undefined) {
    return <Skeleton />;
  }

  const curPositionEstimate =
    pool && poolOracle && poolUser
      ? PositionsEstimate.build(pool, poolOracle, poolUser.positions)
      : undefined;
  const newPoolUser = parsedSimResult && new PoolUser(walletAddress, parsedSimResult, new Map());
  const newPositionEstimate =
    pool && poolOracle && parsedSimResult
      ? PositionsEstimate.build(pool, poolOracle, parsedSimResult)
      : undefined;

  const assetToBase = poolOracle?.getPriceFloat(assetId);

  const assetToEffectiveLiability = assetToBase
    ? assetToBase * reserve.getLiabilityFactor()
    : undefined;
  const curBorrowCap =
    curPositionEstimate && assetToEffectiveLiability
      ? curPositionEstimate.borrowCap / assetToEffectiveLiability
      : undefined;
  const nextBorrowCap =
    newPositionEstimate && assetToEffectiveLiability
      ? newPositionEstimate.borrowCap / assetToEffectiveLiability
      : undefined;
  const curBorrowLimit =
    curPositionEstimate && Number.isFinite(curPositionEstimate.borrowLimit)
      ? curPositionEstimate.borrowLimit
      : 0;
  const nextBorrowLimit =
    newPositionEstimate && Number.isFinite(newPositionEstimate?.borrowLimit)
      ? newPositionEstimate?.borrowLimit
      : 0;

  const handleBorrowMax = () => {
    if (reserve && assetToBase && curPositionEstimate) {
      let to_bounded_hf =
        (curPositionEstimate.totalEffectiveCollateral -
          curPositionEstimate.totalEffectiveLiabilities * 1.02) /
        1.02;
      let to_borrow = Math.min(
        to_bounded_hf / (assetToBase * reserve.getLiabilityFactor()),
        reserve.totalSupplyFloat() *
          (FixedMath.toFloat(BigInt(reserve.config.max_util), 7) - 0.01) -
          reserve.totalLiabilitiesFloat()
      );
      setToBorrow(Math.max(to_borrow, 0).toFixed(7));
      setLoadingEstimate(true);
    }
  };

  return (
    <Row>
      <Section
        width={SectionSize.FULL}
        sx={{ padding: '0px', display: 'flex', flexDirection: 'column' }}
      >
        <Box
          sx={{
            background: theme.palette.borrow.opaque,
            width: '100%',
            borderRadius: '5px',
            padding: '12px',
            marginBottom: '12px',
            boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)',
          }}
        >
          <Typography variant="body2" sx={{ marginLeft: '12px', marginBottom: '12px' }}>
            Amount to borrow
          </Typography>
          <Box
            sx={{
              width: '100%',
              height: '35px',
              display: 'flex',
              flexDirection: 'row',
              marginBottom: '12px',
            }}
          >
            <InputBar
              symbol={symbol}
              value={toBorrow}
              onValueChange={(v) => {
                setToBorrow(v);
                setLoadingEstimate(true);
              }}
              palette={theme.palette.borrow}
              sx={{ width: '100%' }}
            >
              <InputButton
                palette={theme.palette.borrow}
                onClick={handleBorrowMax}
                disabled={isMaxDisabled}
                text="MAX"
              />
            </InputBar>
            {viewType !== ViewType.MOBILE && (
              <OpaqueButton
                onClick={() => handleSubmitTransaction(false)}
                palette={theme.palette.borrow}
                sx={{ minWidth: '108px', marginLeft: '12px', padding: '6px' }}
                disabled={isSubmitDisabled}
              >
                Borrow
              </OpaqueButton>
            )}
          </Box>
          <Box sx={{ marginLeft: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Typography variant="h5" sx={{ color: theme.palette.text.secondary }}>
              {toUSDBalance(assetToBase, Number(toBorrow ?? 0))}
            </Typography>
            {viewType === ViewType.MOBILE && (
              <OpaqueButton
                onClick={() => handleSubmitTransaction(false)}
                palette={theme.palette.borrow}
                sx={{ minWidth: '108px', width: '100%', padding: '6px' }}
                disabled={isSubmitDisabled}
              >
                Borrow
              </OpaqueButton>
            )}
          </Box>
        </Box>
        {!isError && (
          <TxOverview>
            {!isLoading && (
              <>
                <Value title="Amount to borrow" value={`${toBorrow ?? '0'} ${symbol}`} />
                <Value
                  title={
                    <>
                      <Image src="/icons/dashboard/gascan.svg" alt="blend" width={20} height={20} />{' '}
                      Gas
                    </>
                  }
                  value={`${toBalance(
                    BigInt((simResponse as any)?.minResourceFee ?? 0),
                    decimals
                  )} XLM`}
                />
                <ValueChange
                  title="Your total borrowed"
                  curValue={`${toBalance(poolUser?.getLiabilitiesFloat(reserve) ?? 0)} ${symbol}`}
                  newValue={`${toBalance(
                    newPoolUser?.getLiabilitiesFloat(reserve) ?? 0
                  )} ${symbol}`}
                />
                <ValueChange
                  title="Borrow capacity"
                  curValue={`${toBalance(curBorrowCap)} ${symbol}`}
                  newValue={`${toBalance(nextBorrowCap)} ${symbol}`}
                />
                <ValueChange
                  title="Borrow limit"
                  curValue={toPercentage(curBorrowLimit)}
                  newValue={toPercentage(nextBorrowLimit)}
                />
              </>
            )}
            {isLoading && (
              <Box
                sx={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <CircularProgress color={'borrow' as any} />
              </Box>
            )}
          </TxOverview>
        )}
        {isError && (
          <AnvilAlert severity={disabledType} message={reason} extraContent={extraContent} />
        )}
      </Section>
    </Row>
  );
};
