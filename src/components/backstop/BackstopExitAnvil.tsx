import { Box, Typography, useTheme } from '@mui/material';
import { SorobanRpc } from '@stellar/stellar-sdk';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { ViewType, useSettings } from '../../contexts';
import { TxStatus, TxType, useWallet } from '../../contexts/wallet';
import { useBackstop, useHorizonAccount, useTokenBalance } from '../../hooks/api';
import { RPC_DEBOUNCE_DELAY, useDebouncedState } from '../../hooks/debounce';
import { estExitPool } from '../../utils/comet';
import { toBalance } from '../../utils/formatter';
import { requiresTrustline } from '../../utils/horizon';
import { scaleInputToBigInt } from '../../utils/scval';
import { BLND_ASSET, USDC_ASSET } from '../../utils/token_display';
import { SubmitError, getErrorFromSim } from '../../utils/txSim';
import { AnvilAlert } from '../common/AnvilAlert';
import { InputBar } from '../common/InputBar';
import { InputButton } from '../common/InputButton';
import { OpaqueButton } from '../common/OpaqueButton';
import { Row } from '../common/Row';
import { Section, SectionSize } from '../common/Section';
import { Skeleton } from '../common/Skeleton';
import { TxOverview } from '../common/TxOverview';
import { Value } from '../common/Value';
import { ValueChange } from '../common/ValueChange';

export const BackstopExitAnvil = () => {
  const theme = useTheme();
  const { viewType, network } = useSettings();
  const { walletAddress, txStatus, cometExit, txType, isLoading, createTrustlines } = useWallet();

  const BLND_ID = BLND_ASSET.contractId(network.passphrase);
  const USDC_ID = USDC_ASSET.contractId(network.passphrase);

  const { data: backstop } = useBackstop();
  const { data: horizonAccount } = useHorizonAccount();
  const { data: blndBalanceRes } = useTokenBalance(BLND_ID, BLND_ASSET, horizonAccount);
  const { data: usdcBalanceRes } = useTokenBalance(USDC_ID, USDC_ASSET, horizonAccount);
  const { data: lpBalanceRes } = useTokenBalance(
    backstop?.backstopToken.id,
    undefined,
    horizonAccount
  );

  const [input, setInput] = useState<{ amount: string; slippage: string }>({
    amount: '',
    slippage: '1',
  });

  const [minBLNDOut, setMinBLNDOut] = useState<number>(0);
  const [minUSDCOut, setMinUSDCOut] = useState<number>(0);

  const [loadingEstimate, setLoadingEstimate] = useState<boolean>(false);
  const [simResponse, setSimResponse] = useState<SorobanRpc.Api.SimulateTransactionResponse>();
  const loading = isLoading || loadingEstimate;
  const decimals = 7;

  const clearInputResultState = () => {
    setMinBLNDOut(0);
    setMinUSDCOut(0);
    setSimResponse(undefined);
  };

  const handleSetInputAmount = (value: string) => {
    setInput({ amount: value, slippage: input.slippage });
  };

  const handleSetInputMaxSlippage = (value: string) => {
    setInput({ amount: input.amount, slippage: value });
  };

  const blndBalance = blndBalanceRes ?? BigInt(0);
  const usdcBalance = usdcBalanceRes ?? BigInt(0);
  const lpBalance = lpBalanceRes ?? BigInt(0);

  /** run function on each state change */
  useDebouncedState(input, RPC_DEBOUNCE_DELAY, txType, handleInputChange);

  const AddBLNDTrustlineButton = (
    <OpaqueButton
      onClick={async () => createTrustlines([BLND_ASSET])}
      palette={theme.palette.warning}
      sx={{ padding: '6px 24px', margin: '12px auto' }}
    >
      Add {BLND_ASSET.code} Trustline
    </OpaqueButton>
  );
  const AddUSDCTrustlineButton = (
    <OpaqueButton
      onClick={async () => createTrustlines([USDC_ASSET])}
      palette={theme.palette.warning}
      sx={{ padding: '6px 24px', margin: '12px auto' }}
    >
      Add {USDC_ASSET.code} Trustline
    </OpaqueButton>
  );

  // verify that the user can act
  const { isSubmitDisabled, isMaxDisabled, reason, disabledType, isError, extraContent } =
    useMemo(() => {
      const hasBLNDTrustline = !requiresTrustline(horizonAccount, BLND_ASSET);
      const hasUSDCTrustline = !requiresTrustline(horizonAccount, USDC_ASSET);
      if (lpBalance === BigInt(0)) {
        return {
          isSubmitDisabled: true,
          isError: true,
          isMaxDisabled: true,
          reason: 'You do not have any LP tokens for the BLND-USDC pool',
          disabledType: 'warning',
        } as SubmitError;
      } else if (!hasBLNDTrustline) {
        return {
          isSubmitDisabled: true,
          isError: true,
          isMaxDisabled: true,
          reason: 'You need a BLND trustline to exit the LP.',
          disabledType: 'warning',
          extraContent: AddBLNDTrustlineButton,
        } as SubmitError;
      } else if (!hasUSDCTrustline) {
        return {
          isSubmitDisabled: true,
          isError: true,
          isMaxDisabled: true,
          reason: 'You need a USDC trustline to exit the LP.',
          disabledType: 'warning',
          extraContent: AddUSDCTrustlineButton,
        } as SubmitError;
      } else if (Number(input.slippage) < 0.1) {
        return {
          isSubmitDisabled: true,
          isError: true,
          isMaxDisabled: false,
          reason: 'Slippage must be at least 0.1%.',
          disabledType: 'warning',
        } as SubmitError;
      } else if (Number(input.slippage) > 10.0) {
        return {
          isSubmitDisabled: true,
          isError: true,
          isMaxDisabled: false,
          reason: 'Slippage can be at most 10%',
          disabledType: 'warning',
        } as SubmitError;
      } else {
        return getErrorFromSim(input.amount, decimals, loading, simResponse, undefined);
      }
    }, [input, loadingEstimate, simResponse, lpBalance]);

  if (backstop === undefined) {
    return <Skeleton />;
  }

  if (txStatus === TxStatus.SUCCESS && txType === TxType.CONTRACT && input.amount !== '') {
    handleSetInputAmount('');
    clearInputResultState();
  }

  const handleMaxClick = () => {
    if (lpBalance > BigInt(0)) {
      setLoadingEstimate(true);
      handleSetInputAmount((Number(lpBalance) / 1e7).toFixed(7));
    }
  };

  async function handleInputChange({ amount, slippage }: { amount: string; slippage: string }) {
    setLoadingEstimate(true);
    clearInputResultState();
    const validDecimals = (amount.split('.')[1]?.length ?? 0) <= decimals;
    if (validDecimals && backstop?.config.backstopTkn && walletAddress) {
      const inputAsBigInt = scaleInputToBigInt(amount, decimals);
      const slippageAsNum = Number(slippage) / 100;
      let { blnd, usdc } = estExitPool(backstop.backstopToken, inputAsBigInt, slippageAsNum);
      setMinBLNDOut(blnd);
      setMinUSDCOut(usdc);
      cometExit(
        backstop.config.backstopTkn,
        {
          user: walletAddress,
          poolAmount: inputAsBigInt,
          blndLimitAmount: BigInt(Math.floor(blnd * 10 ** decimals)),
          usdcLimitAmount: BigInt(Math.floor(usdc * 10 ** decimals)),
        },
        true
      )
        .then((sim: SorobanRpc.Api.SimulateTransactionResponse | undefined) => {
          setSimResponse(sim);
        })
        .catch((e) => {
          console.log('Failed to simulate exit transaction.');
          console.error(e);
          setMinBLNDOut(0);
          setMinUSDCOut(0);
        });
    }
    setLoadingEstimate(false);
  }

  async function handleSubmitExit() {
    const validDecimals = (input.amount.split('.')[1]?.length ?? 0) <= decimals;
    if (validDecimals && backstop?.config.backstopTkn) {
      await cometExit(
        backstop?.config.backstopTkn,
        {
          user: walletAddress,
          poolAmount: scaleInputToBigInt(input.amount, decimals),
          blndLimitAmount: BigInt(Math.floor(minBLNDOut * 10 ** decimals)),
          usdcLimitAmount: BigInt(Math.floor(minUSDCOut * 10 ** decimals)),
        },
        false
      );
    }
  }

  const inputInUSDC = Number(input.amount) * backstop.backstopToken.lpTokenPrice;

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
            {`Amount to withdraw`}
          </Typography>
          <Box
            sx={{
              width: '100%',
              height: 'max-content',
              display: 'flex',
              gap: '12px',
              flexDirection: viewType === ViewType.MOBILE ? 'column' : 'row',
              marginBottom: '12px',
              alignItems: 'end',
            }}
          >
            <Box
              sx={{
                width: '100%',
                height: 'max-content',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <InputBar
                symbol={'BLND-USDC LP'}
                value={input.amount}
                onValueChange={(v) => {
                  handleSetInputAmount(v);
                  setLoadingEstimate(true);
                }}
                palette={theme.palette.backstop}
                sx={{ width: '100%' }}
              >
                <InputButton
                  palette={theme.palette.backstop}
                  onClick={handleMaxClick}
                  disabled={isMaxDisabled}
                  text="MAX"
                />
              </InputBar>
            </Box>
          </Box>
          <Typography variant="body2" sx={{ marginLeft: '12px', marginBottom: '12px' }}>
            {`Max Slippage`}
          </Typography>
          <Box
            sx={{
              width: '100%',
              height: 'max-content',
              display: 'flex',
              gap: '12px',
              flexDirection: viewType === ViewType.MOBILE ? 'column' : 'row',
              marginBottom: '12px',
              alignItems: 'end',
            }}
          >
            <Box
              sx={{
                width: '100%',
                height: 'max-content',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <InputBar
                symbol={'%'}
                value={input.slippage}
                onValueChange={(v) => {
                  handleSetInputMaxSlippage(v);
                  setLoadingEstimate(true);
                }}
                palette={theme.palette.backstop}
                sx={{ width: '100%' }}
              >
                <InputButton
                  palette={theme.palette.backstop}
                  onClick={() => handleSetInputMaxSlippage('0.5')}
                  disabled={false}
                  text="0.5%"
                />
                <InputButton
                  palette={theme.palette.backstop}
                  onClick={() => handleSetInputMaxSlippage('1')}
                  disabled={false}
                  text="1%"
                />
                <InputButton
                  palette={theme.palette.backstop}
                  onClick={() => handleSetInputMaxSlippage('2')}
                  disabled={false}
                  text="2%"
                />
              </InputBar>
            </Box>
          </Box>
          <Box
            sx={{
              marginLeft: '12px',
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <Typography variant="h5" sx={{ color: theme.palette.text.secondary }}>
              {`$${toBalance(inputInUSDC)}`}
            </Typography>
            <OpaqueButton
              onClick={handleSubmitExit}
              palette={theme.palette.backstop}
              sx={{
                minWidth: '108px',
                padding: '6px',
                height: 'max-content',
              }}
              disabled={isSubmitDisabled}
            >
              Exit
            </OpaqueButton>
          </Box>
        </Box>
        {!isError && (
          <TxOverview>
            <>
              {' '}
              <Value title="Amount to withdraw" value={`${input.amount ?? '0'} BLND-USDC LP`} />
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
                title="Your LP tokens"
                curValue={`${toBalance(lpBalance, 7)} BLND-USDC LP`}
                newValue={`${toBalance(
                  lpBalance - BigInt(Math.floor(Number(input.amount) * 1e7)),
                  7
                )} BLND-USDC LP`}
              />
              <Value title="Min BLND to withdraw" value={`${toBalance(minBLNDOut)} BLND`} />
              <ValueChange
                title="Your BLND tokens"
                curValue={`${toBalance(blndBalance, 7)} BLND`}
                newValue={`${toBalance(
                  blndBalance + BigInt(Math.floor(minBLNDOut * 1e7)),
                  7
                )} BLND`}
              />
              <Value title="Min USDC to withdraw" value={`${toBalance(minUSDCOut)} USDC`} />
              <ValueChange
                title="Your USDC tokens"
                curValue={`${toBalance(usdcBalance, 7)} USDC`}
                newValue={`${toBalance(
                  usdcBalance + BigInt(Math.floor(minUSDCOut * 1e7)),
                  7
                )} USDC`}
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
