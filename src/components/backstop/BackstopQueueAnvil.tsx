import {
  ContractErrorType,
  ContractResponse,
  PoolBackstopActionArgs,
  Q4W,
} from '@blend-capital/blend-sdk';
import { Box, Typography, useTheme } from '@mui/material';
import { useMemo, useState } from 'react';
import { TxStatus, TxType, useWallet } from '../../contexts/wallet';
import { RPC_DEBOUNCE_DELAY, useDebouncedState } from '../../hooks/debounce';
import { useStore } from '../../store/store';
import { toBalance } from '../../utils/formatter';
import { scaleInputToBigInt } from '../../utils/scval';
import { InputBar } from '../common/InputBar';
import { OpaqueButton } from '../common/OpaqueButton';
import { PoolComponentProps } from '../common/PoolComponentProps';
import { Row } from '../common/Row';
import { Section, SectionSize } from '../common/Section';
import { SubmitError, TxOverview } from '../common/TxOverview';
import { Value } from '../common/Value';
import { ValueChange } from '../common/ValueChange';

export const BackstopQueueAnvil: React.FC<PoolComponentProps> = ({ poolId }) => {
  const theme = useTheme();
  const { connected, walletAddress, backstopQueueWithdrawal, txType, txStatus } = useWallet();

  const backstop = useStore((state) => state.backstop);
  const backstopPoolData = useStore((state) => state.backstop?.pools?.get(poolId));
  const userBackstopData = useStore((state) => state.backstopUserData);
  const userPoolBackstopEst = userBackstopData?.estimates.get(poolId);
  const backstopTokenPrice = backstop?.lpTokenPrice ?? 1;
  const decimals = 7;
  const sharesToTokens =
    Number(backstopPoolData?.poolBalance.tokens) / Number(backstopPoolData?.poolBalance.shares);
  const userBackstopTokens =
    userPoolBackstopEst && backstop
      ? userPoolBackstopEst?.totalSpotValue / backstop.lpTokenPrice
      : 0;

  const [toQueue, setToQueue] = useState<string>('');
  const [simResponse, setSimResponse] = useState<ContractResponse<Q4W>>();
  const [validDecimals, setValidDecimals] = useState<boolean>(true);

  useDebouncedState(toQueue, RPC_DEBOUNCE_DELAY, txType, async () => {
    handleSubmitTransaction(true);
  });

  if (txStatus === TxStatus.SUCCESS && txType === TxType.CONTRACT && Number(toQueue) != 0) {
    setToQueue('');
  }

  // verify that the user can act
  const { isSubmitDisabled, isMaxDisabled, reason, disabledType } = useMemo(() => {
    const errorProps: SubmitError = {
      isSubmitDisabled: false,
      isMaxDisabled: false,
      reason: undefined,
      disabledType: undefined,
    };
    if (toQueue.split('.')[1]?.length > decimals) {
      setValidDecimals(false);
      errorProps.isSubmitDisabled = true;
      errorProps.isMaxDisabled = false;
      errorProps.reason = `You cannot supply more than ${decimals} decimal places.`;
      errorProps.disabledType = 'warning';
    } else if (simResponse?.result.isErr()) {
      errorProps.isSubmitDisabled = true;
      errorProps.isMaxDisabled = false;
      errorProps.reason = ContractErrorType[simResponse?.result.unwrapErr().type];
      errorProps.disabledType = 'warning';
    }
    return errorProps;
  }, [toQueue, userBackstopData]);

  const handleQueueMax = () => {
    if (userBackstopTokens > 0) {
      setToQueue(userBackstopTokens.toFixed(7));
    }
  };
  console.log(userPoolBackstopEst);
  const handleSubmitTransaction = async (sim: boolean) => {
    if (toQueue && connected && validDecimals) {
      let depositArgs: PoolBackstopActionArgs = {
        from: walletAddress,
        pool_address: poolId,
        amount: scaleInputToBigInt(toQueue, 7),
      };
      let response = await backstopQueueWithdrawal(depositArgs, sim);
      setSimResponse(response);
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
              height: '35px',
              display: 'flex',
              flexDirection: 'row',
              marginBottom: '12px',
            }}
          >
            <InputBar
              symbol={'BLND-USDC LP'}
              value={toQueue}
              onValueChange={setToQueue}
              onSetMax={handleQueueMax}
              palette={theme.palette.backstop}
              sx={{ width: '100%' }}
              isMaxDisabled={isMaxDisabled}
            />
            <OpaqueButton
              onClick={() => handleSubmitTransaction(false)}
              palette={theme.palette.backstop}
              sx={{ minWidth: '108px', marginLeft: '12px', padding: '6px' }}
              disabled={isSubmitDisabled}
            >
              Queue
            </OpaqueButton>
          </Box>
          <Box sx={{ marginLeft: '12px' }}>
            <Typography variant="h5" sx={{ color: theme.palette.text.secondary }}>
              {`$${toBalance(Number(toQueue ?? 0) * backstopTokenPrice)}`}
            </Typography>
          </Box>
        </Box>
        <TxOverview
          isDisabled={isSubmitDisabled}
          disabledType={disabledType}
          reason={reason}
          simResponse={simResponse}
        >
          <Value title="Amount to queue" value={`${toQueue ?? '0'} BLND-USDC LP`} />
          <Value
            title="New queue expiration"
            value={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
          />

          <ValueChange
            title="Your total amount queued"
            curValue={`${toBalance(userPoolBackstopEst?.totalQueuedTokens)} BLND-USDC LP`}
            newValue={`${toBalance(
              userPoolBackstopEst
                ? userPoolBackstopEst.totalQueuedTokens +
                    (Number(simResponse?.result.unwrap().amount) / 1e7) * sharesToTokens
                : 0
            )} BLND-USDC LP`}
          />
        </TxOverview>
      </Section>
    </Row>
  );
};
