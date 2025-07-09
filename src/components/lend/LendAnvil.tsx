import {
  FixedMath,
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
  useTokenBalance,
  useTokenMetadata,
} from '../../hooks/api';
import { RPC_DEBOUNCE_DELAY, useDebouncedState } from '../../hooks/debounce';
import { toBalance, toCompactAddress, toPercentage } from '../../utils/formatter';
import { getAssetReserve } from '../../utils/horizon';
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
import { PoolStatusBanner } from '../pool/PoolStatusBanner';

export const LendAnvil: React.FC<ReserveComponentProps> = ({ poolId, assetId }) => {
  const theme = useTheme();
  const { viewType } = useSettings();

  const { connected, walletAddress, poolSubmit, txStatus, txType, isLoading, txInclusionFee } =
    useWallet();

  const { data: poolMeta } = usePoolMeta(poolId);
  const { data: pool } = usePool(poolMeta);
  const { data: poolOracle } = usePoolOracle(pool);
  const { data: poolUser } = usePoolUser(pool);
  const { data: tokenMetadata } = useTokenMetadata(assetId);
  const { data: horizonAccount } = useHorizonAccount();
  const { data: tokenBalance } = useTokenBalance(assetId, tokenMetadata?.asset, horizonAccount);

  const [toLend, setToLend] = useState<string>('');
  const [simResponse, setSimResponse] = useState<rpc.Api.SimulateTransactionResponse>();
  const [parsedSimResult, setParsedSimResult] = useState<Positions>();
  const [loadingEstimate, setLoadingEstimate] = useState<boolean>(false);

  const loading = isLoading || loadingEstimate;
  const reserve = pool?.reserves.get(assetId);
  const decimals = reserve?.config.decimals ?? 7;
  const symbol = tokenMetadata?.symbol ?? toCompactAddress(assetId);

  if (txStatus === TxStatus.SUCCESS && txType === TxType.CONTRACT && Number(toLend) != 0) {
    setToLend('');
  }

  // calculate current wallet state
  const stellar_reserve_amount = getAssetReserve(horizonAccount, tokenMetadata?.asset);
  const freeUserBalanceScaled =
    FixedMath.toFloat(tokenBalance ?? BigInt(0), reserve?.config?.decimals) -
    stellar_reserve_amount;

  const { isSubmitDisabled, isMaxDisabled, reason, disabledType, isError, extraContent } =
    useMemo(() => {
      if (stellar_reserve_amount > 0 && Number(toLend) > freeUserBalanceScaled) {
        return {
          isSubmitDisabled: true,
          isError: true,
          isMaxDisabled: false,
          reason: `Your account requires a minimum balance of ${stellar_reserve_amount.toFixed(
            2
          )} ${symbol} for ${
            tokenMetadata?.asset?.isNative() ? 'account reserves, fees, and ' : ''
          }selling liabilities.`,
          disabledType: 'error',
        } as SubmitError;
      } else {
        return getErrorFromSim(toLend, decimals, loading, simResponse, undefined);
      }
    }, [freeUserBalanceScaled, toLend, simResponse, loading]);

  const handleSubmitTransaction = async (sim: boolean) => {
    if (toLend && connected && poolMeta && reserve) {
      let submitArgs: SubmitArgs = {
        from: walletAddress,
        spender: walletAddress,
        to: walletAddress,
        requests: [
          {
            amount: scaleInputToBigInt(toLend, reserve.config.decimals),
            request_type: RequestType.SupplyCollateral,
            address: reserve.assetId,
          },
        ],
      };
      return await poolSubmit(poolMeta, submitArgs, sim);
    }
  };

  useDebouncedState(toLend, RPC_DEBOUNCE_DELAY, txType, async () => {
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

  if (pool === undefined || reserve === undefined) {
    return <Skeleton />;
  }

  if (pool.metadata.status > 3) {
    return <PoolStatusBanner status={pool.metadata.status} />;
  }

  const curPositionsEstimate =
    pool && poolOracle && poolUser
      ? PositionsEstimate.build(pool, poolOracle, poolUser.positions)
      : undefined;
  const newPoolUser = parsedSimResult && new PoolUser(walletAddress, parsedSimResult, new Map());
  const newPositionsEstimate =
    pool && poolOracle && parsedSimResult
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

  const handleLendMax = () => {
    if (poolUser) {
      if (freeUserBalanceScaled > 0) {
        setToLend(freeUserBalanceScaled.toFixed(decimals));
        setLoadingEstimate(true);
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
            Amount to supply
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
              value={toLend}
              onValueChange={(v) => {
                setToLend(v);
                setLoadingEstimate(true);
              }}
              sx={{ width: '100%' }}
              palette={theme.palette.lend}
            >
              <InputButton
                palette={theme.palette.lend}
                onClick={handleLendMax}
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
                Supply
              </OpaqueButton>
            )}
          </Box>
          <Box
            sx={{
              marginLeft: '6px',
              display: 'flex',
              flexDirection: 'row',
              gap: '12px',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography variant="h5" sx={{ color: theme.palette.text.secondary }}>
              {toUSDBalance(assetToBase, Number(toLend ?? 0))}
            </Typography>
            <TxFeeSelector />
          </Box>
          {viewType === ViewType.MOBILE && (
            <OpaqueButton
              onClick={() => handleSubmitTransaction(false)}
              palette={theme.palette.lend}
              sx={{ minWidth: '108px', width: '100%', padding: '6px', marginTop: '6px' }}
              disabled={isSubmitDisabled}
            >
              Supply
            </OpaqueButton>
          )}
        </Box>
        {!isError && (
          <TxOverview>
            <>
              <Value title="Amount to supply" value={`${toLend ?? '0'} ${symbol}`} />
              <Value
                title={
                  <>
                    <Image src="/icons/dashboard/gascan.svg" alt="blend" width={20} height={20} />{' '}
                    Gas
                  </>
                }
                value={`${toBalance(
                  BigInt((simResponse as any)?.minResourceFee ?? 0) + BigInt(txInclusionFee.fee),
                  decimals
                )} XLM`}
              />
              <ValueChange
                title="Your total supplied"
                curValue={`${toBalance(poolUser?.getCollateralFloat(reserve), decimals)} ${symbol}`}
                newValue={`${toBalance(
                  newPoolUser?.getCollateralFloat(reserve),
                  decimals
                )} ${symbol}`}
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
