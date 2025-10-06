import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LogoutIcon from '@mui/icons-material/Logout';
import RefreshIcon from '@mui/icons-material/Refresh';
import WalletIcon from '@mui/icons-material/Wallet';
import {
  Alert,
  Button,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Snackbar,
  Typography,
  useTheme,
} from '@mui/material';
import copy from 'copy-to-clipboard';
import React from 'react';
import { useWallet } from '../../contexts/wallet';
import * as formatter from '../../utils/formatter';
import { CustomButton } from '../common/CustomButton';

export const WalletMenu = () => {
  const theme = useTheme();
  const { connect, disconnect, refresh, connected, walletAddress, isLoading } = useWallet();

  // snackbars
  const [snackMessage, setSnackMessage] = React.useState('');
  const [openSuccess, setOpenSuccess] = React.useState(false);
  const [openWarning, setOpenWarning] = React.useState(false);
  const [openError, setOpenError] = React.useState(false);

  const handleConnectWallet = (successful: boolean) => {
    if (successful) {
      setSnackMessage('Wallet connected.');
      setOpenSuccess(true);
    } else {
      setSnackMessage('Unable to connect wallet.');
      setOpenError(true);
    }
  };

  const handleDisconnectWallet = () => {
    disconnect();
    setSnackMessage('Wallet disconnected.');
    setOpenSuccess(true);
  };

  const handleCopyAddress = () => {
    if (walletAddress == '' || !connected) {
      setSnackMessage('Wallet address not found.');
      setOpenWarning(true);
    } else {
      copy(walletAddress || '');
      setSnackMessage('Wallet address copied to clipboard.');
      setOpenSuccess(true);
    }
  };

  const handleRefreshAddress = (successful: boolean) => {
    if (successful) {
      setSnackMessage('Wallet address updated.');
      setOpenSuccess(true);
    } else {
      setSnackMessage('Unable to refresh wallet address.');
      setOpenError(true);
    }
  };

  const handleSnackClose = () => {
    setSnackMessage('');
    setOpenSuccess(false);
    setOpenWarning(false);
    setOpenError(false);
  };

  const [anchorElDropdown, setAnchorElDropdown] = React.useState<null | HTMLElement>(null);
  const openDropdown = Boolean(anchorElDropdown);

  const handleClickDropdown = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorElDropdown(event.currentTarget);
  };

  const handleClickConnect = () => {
    connect(handleConnectWallet);
  };

  const handleClickRefresh = () => {
    refresh(handleRefreshAddress);
  };

  const handleClose = () => {
    handleSnackClose();
    setAnchorElDropdown(null);
  };

  return (
    <>
      {connected ? (
        <CustomButton
          id="wallet-dropdown-button"
          onClick={handleClickDropdown}
          sx={{ width: '100%', height: '100%', color: theme.palette.text.secondary }}
        >
          <WalletIcon />
          <Typography variant="body1" color={theme.palette.text.primary}>
            {formatter.toCompactAddress(walletAddress)}
          </Typography>
          <ArrowDropDownIcon sx={{ color: theme.palette.text.secondary }} />
        </CustomButton>
      ) : (
        <Button
          id="connect-wallet-dropdown-button"
          variant="contained"
          color="primary"
          endIcon={<ArrowDropDownIcon />}
          onClick={handleClickConnect}
          disabled={isLoading}
          sx={{ width: '100%' }}
        >
          Connect Wallet
        </Button>
      )}
      <Menu
        id="wallet-dropdown-menu"
        anchorEl={anchorElDropdown}
        open={openDropdown}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'wallet-dropdown-button',
          sx: { width: anchorElDropdown && anchorElDropdown.offsetWidth },
        }}
        PaperProps={{
          // @ts-ignore - TODO: Figure out why typing is broken
          backgroundColor: theme.palette.menu.main,
        }}
      >
        <MenuItem
          onClick={() => {
            handleClose();
            handleCopyAddress();
          }}
        >
          <ListItemText>Copy address</ListItemText>
          <ListItemIcon>
            <ContentCopyIcon />
          </ListItemIcon>
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleClose();
            handleClickRefresh();
          }}
        >
          <ListItemText>Refresh address</ListItemText>
          <ListItemIcon>
            <RefreshIcon />
          </ListItemIcon>
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleClose();
            handleDisconnectWallet();
          }}
          sx={{ color: '#E7424C' }}
        >
          <ListItemText>Disconnect</ListItemText>
          <ListItemIcon>
            <LogoutIcon sx={{ color: '#E7424C' }} />
          </ListItemIcon>
        </MenuItem>
      </Menu>

      <Snackbar
        open={openSuccess}
        autoHideDuration={4000}
        onClose={handleSnackClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
      >
        <Alert
          onClose={handleClose}
          severity="success"
          sx={{
            backgroundColor: theme.palette.primary.opaque,
            alignItems: 'center',
            width: '100%',
          }}
        >
          {snackMessage}
        </Alert>
      </Snackbar>
      <Snackbar
        open={openWarning}
        autoHideDuration={4000}
        onClose={handleSnackClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
      >
        <Alert
          onClose={handleClose}
          severity="warning"
          sx={{
            backgroundColor: theme.palette.primary.opaque,
            alignItems: 'center',
            width: '100%',
          }}
        >
          {snackMessage}
        </Alert>
      </Snackbar>
      <Snackbar
        open={openError}
        autoHideDuration={4000}
        onClose={handleSnackClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
      >
        <Alert
          onClose={handleClose}
          severity="error"
          sx={{
            backgroundColor: theme.palette.error.opaque,
            alignItems: 'center',
            width: '100%',
          }}
        >
          {snackMessage}
        </Alert>
      </Snackbar>
    </>
  );
};
