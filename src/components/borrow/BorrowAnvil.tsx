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
import { TxStatus, TxType, useWallet } from '../../contexts/wallet';
import { RPC_DEBOUNCE_DELAY, useDebouncedState } from '../../hooks/debounce';
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

export const BorrowAnvil: React.FC<ReserveComponentProps> = ({ poolId, assetId }) => {
  const theme = useTheme();
  const { connected, walletAddress, poolSubmit, txStatus, txType } = useWallet();

  const poolData = useStore((state) => state.pools.get(poolId));
  const userPoolData = useStore((state) => state.userPoolData.get(poolId));

  const [toBorrow, setToBorrow] = useState<string>('');
  const [simResponse, setSimResponse] = useState<ContractResponse<Positions>>();
  const [validDecimals, setValidDecimals] = useState<boolean>(true);

  if (txStatus === TxStatus.SUCCESS && txType != TxType.RESTORE && Number(toBorrow) != 0) {
    setToBorrow('');
  }

  useDebouncedState(toBorrow, RPC_DEBOUNCE_DELAY, txType, async () => {
    if (validDecimals) {
      let response = await handleSubmitTransaction(true);
      if (response) {
        setSimResponse(response);
      }
    }
  });

  let newPositionEstimate =
    poolData && simResponse && simResponse.result.isOk()
      ? PositionEstimates.build(poolData, simResponse.result.unwrap())
      : undefined;

  const reserve = poolData?.reserves.get(assetId);
  const assetToBase = reserve?.oraclePrice ?? 1;
  const decimals = reserve?.config.decimals ?? 7;
  const symbol = reserve?.tokenMetadata?.symbol ?? '';

  const assetToEffectiveLiability = reserve
    ? assetToBase * reserve.getLiabilityFactor()
    : undefined;
  const curBorrowCap =
    userPoolData && assetToEffectiveLiability
      ? userPoolData.positionEstimates.borrowCap / assetToEffectiveLiability
      : undefined;
  const nextBorrowCap =
    newPositionEstimate && assetToEffectiveLiability
      ? newPositionEstimate.borrowCap / assetToEffectiveLiability
      : undefined;
  const curBorrowLimit =
    userPoolData && Number.isFinite(userPoolData?.positionEstimates.borrowLimit)
      ? userPoolData?.positionEstimates?.borrowLimit
      : 0;
  const nextBorrowLimit =
    newPositionEstimate && Number.isFinite(newPositionEstimate?.borrowLimit)
      ? newPositionEstimate?.borrowLimit
      : 0;

  // verify that the user can act
  const { isSubmitDisabled, isMaxDisabled, reason, disabledType } = useMemo(() => {
    const errorProps: SubmitError = {
      isSubmitDisabled: false,
      isMaxDisabled: false,
      reason: undefined,
      disabledType: undefined,
    };
    if (!toBorrow) {
      errorProps.isSubmitDisabled = true;
      errorProps.isMaxDisabled = false;
      errorProps.reason = 'Please enter an amount to borrow.';
      errorProps.disabledType = 'info';
    } else if (toBorrow.split('.')[1]?.length > decimals) {
      setValidDecimals(false);
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
  }, [toBorrow, simResponse, userPoolData?.positionEstimates]);

  const handleBorrowMax = () => {
    if (reserve && userPoolData) {
      let to_bounded_hf =
        (userPoolData.positionEstimates.totalEffectiveCollateral -
          userPoolData.positionEstimates.totalEffectiveLiabilities * 1.02) /
        1.02;
      let to_borrow = Math.min(
        to_bounded_hf / (assetToBase * reserve.getLiabilityFactor()),
        reserve.estimates.supplied * (reserve.config.max_util / 1e7 - 0.01) -
          reserve.estimates.borrowed
      );
      setToBorrow(Math.max(to_borrow, 0).toFixed(7));
    }
  };

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
              onValueChange={setToBorrow}
              onSetMax={handleBorrowMax}
              palette={theme.palette.borrow}
              sx={{ width: '100%' }}
              isMaxDisabled={isMaxDisabled}
            />
            <OpaqueButton
              onClick={() => handleSubmitTransaction(false)}
              palette={theme.palette.borrow}
              sx={{ minWidth: '108px', marginLeft: '12px', padding: '6px' }}
              disabled={isSubmitDisabled}
            >
              Borrow
            </OpaqueButton>
          </Box>
          <Box sx={{ marginLeft: '12px' }}>
            <Typography variant="h5" sx={{ color: theme.palette.text.secondary }}>
              {`$${toBalance(Number(toBorrow ?? 0) * assetToBase, decimals)}`}
            </Typography>
          </Box>
        </Box>
        <TxOverview
          simResponse={simResponse}
          isDisabled={isSubmitDisabled}
          disabledType={disabledType}
          reason={reason}
        >
          <Value title="Amount to borrow" value={`${toBorrow ?? '0'} ${symbol}`} />
          <ValueChange
            title="Your total borrowed"
            curValue={`${toBalance(
              userPoolData?.positionEstimates?.liabilities?.get(assetId) ?? 0,
              decimals
            )} ${symbol}`}
            newValue={`${toBalance(
              newPositionEstimate?.liabilities.get(assetId) ?? 0,
              decimals
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
        </TxOverview>
      </Section>
    </Row>
  );
};
