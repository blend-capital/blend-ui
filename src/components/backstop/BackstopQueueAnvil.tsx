import {
  BackstopContractV1,
  BackstopPoolUserEst,
  FixedMath,
  parseResult,
  PoolBackstopActionArgs,
  Q4W,
} from '@blend-capital/blend-sdk';
import { Box, Typography, useTheme } from '@mui/material';
import { rpc } from '@stellar/stellar-sdk';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { useSettings, ViewType } from '../../contexts';
import { TxStatus, TxType, useWallet } from '../../contexts/wallet';
import { useBackstop, useBackstopPool, useBackstopPoolUser, usePoolMeta } from '../../hooks/api';
import { RPC_DEBOUNCE_DELAY, useDebouncedState } from '../../hooks/debounce';
import { toBalance } from '../../utils/formatter';
import { getErrorFromSim, SubmitError } from '../../utils/txSim';
import { AnvilAlert } from '../common/AnvilAlert';
import { InputBar } from '../common/InputBar';
import { InputButton } from '../common/InputButton';
import { OpaqueButton } from '../common/OpaqueButton';
import { PoolComponentProps } from '../common/PoolComponentProps';
import { Row } from '../common/Row';
import { Section, SectionSize } from '../common/Section';
import { Skeleton } from '../common/Skeleton';
import { TxFeeSelector } from '../common/TxFeeSelector';
import { TxOverview } from '../common/TxOverview';
import { Value } from '../common/Value';
import { ValueChange } from '../common/ValueChange';

export const BackstopQueueAnvil: React.FC<PoolComponentProps> = ({ poolId }) => {
  const theme = useTheme();
  const { viewType } = useSettings();

  const { connected, walletAddress, backstopQueueWithdrawal, txType, txStatus, isLoading, txFee } =
    useWallet();

  const { data: poolMeta } = usePoolMeta(poolId);
  const { data: backstop } = useBackstop(poolMeta?.version);
  const { data: backstopPoolData } = useBackstopPool(poolMeta);
  const { data: backstopUserData } = useBackstopPoolUser(poolMeta);

  const [toQueue, setToQueue] = useState<string>('');
  const [toQueueShares, setToQueueShares] = useState<bigint>(BigInt(0));
  const [simResponse, setSimResponse] = useState<rpc.Api.SimulateTransactionResponse>();
  const [parsedSimResult, setParsedSimResult] = useState<Q4W>();
  const [loadingEstimate, setLoadingEstimate] = useState<boolean>(false);
  const [sendingTx, setSendingTx] = useState<boolean>(false);
  const loading = isLoading || loadingEstimate;
  const decimals = 7;

  useDebouncedState(toQueue, RPC_DEBOUNCE_DELAY, txType, async () => {
    setSimResponse(undefined);
    setParsedSimResult(undefined);
    await handleSubmitTransaction(true);
    setLoadingEstimate(false);
  });

  if (txStatus === TxStatus.SUCCESS && txType === TxType.CONTRACT && Number(toQueue) != 0) {
    setToQueue('');
  }
  if ((txStatus === TxStatus.FAIL || txStatus === TxStatus.SUCCESS) && sendingTx) {
    setSendingTx(false);
  }
  const displayTxOverview =
    txStatus === TxStatus.SUCCESS || txStatus === TxStatus.NONE || sendingTx;
  const { isError, isSubmitDisabled, isMaxDisabled, reason, disabledType, extraContent } =
    useMemo(() => {
      if (toQueue !== '' && toQueueShares === BigInt(0)) {
        return {
          isSubmitDisabled: true,
          isError: true,
          isMaxDisabled: false,
          reason: 'Please enter a valid number of tokens to queue for withdrawal.',
          disabledType: 'warning',
          extraContent: undefined,
        } as SubmitError;
      }
      return getErrorFromSim(toQueue, decimals, loading, simResponse, undefined);
    }, [simResponse, toQueue, backstopUserData, loading]);

  if (backstop === undefined || backstopPoolData === undefined) {
    return <Skeleton />;
  }

  const backstopUserEst =
    backstopUserData !== undefined
      ? BackstopPoolUserEst.build(backstop, backstopPoolData, backstopUserData)
      : undefined;

  const backstopTokenPrice = backstop?.backstopToken.lpTokenPrice ?? 1;
  const sharesToTokens =
    Number(backstopPoolData?.poolBalance.tokens) / Number(backstopPoolData?.poolBalance.shares);
  const tokensToShares =
    Number(backstopPoolData?.poolBalance.shares) / Number(backstopPoolData?.poolBalance.tokens);

  const currentTokensQ4WFloat = backstopUserData
    ? FixedMath.toFloat(backstopUserData.balance.totalQ4W, 7) * sharesToTokens
    : 0;

  const handleInputChange = (input: string) => {
    const as_number = Number(input);
    if (!Number.isNaN(as_number)) {
      const as_shares = as_number * tokensToShares;
      const as_bigint = BigInt(Math.floor(as_shares * 1e7));
      setToQueueShares(as_bigint);
    } else {
      setToQueueShares(BigInt(0));
    }
    setToQueue(input);
  };

  const handleQueueMax = () => {
    if (backstopUserData && backstopUserEst && backstopUserEst.tokens > 0) {
      setToQueue(backstopUserEst.tokens.toFixed(7));
      setToQueueShares(backstopUserData.balance.shares);
    }
  };

  const handleSubmitTransaction = async (sim: boolean) => {
    if (connected && poolMeta && toQueueShares !== BigInt(0)) {
      let depositArgs: PoolBackstopActionArgs = {
        from: walletAddress,
        pool_address: poolId,
        amount: toQueueShares,
      };
      let response = await backstopQueueWithdrawal(poolMeta, depositArgs, sim);
      if (response) {
        setSimResponse(response);
        if (rpc.Api.isSimulationSuccess(response)) {
          setParsedSimResult(parseResult(response, BackstopContractV1.parsers.queueWithdrawal));
        }
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
            background: theme.palette.backstop.opaque,
            width: '100%',
            borderRadius: '5px',
            padding: '12px',
            marginBottom: '12px',
            boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)',
          }}
        >
          <Typography variant="body2" sx={{ marginLeft: '12px', marginBottom: '12px' }}>
            Amount to queue for withdrawal
          </Typography>
          <Box
            sx={{
              width: '100%',
              display: 'flex',
              gap: '12px',
              flexDirection: viewType !== ViewType.MOBILE ? 'row' : 'column',
              marginBottom: '6px',
            }}
          >
            <InputBar
              symbol={'BLND-USDC LP'}
              value={toQueue}
              onValueChange={handleInputChange}
              palette={theme.palette.backstop}
              sx={{ width: '100%', display: 'flex' }}
            >
              <InputButton
                palette={theme.palette.backstop}
                onClick={handleQueueMax}
                disabled={isMaxDisabled}
                text="MAX"
              />
            </InputBar>
            {viewType !== ViewType.MOBILE && (
              <OpaqueButton
                onClick={() => {
                  handleSubmitTransaction(false);
                  setSendingTx(true);
                }}
                palette={theme.palette.backstop}
                sx={{ minWidth: '108px', padding: '6px', display: 'flex' }}
                disabled={isSubmitDisabled}
              >
                Queue
              </OpaqueButton>
            )}
          </Box>
          <Box
            sx={{
              marginLeft: '12px',
              display: 'flex',
              flexDirection: 'row',
              gap: '12px',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography variant="h5" sx={{ color: theme.palette.text.secondary }}>
              {`$${toBalance(Number(toQueue ?? 0) * backstopTokenPrice)}`}
            </Typography>
            <TxFeeSelector />
          </Box>
          {viewType === ViewType.MOBILE && (
            <OpaqueButton
              onClick={() => {
                handleSubmitTransaction(false);
                setSendingTx(true);
              }}
              palette={theme.palette.backstop}
              sx={{
                minWidth: '108px',
                padding: '6px',
                display: 'flex',
                width: '100%',
                marginTop: '6px',
              }}
              disabled={isSubmitDisabled}
            >
              Queue
            </OpaqueButton>
          )}
        </Box>
        {!isError && displayTxOverview && (
          <TxOverview>
            <>
              <Value title="Amount to queue" value={`${toQueue ?? '0'} BLND-USDC LP`} />
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
              <Value
                title="New queue expiration"
                value={
                  (parsedSimResult
                    ? new Date(Number(parsedSimResult.exp) * 1000)
                    : new Date(Date.now() + 21 * 24 * 60 * 60 * 1000)
                  )
                    .toISOString()
                    .split('T')[0]
                }
              />

              <ValueChange
                title="Your total amount queued"
                curValue={`${toBalance(currentTokensQ4WFloat)} BLND-USDC LP`}
                newValue={`${toBalance(
                  backstopUserEst && parsedSimResult
                    ? currentTokensQ4WFloat +
                        FixedMath.toFloat(parsedSimResult.amount, 7) * sharesToTokens
                    : 0
                )} BLND-USDC LP`}
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
