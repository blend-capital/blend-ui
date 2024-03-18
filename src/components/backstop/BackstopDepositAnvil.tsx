import {
  ContractErrorType,
  ContractResponse,
  PoolBackstopActionArgs,
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

export const BackstopDepositAnvil: React.FC<PoolComponentProps> = ({ poolId }) => {
  const theme = useTheme();
  const { connected, walletAddress, backstopDeposit, txStatus, txType } = useWallet();

  const backstopData = useStore((state) => state.backstop);
  const backstopPoolData = useStore((state) => state.backstop?.pools?.get(poolId));
  const userBackstopData = useStore((state) => state.backstopUserData);
  const userBackstopEst = userBackstopData?.estimates.get(poolId);
  const userBalance = Number(userBackstopData?.tokens ?? BigInt(0)) / 1e7;
  const decimals = 7;
  let userBackstopTokens =
    userBackstopEst && backstopData
      ? userBackstopEst.totalSpotValue / backstopData.lpTokenPrice
      : 0;
  let sharesToTokens = backstopPoolData
    ? Number(backstopPoolData.poolBalance.tokens) / Number(backstopPoolData.poolBalance.shares)
    : 0;
  const [toDeposit, setToDeposit] = useState<string>('');
  const [simResponse, setSimResponse] = useState<ContractResponse<bigint>>();

  if (txStatus === TxStatus.SUCCESS && txType === TxType.CONTRACT && Number(toDeposit) != 0) {
    setToDeposit('');
  }

  useDebouncedState(toDeposit, RPC_DEBOUNCE_DELAY, txType, async () => {
    handleSubmitTransaction(true);
  });

  // verify that the user can act
  const { isSubmitDisabled, isMaxDisabled, reason, disabledType } = useMemo(() => {
    const errorProps: SubmitError = {
      isSubmitDisabled: false,
      isMaxDisabled: false,
      reason: undefined,
      disabledType: undefined,
    };
    if (toDeposit.split('.')[1]?.length > decimals) {
      errorProps.isSubmitDisabled = true;
      errorProps.isMaxDisabled = false;
      errorProps.reason = `You cannot supply more than ${decimals} decimal places.`;
      errorProps.disabledType = 'warning';
    } else if (simResponse?.result.isErr()) {
      errorProps.isSubmitDisabled = true;
      errorProps.isMaxDisabled = false;
      errorProps.reason = ContractErrorType[simResponse.result.unwrapErr().type];
      errorProps.disabledType = 'warning';
    }
    return errorProps;
  }, [toDeposit, userBalance]);

  const handleDepositMax = () => {
    if (userBackstopData) {
      setToDeposit(userBalance.toFixed(7));
    }
  };

  const handleSubmitTransaction = async (sim: boolean) => {
    if (toDeposit && connected) {
      let depositArgs: PoolBackstopActionArgs = {
        from: walletAddress,
        pool_address: poolId,
        amount: scaleInputToBigInt(toDeposit, 7),
      };
      let response = await backstopDeposit(depositArgs, sim);
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
            Amount to deposit
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
              value={toDeposit}
              onValueChange={setToDeposit}
              onSetMax={handleDepositMax}
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
              Deposit
            </OpaqueButton>
          </Box>
          <Box sx={{ marginLeft: '12px' }}>
            <Typography variant="h5" sx={{ color: theme.palette.text.secondary }}>
              {`$${toBalance(Number(toDeposit ?? 0) * (backstopData?.lpTokenPrice ?? 1))}`}
            </Typography>
          </Box>
        </Box>
        <TxOverview
          isDisabled={isSubmitDisabled}
          disabledType={disabledType}
          reason={reason}
          simResponse={simResponse}
        >
          <Value title="Amount to deposit" value={`${toDeposit ?? '0'} BLND-USDC LP`} />
          <ValueChange
            title="Your total deposit"
            curValue={`${toBalance(userBackstopTokens)} BLND-USDC LP`}
            newValue={`${toBalance(
              simResponse
                ? userBackstopTokens + (Number(simResponse.result.unwrap()) / 1e7) * sharesToTokens
                : 0
            )} BLND-USDC LP`}
          />
        </TxOverview>
      </Section>
    </Row>
  );
};
