import {
  ContractErrorType,
  ContractResponse,
  PositionEstimates,
  Positions,
  RequestType,
  SubmitArgs,
} from '@blend-capital/blend-sdk';
import { Box, Typography, useTheme } from '@mui/material';
import { useMemo, useState } from 'react';
import { TxStatus, useWallet } from '../../contexts/wallet';
import { useDebouncedState } from '../../hooks/debounce';
import { useStore } from '../../store/store';
import { toBalance, toPercentage } from '../../utils/formatter';
import { scaleInputToBigInt } from '../../utils/scval';
import { InputBar } from '../common/InputBar';
import { OpaqueButton } from '../common/OpaqueButton';
import { ReserveComponentProps } from '../common/ReserveComponentProps';
import { Row } from '../common/Row';
import { Section, SectionSize } from '../common/Section';
import { SubmitError, TxOverview } from '../common/TxOverview';
import { Value } from '../common/Value';
import { ValueChange } from '../common/ValueChange';

export const WithdrawAnvil: React.FC<ReserveComponentProps> = ({ poolId, assetId }) => {
  const theme = useTheme();
  const { connected, walletAddress, poolSubmit, txStatus } = useWallet();

  const poolData = useStore((state) => state.pools.get(poolId));
  const userPoolData = useStore((state) => state.userPoolData.get(poolId));
  const reserve = poolData?.reserves.get(assetId);
  const assetPrice = reserve?.oraclePrice ?? 1;

  const [toWithdrawSubmit, setToWithdrawSubmit] = useState<string | undefined>(undefined);
  const [toWithdraw, setToWithdraw] = useState<string>('');
  const [simResult, setSimResult] = useState<ContractResponse<Positions>>();
  const [validDecimals, setValidDecimals] = useState<boolean>(true);

  useDebouncedState(toWithdrawSubmit, 500, async () => {
    if (validDecimals) {
      let sim = await handleSubmitTransaction(true);
      if (sim) {
        setSimResult(sim);
      }
    }
  });

  let newPositionEstimate =
    poolData && simResult && simResult.result.isOk()
      ? PositionEstimates.build(poolData, simResult.result.unwrap())
      : undefined;

  const decimals = reserve?.config.decimals ?? 7;
  const symbol = reserve?.tokenMetadata?.symbol ?? '';

  if (txStatus === TxStatus.SUCCESS && Number(toWithdraw) != 0) {
    setToWithdraw('0');
  }
  // verify that the user can act
  const { isSubmitDisabled, isMaxDisabled, reason, disabledType } = useMemo(() => {
    const errorProps: SubmitError = {
      isSubmitDisabled: false,
      isMaxDisabled: false,
      reason: undefined,
      disabledType: undefined,
    };
    if (!toWithdraw) {
      errorProps.isSubmitDisabled = true;
      errorProps.isMaxDisabled = false;
      errorProps.reason = 'Please enter an amount to withdraw.';
      errorProps.disabledType = 'info';
    } else if (toWithdraw.split('.')[1]?.length > decimals) {
      setValidDecimals(false);
      errorProps.isSubmitDisabled = true;
      errorProps.isMaxDisabled = false;
      errorProps.reason = `You cannot supply more than ${decimals} decimal places.`;
      errorProps.disabledType = 'warning';
    } else if (simResult?.result.isErr()) {
      errorProps.isSubmitDisabled = true;
      errorProps.isMaxDisabled = false;
      errorProps.reason = ContractErrorType[simResult.result.unwrapErr().type];
      errorProps.disabledType = 'warning';
    }

    return errorProps;
  }, [toWithdraw, simResult]);
  // verify that the user can act

  const handleWithdrawAmountChange = (withdrawInput: string) => {
    if (reserve && userPoolData?.positionEstimates.collateral.get(assetId)) {
      let curSupplied = userPoolData.positionEstimates.collateral.get(assetId) ?? 0;
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
    }
  };

  const handleWithdrawMax = () => {
    if (reserve && userPoolData) {
      let curSupplied = userPoolData.positionEstimates.collateral.get(assetId) ?? 0;
      if (userPoolData.positionEstimates.totalEffectiveLiabilities == 0) {
        handleWithdrawAmountChange((curSupplied * 1.05).toFixed(decimals));
      } else {
        let to_bounded_hf =
          (userPoolData.positionEstimates.totalEffectiveCollateral -
            userPoolData.positionEstimates.totalEffectiveLiabilities * 1.02) /
          1.02;
        let to_wd = to_bounded_hf / (assetPrice * reserve.getCollateralFactor());
        let withdrawAmount = Math.min(to_wd, curSupplied) + 1 / 10 ** decimals;
        handleWithdrawAmountChange(Math.max(withdrawAmount, 0).toFixed(decimals));
      }
    }
  };

  const handleSubmitTransaction = async (sim: boolean) => {
    if (toWithdrawSubmit && connected && reserve) {
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
      return await poolSubmit(poolId, submitArgs, sim);
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
              marginBottom: '12px',
            }}
          >
            <InputBar
              symbol={reserve?.tokenMetadata?.symbol ?? ''}
              value={toWithdraw}
              onValueChange={handleWithdrawAmountChange}
              onSetMax={handleWithdrawMax}
              palette={theme.palette.lend}
              sx={{ width: '100%' }}
              isMaxDisabled={isMaxDisabled}
            />
            <OpaqueButton
              onClick={() => handleSubmitTransaction(false)}
              palette={theme.palette.lend}
              sx={{ minWidth: '108px', marginLeft: '12px', padding: '6px' }}
              disabled={isSubmitDisabled}
            >
              Withdraw
            </OpaqueButton>
          </Box>
          <Box sx={{ marginLeft: '12px' }}>
            <Typography variant="h5" sx={{ color: theme.palette.text.secondary }}>
              {`$${toBalance(Number(toWithdraw ?? 0) * assetPrice, decimals)}`}
            </Typography>
          </Box>
        </Box>
        <TxOverview isDisabled={isSubmitDisabled} disabledType={disabledType} reason={reason}>
          <Value title="Amount to withdraw" value={`${toWithdraw ?? '0'} ${symbol}`} />
          <ValueChange
            title="Your total supplied"
            curValue={`${toBalance(
              userPoolData?.positionEstimates.collateral.get(assetId) ?? 0,
              decimals
            )} ${symbol}`}
            newValue={`${toBalance(
              newPositionEstimate?.collateral.get(assetId) ?? 0,
              decimals
            )} ${symbol}`}
          />
          <ValueChange
            title="Borrow capacity"
            curValue={`$${toBalance(userPoolData?.positionEstimates.borrowCap)}`}
            newValue={`$${toBalance(newPositionEstimate?.borrowCap)}`}
          />
          <ValueChange
            title="Borrow limit"
            curValue={toPercentage(
              Number.isFinite(userPoolData?.positionEstimates.borrowLimit)
                ? userPoolData?.positionEstimates.borrowLimit
                : 0
            )}
            newValue={toPercentage(
              Number.isFinite(newPositionEstimate?.borrowLimit)
                ? newPositionEstimate?.borrowLimit
                : 0
            )}
          />
        </TxOverview>
      </Section>
    </Row>
  );
};
