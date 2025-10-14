import {
  Auction,
  AuctionType,
  parseResult,
  Pool,
  PoolContractV1,
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
import { useBackstop, usePoolOracle, usePoolUser } from '../../hooks/api';
import { RPC_DEBOUNCE_DELAY, useDebouncedState } from '../../hooks/debounce';
import { estAuction } from '../../utils/auction';
import { toBalance, toPercentage } from '../../utils/formatter';
import { scaleInputToBigInt } from '../../utils/scval';
import { getErrorFromSim } from '../../utils/txSim';
import { AnvilAlert } from '../common/AnvilAlert';
import { DividerSection } from '../common/DividerSection';
import { InputBar } from '../common/InputBar';
import { InputButton } from '../common/InputButton';
import { OpaqueButton } from '../common/OpaqueButton';
import { PoolComponentProps } from '../common/PoolComponentProps';
import { Section, SectionSize } from '../common/Section';
import { TxOverview } from '../common/TxOverview';
import { Value } from '../common/Value';
import { ValueChange } from '../common/ValueChange';
import { BidBalanceChange } from './BidBalanceChange';
import { BidList } from './BidList';
import { LotBalanceChange } from './LotBalanceChange';
import { LotList } from './LotList';

export interface OngoingAuctionCardExpandedProps extends PoolComponentProps {
  pool: Pool;
  auction: Auction;
  currLedger: number;
  index: number;
  expanded: boolean;
}

export const OngoingAuctionCardCollapse: React.FC<OngoingAuctionCardExpandedProps> = ({
  pool,
  auction,
  sx,
  currLedger,
  expanded,
}) => {
  const theme = useTheme();
  const { viewType } = useSettings();
  const { walletAddress, connected, poolSubmit, isLoading, txType, txStatus } = useWallet();
  const { data: poolOracle } = usePoolOracle(pool, expanded);
  const { data: backstop } = useBackstop(pool.version, expanded);
  const { data: poolUser } = usePoolUser(pool, expanded);

  const [simResponse, setSimResponse] = useState<rpc.Api.SimulateTransactionResponse>();
  const [parsedSimResult, setParsedSimResult] = useState<Positions>();
  const [loadingEstimate, setLoadingEstimate] = useState<boolean>(false);
  const [fillPercent, setFillPercent] = useState<string>('');
  const loading = isLoading || loadingEstimate;

  if (txStatus === TxStatus.SUCCESS && txType === TxType.CONTRACT && Number(fillPercent) != 0) {
    setFillPercent('');
  }

  const positionEstimate =
    poolOracle && poolUser && PositionsEstimate.build(pool, poolOracle, poolUser.positions);

  const { auctionEstimate, auctionToFill, auctionToFillEstimate, newPositionEstimate } =
    useMemo(() => {
      const scaledAuction = auction.scale(currLedger + 1)[0];
      const auctionToFill = auction.scale(currLedger + 1, Number(fillPercent))[0];
      const auctionEstimate = estAuction(
        scaledAuction.data,
        scaledAuction.type,
        pool,
        poolOracle,
        backstop?.backstopToken.lpTokenPrice
      );
      const auctionToFillEstimate = estAuction(
        auctionToFill.data,
        auctionToFill.type,
        pool,
        poolOracle,
        backstop?.backstopToken.lpTokenPrice
      );
      const newPositionEstimate =
        poolOracle && parsedSimResult && PositionsEstimate.build(pool, poolOracle, parsedSimResult);

      return {
        auctionEstimate,
        auctionToFill,
        auctionToFillEstimate,
        newPositionEstimate,
      };
    }, [auction, simResponse, currLedger, poolOracle, backstop, pool, parsedSimResult]);

  const { isSubmitDisabled, reason, disabledType, extraContent, isError } = useMemo(() => {
    return getErrorFromSim(fillPercent, 0, loading, simResponse, undefined);
  }, [isLoading, loadingEstimate, simResponse, theme.palette.warning]);

  const handleSubmitTransaction = async (sim: boolean) => {
    if (!connected || !expanded) return;

    // Default to interest auction for compiler
    let requestType: RequestType = RequestType.FillInterestAuction;
    switch (auction.type) {
      case AuctionType.Interest:
        requestType = RequestType.FillInterestAuction;
        break;
      case AuctionType.BadDebt:
        requestType = RequestType.FillBadDebtAuction;
        break;
      case AuctionType.Liquidation:
        requestType = RequestType.FillUserLiquidationAuction;
        break;
    }

    const submitArgs: SubmitArgs = {
      from: walletAddress,
      to: walletAddress,
      spender: walletAddress,
      requests: [
        {
          amount: scaleInputToBigInt(fillPercent, 0),
          address: auction.user,
          request_type: requestType,
        },
      ],
    };

    let response = await poolSubmit(
      { id: pool.id, version: pool.version, ...pool.metadata },
      submitArgs,
      sim
    );
    if (response && sim) {
      setSimResponse(response);
      if (rpc.Api.isSimulationSuccess(response)) {
        setParsedSimResult(parseResult(response, PoolContractV1.parsers.submit));
      } else {
        console.error('Simulation failed', response);
      }
    }
    setLoadingEstimate(false);
    return response;
  };

  useDebouncedState(fillPercent, RPC_DEBOUNCE_DELAY, txType, async () => {
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

  return (
    <Section width={SectionSize.FULL} sx={{ flexDirection: 'column', marginBottom: '12px', ...sx }}>
      <LotList
        pool={pool}
        lot={auctionEstimate?.lot ?? new Map()}
        lotValue={auctionEstimate?.lotValue ?? new Map()}
        type={
          auction.type === AuctionType.Interest || auction.type === AuctionType.BadDebt
            ? 'Underlying'
            : 'Collateral'
        }
      />
      <DividerSection />
      <BidList
        pool={pool}
        bid={auctionEstimate?.bid ?? new Map()}
        bidValue={auctionEstimate?.bidValue ?? new Map()}
        type={auction.type === AuctionType.Interest ? 'Underlying' : 'Liability'}
      />
      <Box
        sx={{
          background: theme.palette.positive.opaque,
          width: '100%',
          borderRadius: '5px',
          padding: '12px',
          marginBottom: '4px',
          marginTop: '12px',
          boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)',
        }}
      >
        <Typography variant="body2" sx={{ marginLeft: '12px', marginBottom: '12px' }}>
          Percent to fill
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
            symbol={'%'}
            value={fillPercent}
            onValueChange={(v) => {
              setFillPercent(v);
              setLoadingEstimate(true);
            }}
            palette={theme.palette.positive}
            sx={{ width: '100%' }}
          >
            <InputButton
              palette={theme.palette.positive}
              onClick={() => setFillPercent('100')}
              disabled={false}
              text="MAX"
            />
          </InputBar>
          {viewType !== ViewType.MOBILE && (
            <OpaqueButton
              onClick={() => handleSubmitTransaction(true)}
              palette={theme.palette.positive}
              sx={{ minWidth: '108px', marginLeft: '12px', padding: '6px' }}
              disabled={
                isSubmitDisabled || (simResponse && simResponse.latestLedger === currLedger)
              }
            >
              Update
            </OpaqueButton>
          )}
        </Box>
        <Box sx={{ marginLeft: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Typography variant="h5" sx={{ color: theme.palette.text.secondary }}>
            {`${fillPercent}% Fill`}
          </Typography>
        </Box>
        {viewType === ViewType.MOBILE && (
          <OpaqueButton
            onClick={() => handleSubmitTransaction(true)}
            palette={theme.palette.positive}
            sx={{ minWidth: '108px', width: '100%', padding: '6px', marginTop: '12px' }}
            disabled={isSubmitDisabled || (simResponse && simResponse.latestLedger === currLedger)}
          >
            Update
          </OpaqueButton>
        )}
      </Box>
      <DividerSection />
      {!isError && parsedSimResult && (
        <TxOverview>
          {auctionToFillEstimate && (
            <Value
              title="Oracle estimated profit"
              value={`${toBalance(
                auctionToFillEstimate.totalLotValue - auctionToFillEstimate.totalBidValue,
                3
              )}`}
            />
          )}
          <Value title="Block" value={simResponse?.latestLedger?.toString() ?? ''} />
          <Value
            title={
              <>
                <Image src="/icons/dashboard/gascan.svg" alt="blend" width={20} height={20} /> Gas
              </>
            }
            value={`${toBalance(BigInt((simResponse as any)?.minResourceFee ?? 0), 7)} XLM`}
          />
          {Array.from(auctionToFill.data.lot).map(([asset, amount]) => (
            <LotBalanceChange
              key={asset}
              pool={pool}
              auctionType={auction.type}
              assetId={asset}
              lotAmount={amount}
              newPosition={parsedSimResult}
            />
          ))}
          {Array.from(auctionToFill.data.bid).map(([asset, amount]) => (
            <BidBalanceChange
              key={asset}
              pool={pool}
              auctionType={auction.type}
              assetId={asset}
              bidAmount={amount}
              newPosition={parsedSimResult}
            />
          ))}
          {(auction.type === AuctionType.Liquidation || auction.type === AuctionType.BadDebt) && (
            <>
              <ValueChange
                title="Borrow capacity"
                curValue={`${toBalance(positionEstimate?.borrowCap)} USD`}
                newValue={`${toBalance(newPositionEstimate?.borrowCap)} USD`}
              />

              <ValueChange
                title="Borrow limit"
                curValue={`${toPercentage(positionEstimate?.borrowLimit)}`}
                newValue={`${toPercentage(newPositionEstimate?.borrowLimit)}`}
              />
            </>
          )}
        </TxOverview>
      )}
      {!isError && parsedSimResult && (
        <OpaqueButton
          palette={theme.palette.primary}
          sx={{ margin: '6px', padding: '6px' }}
          onClick={() => handleSubmitTransaction(false)}
        >
          Submit Bid
        </OpaqueButton>
      )}
      {isError && (
        <AnvilAlert severity={disabledType!} message={reason} extraContent={extraContent} />
      )}
    </Section>
  );
};
