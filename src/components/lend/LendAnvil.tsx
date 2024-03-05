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
import { getAssetReserve } from '../../utils/horizon';
import { scaleInputToBigInt } from '../../utils/scval';
import { InputBar } from '../common/InputBar';
import { OpaqueButton } from '../common/OpaqueButton';
import { ReserveComponentProps } from '../common/ReserveComponentProps';
import { Row } from '../common/Row';
import { Section, SectionSize } from '../common/Section';
import { SubmitError, TxOverview } from '../common/TxOverview';
import { Value } from '../common/Value';
import { ValueChange } from '../common/ValueChange';

export const LendAnvil: React.FC<ReserveComponentProps> = ({ poolId, assetId }) => {
  const theme = useTheme();
  const { connected, walletAddress, poolSubmit, txStatus } = useWallet();

  const account = useStore((state) => state.account);
  const poolData = useStore((state) => state.pools.get(poolId));
  const userPoolData = useStore((state) => state.userPoolData.get(poolId));
  const userBalance = useStore((state) => state.balances.get(assetId)) ?? BigInt(0);
  const reserve = poolData?.reserves.get(assetId);
  const assetPrice = reserve?.oraclePrice ?? 1;

  const [toLend, setToLend] = useState<string>('');
  const [simResult, setSimResult] = useState<ContractResponse<Positions>>();
  const decimals = reserve?.config.decimals ?? 7;
  const scalar = 10 ** decimals;
  const symbol = reserve?.tokenMetadata?.symbol ?? '';

  useDebouncedState(toLend, 500, async () => {
    let sim = await handleSubmitTransaction(true);
    if (sim) {
      setSimResult(sim);
    }
  });
  let newPositionEstimate =
    poolData && simResult && simResult.result.isOk()
      ? PositionEstimates.build(poolData, simResult.result.unwrap())
      : undefined;

  // calculate current wallet state
  let stellar_reserve_amount = getAssetReserve(account, reserve?.tokenMetadata?.asset);
  const freeUserBalanceScaled = Number(userBalance) / scalar - stellar_reserve_amount;

  if (txStatus === TxStatus.SUCCESS && Number(toLend) != 0) {
    setToLend('0');
  }
  // verify that the user can act
  const { isSubmitDisabled, isMaxDisabled, reason, disabledType } = useMemo(() => {
    const errorProps: SubmitError = {
      isSubmitDisabled: false,
      isMaxDisabled: false,
      reason: undefined,
      disabledType: undefined,
    };
    if (!toLend) {
      errorProps.isSubmitDisabled = true;
      errorProps.isMaxDisabled = false;
      errorProps.reason = 'Please enter an amount to supply.';
      errorProps.disabledType = 'info';
    } else if (toLend.split('.')[1]?.length > decimals) {
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
  }, [freeUserBalanceScaled, toLend, simResult]);
  const handleLendMax = () => {
    if (userPoolData) {
      if (freeUserBalanceScaled > 0) {
        setToLend(freeUserBalanceScaled.toFixed(decimals));
      }
    }
  };

  const handleSubmitTransaction = async (sim: boolean) => {
    if (toLend && connected && reserve) {
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
            Amount to supply
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
              value={toLend}
              onValueChange={setToLend}
              onSetMax={handleLendMax}
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
              Supply
            </OpaqueButton>
          </Box>
          <Box sx={{ marginLeft: '12px' }}>
            <Typography variant="h5" sx={{ color: theme.palette.text.secondary }}>
              {`$${toBalance(Number(toLend ?? 0) * assetPrice, decimals)}`}
            </Typography>
          </Box>
        </Box>
        <TxOverview isDisabled={isSubmitDisabled} disabledType={disabledType} reason={reason}>
          <Value title="Amount to supply" value={`${toLend ?? '0'} ${symbol}`} />
          <ValueChange
            title="Your total supplied"
            curValue={`${toBalance(
              userPoolData?.positionEstimates?.collateral?.get(assetId) ?? 0,
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
