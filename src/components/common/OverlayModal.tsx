import { Box } from '@mui/material';
import { useRouter } from 'next/router';
import { TxStatus, TxType, useWallet } from '../../contexts/wallet';
import { OverlayModalFail } from './OverlayModalFail';
import { OverlayModalSuccess } from './OverlayModalSuccess';
import { OverlayModalText } from './OverlayModalText';

export interface CloseableOverlayProps {
  handleCloseOverlay: () => void;
}

export const OverlayModal: React.FC = () => {
  const router = useRouter();
  const { txStatus, txType, clearLastTx } = useWallet();

  const display = txStatus !== TxStatus.NONE ? 'flex' : 'none';

  const { poolId } = router.query;

  const handleReturn = () => {
    const returnToHomePage = txStatus != TxStatus.FAIL;
    clearLastTx();

    if (returnToHomePage && txType != TxType.RESTORE) {
      if (router.route == '/') {
        router.push({ pathname: '/' });
      } else if (router.route.includes('backstop')) {
        router.push({ pathname: `/backstop`, query: { poolId: poolId } });
      } else {
        router.push({ pathname: `/dashboard`, query: { poolId: poolId } });
      }
    }
  };

  if (txStatus === TxStatus.NONE) {
    return <></>;
  }

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        top: '0',
        left: '0',
        display: display,
        position: 'fixed',
        justifyContent: 'top',
        alignItems: 'center',
        zIndex: '10',
        flexWrap: 'wrap',
        flexDirection: 'column',
        backgroundColor: 'rgba(25, 27, 31, 0.9)',
      }}
    >
      {txStatus === TxStatus.BUILDING && (
        <OverlayModalText message="Preparing your transaction..." />
      )}
      {txStatus === TxStatus.SIGNING && (
        <OverlayModalText message="Please confirm the transaction in your wallet." />
      )}
      {txStatus === TxStatus.SUBMITTING && (
        <OverlayModalText message="Submitting your transaction..." />
      )}
      {txStatus === TxStatus.SUCCESS && <OverlayModalSuccess handleCloseOverlay={handleReturn} />}
      {txStatus === TxStatus.FAIL && <OverlayModalFail handleCloseOverlay={handleReturn} />}
    </Box>
  );
};
