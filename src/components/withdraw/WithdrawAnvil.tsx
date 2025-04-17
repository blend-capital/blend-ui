import {
  parseResult,
  PoolContractV1,
  PoolUser,
  Positions,
  PositionsEstimate,
  RequestType,
  SubmitArgs,
} from '@blend-capital/blend-sdk';
import { Box, Typography, useTheme } from '@mui/material';
import { rpc } from '@stellar/stellar-sdk';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { useSettings, ViewType } from '../../contexts';
import { TxStatus, TxType, useWallet } from '../../contexts/wallet';
import {
  useHorizonAccount,
  usePool,
  usePoolMeta,
  usePoolOracle,
  usePoolUser,
  useTokenMetadata,
} from '../../hooks/api';
import { RPC_DEBOUNCE_DELAY, useDebouncedState } from '../../hooks/debounce';
import { toBalance, toCompactAddress, toPercentage } from '../../utils/formatter';
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
import { TxFeeSelector } from '../common/TxFeeSelector';
import { TxOverview } from '../common/TxOverview';
import { toUSDBalance } from '../common/USDBalance';
import { Value } from '../common/Value';
import { ValueChange } from '../common/ValueChange';

export const WithdrawAnvil: React.FC<ReserveComponentProps> = ({ poolId, assetId }) => {
  const theme = useTheme();
  const { viewType } = useSettings();

  const {
    connected,
    walletAddress,
    poolSubmit,
    txStatus,
    txType,
    createTrustlines,
    isLoading,
    txFee,
  } = useWallet();

  const { data: poolMeta } = usePoolMeta(poolId);
  const { data: pool } = usePool(poolMeta);
  const { data: poolOracle } = usePoolOracle(pool);
  const { data: poolUser } = usePoolUser(pool);
  const { data: tokenMetadata } = useTokenMetadata(assetId);
  const reserve = pool?.reserves.get(assetId);
  const decimals = reserve?.config.decimals ?? 7;
  const symbol = tokenMetadata?.symbol ?? toCompactAddress(assetId);
  const { data: horizonAccount } = useHorizonAccount();

  const [toWithdrawSubmit, setToWithdrawSubmit] = useState<string | undefined>(undefined);
  const [toWithdraw, setToWithdraw] = useState<string>('');
  const [simResponse, setSimResponse] = useState<rpc.Api.SimulateTransactionResponse>();
  const [parsedSimResult, setParsedSimResult] = useState<Positions>();
  const [loadingEstimate, setLoadingEstimate] = useState<boolean>(false);
  const loading = isLoading || loadingEstimate;

  if (txStatus === TxStatus.SUCCESS && txType === TxType.CONTRACT && Number(toWithdraw) != 0) {
    setToWithdraw('');
  }

  const handleSubmitTransaction = async (sim: boolean) => {
    if (toWithdrawSubmit && connected && poolMeta && reserve) {
      let submitArgs: SubmitArgs = {
        from: walletAddress,
        to: walletAddress,
        spender: walletAddress,
        requests: [
          {
            amount: scaleInputToBigInt(toWithdrawSubmit, decimals),
            request_type: RequestType.WithdrawCollateral,
            address: reserve.assetId,
          },
        ],
      };
      return await poolSubmit(poolMeta, submitArgs, sim);
    }
  };

  useDebouncedState(toWithdrawSubmit, RPC_DEBOUNCE_DELAY, txType, async () => {
    setSimResponse(undefined);
    setParsedSimResult(undefined);
    let response = await handleSubmitTransaction(true);
    if (response) {
      setSimResponse(response);
      if (rpc.Api.isSimulationSuccess(response)) {
        setParsedSimResult(parseResult(response, PoolContractV1.parsers.submit));
      }
    }
    setLoadingEstimate(false);
  });

  async function handleAddAssetTrustline() {
    if (connected && tokenMetadata?.asset) {
      const reserveAsset = tokenMetadata?.asset;
      await createTrustlines([reserveAsset]);
    }
  }

  const AddTrustlineButton = (
    <OpaqueButton
      onClick={handleAddAssetTrustline}
      palette={theme.palette.warning}
      sx={{ padding: '6px 24px', margin: '12px auto' }}
    >
      Add {symbol} Trustline
    </OpaqueButton>
  );

  const { isSubmitDisabled, isMaxDisabled, reason, disabledType, extraContent, isError } =
    useMemo(() => {
      const hasTokenTrustline = !requiresTrustline(horizonAccount, tokenMetadata?.asset);
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
        return getErrorFromSim(toWithdraw, decimals, loading, simResponse, undefined);
      }
    }, [toWithdraw, simResponse, loading, horizonAccount]);

  if (pool === undefined || reserve === undefined) {
    return <Skeleton />;
  }

  const curPositionsEstimate =
    pool && poolOracle && poolUser
      ? PositionsEstimate.build(pool, poolOracle, poolUser.positions)
      : undefined;
  const newPoolUser = parsedSimResult && new PoolUser(walletAddress, parsedSimResult, new Map());
  const newPositionsEstimate =
    pool && parsedSimResult && poolOracle
      ? PositionsEstimate.build(pool, poolOracle, parsedSimResult)
      : undefined;

  const assetToBase = poolOracle?.getPriceFloat(assetId);

  const curBorrowCap = curPositionsEstimate?.borrowCap;
  const nextBorrowCap = newPositionsEstimate?.borrowCap;
  const curBorrowLimit =
    curPositionsEstimate && Number.isFinite(curPositionsEstimate?.borrowLimit)
      ? curPositionsEstimate.borrowLimit
      : 0;
  const nextBorrowLimit =
    newPositionsEstimate && Number.isFinite(newPositionsEstimate?.borrowLimit)
      ? newPositionsEstimate?.borrowLimit
      : 0;

  const handleWithdrawAmountChange = (withdrawInput: string) => {
    if (reserve && poolUser) {
      let curSupplied = poolUser.getCollateralFloat(reserve);
      let realWithdraw = withdrawInput;
      let num_withdraw = Number(withdrawInput);
      if (num_withdraw > curSupplied) {
        // truncate to supplied, but store full amount to avoid dust
        // and allow contract to pull down to real supplied amount
        realWithdraw = curSupplied.toFixed(decimals);
        num_withdraw = Number(realWithdraw);
      }
      setToWithdraw(realWithdraw);
      setToWithdrawSubmit(withdrawInput);
      setLoadingEstimate(true);
    }
  };

  const handleWithdrawMax = () => {
    if (reserve && poolUser) {
      let curSupplied = poolUser.getCollateralFloat(reserve);
      if (poolUser.positions.liabilities.size === 0) {
        handleWithdrawAmountChange((curSupplied * 1.005).toFixed(decimals));
      } else if (curPositionsEstimate && assetToBase) {
        let to_bounded_hf =
          (curPositionsEstimate.totalEffectiveCollateral -
            curPositionsEstimate.totalEffectiveLiabilities * 1.02) /
          1.02;
        let to_wd = to_bounded_hf / (assetToBase * reserve.getCollateralFactor());
        let withdrawAmount = Math.min(to_wd, curSupplied) + 1 / 10 ** decimals;
        handleWithdrawAmountChange(Math.max(withdrawAmount, 0).toFixed(decimals));
      }
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
            background: theme.palette.lend.opaque,
            width: '100%',
            borderRadius: '5px',
            padding: '12px',
            marginBottom: '12px',
            boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)',
          }}
        >
          <Typography variant="body2" sx={{ marginLeft: '12px', marginBottom: '12px' }}>
            Amount to withdraw
          </Typography>
          <Box
            sx={{
              width: '100%',
              height: '35px',
              display: 'flex',
              flexDirection: 'row',
              marginBottom: '6px',
            }}
          >
            <InputBar
              symbol={symbol}
              value={toWithdraw}
              onValueChange={(v) => {
                handleWithdrawAmountChange(v);
                setLoadingEstimate(true);
              }}
              palette={theme.palette.lend}
              sx={{ width: '100%' }}
            >
              <InputButton
                palette={theme.palette.lend}
                onClick={handleWithdrawMax}
                disabled={isMaxDisabled}
                text="MAX"
              />
            </InputBar>
            {viewType !== ViewType.MOBILE && (
              <OpaqueButton
                onClick={() => handleSubmitTransaction(false)}
                palette={theme.palette.lend}
                sx={{ minWidth: '108px', marginLeft: '12px', padding: '6px' }}
                disabled={isSubmitDisabled}
              >
                Withdraw
              </OpaqueButton>
            )}
          </Box>
          <Box
            sx={{
              marginLeft: '12px',
              display: 'flex',
              flexDirection: 'row',
              gap: '12px',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography variant="h5" sx={{ color: theme.palette.text.secondary }}>
              {toUSDBalance(assetToBase, Number(toWithdraw ?? 0))}
            </Typography>
            <TxFeeSelector />
          </Box>
          {viewType === ViewType.MOBILE && (
            <OpaqueButton
              onClick={() => handleSubmitTransaction(false)}
              palette={theme.palette.lend}
              sx={{ minWidth: '108px', padding: '6px', width: '100%', marginTop: '6px' }}
              disabled={isSubmitDisabled}
            >
              Withdraw
            </OpaqueButton>
          )}
        </Box>
        {!isError && (
          <TxOverview>
            <>
              <Value title="Amount to withdraw" value={`${toWithdraw ?? '0'} ${symbol}`} />
              <Value
                title={
                  <>
                    <Image src="/icons/dashboard/gascan.svg" alt="blend" width={20} height={20} />{' '}
                    Gas
                  </>
                }
                value={`${toBalance(
                  BigInt((simResponse as any)?.minResourceFee ?? 0) + BigInt(txFee),
                  decimals
                )} XLM`}
              />
              <ValueChange
                title="Your total supplied"
                curValue={`${toBalance(poolUser?.getCollateralFloat(reserve))} ${symbol}`}
                newValue={`${toBalance(newPoolUser?.getCollateralFloat(reserve))} ${symbol}`}
              />
              <ValueChange
                title="Borrow capacity"
                curValue={`$${toBalance(curBorrowCap)}`}
                newValue={`$${toBalance(nextBorrowCap)}`}
              />
              <ValueChange
                title="Borrow limit"
                curValue={toPercentage(curBorrowLimit)}
                newValue={toPercentage(nextBorrowLimit)}
              />
            </>
          </TxOverview>
        )}
        {isError && (
          <AnvilAlert severity={disabledType} message={reason} extraContent={extraContent} />
        )}
      </Section>
    </Row>
  );
};
