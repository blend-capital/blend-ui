import {
  parseResult,
  Pool,
  PoolContract,
  Positions,
  PositionsEstimate,
  RequestType,
  SubmitArgs,
} from '@blend-capital/blend-sdk';
import { Box, Typography, useTheme } from '@mui/material';
import { Asset, SorobanRpc } from '@stellar/stellar-sdk';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { useWallet } from '../../contexts/wallet';
import { useHorizonAccount, usePoolOracle } from '../../hooks/api';
import { RPC_DEBOUNCE_DELAY, useDebouncedState } from '../../hooks/debounce';
import { AuctionDisplay, AuctionType } from '../../utils/auction';
import { toBalance, toCompactAddress } from '../../utils/formatter';
import { requiresTrustline } from '../../utils/horizon';
import { getErrorFromSim, SubmitError } from '../../utils/txSim';
import { AnvilAlert } from '../common/AnvilAlert';
import { DividerSection } from '../common/DividerSection';
import { OpaqueButton } from '../common/OpaqueButton';
import { PoolComponentProps } from '../common/PoolComponentProps';
import { Row } from '../common/Row';
import { Section, SectionSize } from '../common/Section';
import { StackedTextBox } from '../common/StackedTextBox';
import { TxOverview } from '../common/TxOverview';
import { Value } from '../common/Value';
import { BidList } from './BidList';
import { LotList } from './LotList';

export interface AuctionCardProps extends PoolComponentProps {
  pool: Pool;
  auctionDisplay: AuctionDisplay;
  currLedger: number;
  index: number;
  onLoaded: (index: number) => void;
}

export const AuctionCard: React.FC<AuctionCardProps> = ({
  pool,
  auctionDisplay,
  sx,
  currLedger,
}) => {
  const theme = useTheme();
  const { walletAddress, connected, poolSubmit, createTrustlines, isLoading, txType } = useWallet();
  const { data: poolOracle } = usePoolOracle(pool);
  const { data: horizonAccount } = useHorizonAccount();
  const [simResponse, setSimResponse] = useState<SorobanRpc.Api.SimulateTransactionResponse>();
  const [parsedSimResult, setParsedSimResult] = useState<Positions>();
  const [loadingEstimate, setLoadingEstimate] = useState<boolean>(false);
  const loading = isLoading || loadingEstimate;
  let trustlinesToAdd: Asset[] = [];

  const date = new Date(auctionDisplay.timestamp);
  const handleSubmitTransaction = async (sim: boolean) => {
    let requestType: RequestType;
    switch (auctionDisplay.auctionType) {
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

    if (connected) {
      let submitArgs: SubmitArgs = {
        from: walletAddress,
        to: walletAddress,
        spender: walletAddress,
        requests: [
          {
            amount: BigInt(100),
            address: auctionDisplay.user,
            request_type: requestType,
          },
        ],
      };
      return await poolSubmit(pool.id, submitArgs, sim);
    }
  };

  useDebouncedState(currLedger, RPC_DEBOUNCE_DELAY, txType, async () => {
    setSimResponse(undefined);
    setParsedSimResult(undefined);
    let response = await handleSubmitTransaction(true);
    if (response) {
      setSimResponse(response);
      if (SorobanRpc.Api.isSimulationSuccess(response)) {
        setParsedSimResult(parseResult(response, PoolContract.parsers.submit));
      }
    }
    setLoadingEstimate(false);
  });

  async function handleAddAssetTrustline() {
    if (connected && trustlinesToAdd.length > 0) {
      await createTrustlines(trustlinesToAdd);
    }
  }

  const AddTrustlineButton = (
    <OpaqueButton
      onClick={handleAddAssetTrustline}
      palette={theme.palette.warning}
      sx={{ margin: '6px', padding: '6px' }}
    >
      Add Trustlines
    </OpaqueButton>
  );
  const { reason, disabledType, extraContent, isError } = useMemo(() => {
    let hasTokenTrustline: boolean = true;
    for (const asset of Array.from(auctionDisplay.auctionData.lot.keys())) {
      const reserve = pool.reserves.get(asset);
      if (requiresTrustline(horizonAccount, reserve?.tokenMetadata?.asset)) {
        hasTokenTrustline = false;
        if (reserve?.tokenMetadata?.asset) {
          trustlinesToAdd.push(reserve.tokenMetadata.asset);
        }
        break;
      }
    }
    if (!hasTokenTrustline) {
      let submitError: SubmitError = {
        isSubmitDisabled: true,
        isError: true,
        isMaxDisabled: true,
        reason: 'Missing trustline for auction asset.',
        disabledType: 'warning',
        extraContent: AddTrustlineButton,
      };
      return submitError;
    } else {
      return getErrorFromSim('1', 0, loading, simResponse, undefined);
    }
  }, [auctionDisplay, simResponse, horizonAccount]);
  const newPositionEstimate =
    pool && poolOracle && parsedSimResult
      ? PositionsEstimate.build(pool, poolOracle, parsedSimResult)
      : undefined;

  return (
    <Section width={SectionSize.FULL} sx={{ flexDirection: 'column', marginBottom: '12px', ...sx }}>
      <Box
        sx={{
          width: '100%',
        }}
      >
        <Row>
          <Typography variant="h3" sx={{ margin: '12px' }}>
            Auction {toCompactAddress(auctionDisplay.user)}
          </Typography>
          <Box
            sx={{
              margin: '6px',
              padding: '6px',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Box
              sx={{
                padding: '4px',
                color: theme.palette.positive.main,
                background: theme.palette.positive.opaque,
                borderRadius: '5px',
                lineHeight: '100%',
              }}
            >
              *{AuctionType[auctionDisplay.auctionType]}*
            </Box>
          </Box>
        </Row>
        <Row>
          <StackedTextBox
            name="Started"
            text={`${date.toLocaleDateString()} ${date.toLocaleTimeString()} - ${
              auctionDisplay.auctionData.block
            } `}
            sx={{ width: '50%' }}
          ></StackedTextBox>
          {auctionDisplay.filled ? (
            <StackedTextBox
              name="Block Filled"
              text={`${auctionDisplay.blockFilled}`}
              sx={{ width: '50%' }}
            ></StackedTextBox>
          ) : (
            <StackedTextBox
              name="Current Block"
              text={`${currLedger}`}
              sx={{ width: '50%' }}
            ></StackedTextBox>
          )}
        </Row>
      </Box>
      <LotList
        pool={pool}
        lot={auctionDisplay.auctionData.lot}
        type={
          auctionDisplay.auctionType === AuctionType.Interest ||
          auctionDisplay.auctionType === AuctionType.BadDebt
            ? 'Underlying'
            : 'Collateral'
        }
      />
      <DividerSection />
      <BidList
        pool={pool}
        bid={auctionDisplay.auctionData.bid}
        type={auctionDisplay.auctionType === AuctionType.Interest ? 'Underlying' : 'Liability'}
      />
      {!auctionDisplay.filled ? (
        <>
          <OpaqueButton
            palette={theme.palette.primary}
            sx={{ margin: '6px', padding: '6px' }}
            onClick={() => handleSubmitTransaction(false)}
          >
            Bid
          </OpaqueButton>
          <DividerSection />
          {!isError && (
            <TxOverview>
              <>
                <Value
                  title="Oracle estimated profit"
                  value={`${toBalance(auctionDisplay.lotValue - auctionDisplay.bidValue)}`}
                />
                <Value title="Block" value={currLedger?.toString() ?? ''} />
                <Value
                  title={
                    <>
                      <Image src="/icons/dashboard/gascan.svg" alt="blend" width={20} height={20} />{' '}
                      Gas
                    </>
                  }
                  value={`${toBalance(BigInt((simResponse as any)?.minResourceFee ?? 0), 7)} XLM`}
                />
                <Value
                  title="Borrow capacity"
                  value={`${toBalance(newPositionEstimate?.borrowCap)} USD`}
                />
                <Value
                  title="Borrow limit"
                  value={`${toBalance(newPositionEstimate?.borrowLimit)} USD`}
                />
              </>
            </TxOverview>
          )}
          {isError && (
            <AnvilAlert severity={disabledType} message={reason} extraContent={extraContent} />
          )}
        </>
      ) : (
        <Box
          sx={{
            margin: '6px',
            padding: '6px',
            color: theme.palette.positive.main,
            background: theme.palette.positive.opaque,
            borderRadius: '5px',
          }}
        >
          <Typography variant="body1" align="center">
            Filled
          </Typography>
        </Box>
      )}
    </Section>
  );
};
