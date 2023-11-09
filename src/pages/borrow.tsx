import { Box, Typography, useTheme } from '@mui/material';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { BorrowAnvil } from '../components/borrow/BorrowAnvil';
import { GoBackHeader } from '../components/common/GoBackHeader';
import { OverlayModal } from '../components/common/OverlayModal';
import { ReserveDropdown } from '../components/common/ReserveDropdown';
import { Row } from '../components/common/Row';
import { Section, SectionSize } from '../components/common/Section';
import { StackedText } from '../components/common/StackedText';
import { WalletWarning } from '../components/common/WalletWarning';
import { useWallet } from '../contexts/wallet';
import { useStore } from '../store/store';
import { toBalance, toPercentage } from '../utils/formatter';

const Borrow: NextPage = () => {
  const theme = useTheme();
  const { connected, walletAddress } = useWallet();

  const router = useRouter();
  const { poolId, assetId } = router.query;
  const safePoolId = typeof poolId == 'string' && /^[0-9A-Z]{56}$/.test(poolId) ? poolId : '';
  const safeAssetId = typeof assetId == 'string' && /^[0-9A-Z]{56}$/.test(assetId) ? assetId : '';

  const loadPoolData = useStore((state) => state.loadPoolData);
  const reserve = useStore((state) =>
    state.poolData.get(safePoolId)?.reserves?.find((reserve) => {
      return reserve.assetId == safeAssetId;
    })
  );
  console.log(JSON.stringify(reserve));
  const reserve_est = useStore((state) =>
    state.pool_est.get(safePoolId)?.reserve_est?.find((res) => res.id === safeAssetId)
  );

  useEffect(() => {
    const updatePool = async () => {
      if (safePoolId != '') {
        await loadPoolData(safePoolId, connected ? walletAddress : undefined, false);
      }
    };
    updatePool();
    const refreshInterval = setInterval(async () => {
      await updatePool();
    }, 30 * 1000);
    return () => clearInterval(refreshInterval);
  }, [loadPoolData, safePoolId, reserve, connected, walletAddress]);

  return (
    <>
      <Row>
        <WalletWarning />
      </Row>
      <Row>
        <GoBackHeader poolId={safePoolId} />
      </Row>
      <Row>
        <Section width={SectionSize.FULL} sx={{ marginTop: '12px', marginBottom: '12px' }}>
          <ReserveDropdown action="borrow" poolId={safePoolId} activeReserveId={safeAssetId} />
        </Section>
      </Row>
      <Row>
        <Section width={SectionSize.FULL} sx={{ padding: '12px' }}>
          <Box
            sx={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px',
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'row' }}>
              <Typography variant="h5" sx={{ marginRight: '6px' }}>
                Available
              </Typography>
              <Typography variant="h4" sx={{ color: theme.palette.borrow.main }}>
                {toBalance(reserve_est?.available ?? 0, reserve?.config.decimals)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="h5" sx={{ color: theme.palette.text.secondary }}>
                {reserve?.tokenMetadata?.symbol ?? '--'}
              </Typography>
            </Box>
          </Box>
        </Section>
      </Row>
      <Row>
        <Section width={SectionSize.THIRD}>
          <StackedText
            title="Borrow APY"
            text={reserve_est ? toPercentage(reserve_est.apy) : '--'}
            sx={{ width: '100%', padding: '6px' }}
          ></StackedText>
        </Section>
        <Section width={SectionSize.THIRD}>
          <StackedText
            title="Liability factor"
            text={reserve_est ? toPercentage(1 / reserve_est.l_factor) : '--'}
            sx={{ width: '100%', padding: '6px' }}
          ></StackedText>
        </Section>
        <Section width={SectionSize.THIRD}>
          <StackedText
            title="Total borrowed"
            text={reserve_est ? toBalance(reserve_est.borrowed) : '--'}
            sx={{ width: '100%', padding: '6px' }}
          ></StackedText>
        </Section>
      </Row>
      <Row>
        <BorrowAnvil poolId={safePoolId} assetId={safeAssetId} />
      </Row>

      <OverlayModal poolId={safePoolId} type="dashboard" />
    </>
  );
};

export default Borrow;
