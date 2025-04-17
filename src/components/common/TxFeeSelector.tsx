import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import { Box, BoxProps, Menu, MenuItem, Typography } from '@mui/material';
import React from 'react';
import { useWallet } from '../../contexts/wallet';
import { useFeeStats } from '../../hooks/api';
import theme from '../../theme';
import { CustomButton } from './CustomButton';
export interface TxFeeSelectorProps extends BoxProps {}

export const TxFeeSelector: React.FC<TxFeeSelectorProps> = () => {
  const { setTxFee, txFeeLevel, setTxFeeLevel, txFee } = useWallet();
  const { data: feeStats } = useFeeStats();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  if (feeStats === undefined) {
    return <></>;
  }
  switch (txFeeLevel) {
    case 'Low':
      if (txFee !== feeStats.sorobanInclusionFee.p30) {
        setTxFee(feeStats.sorobanInclusionFee.p30);
      }
      break;
    case 'Medium':
      if (txFee !== feeStats.sorobanInclusionFee.p70) {
        setTxFee(feeStats.sorobanInclusionFee.p70);
      }
      break;
    case 'High':
      if (txFee !== feeStats.sorobanInclusionFee.p95) {
        setTxFee(feeStats.sorobanInclusionFee.p95);
      }
      break;
  }
  return (
    <>
      <CustomButton
        id="fee-dropdown-button"
        onClick={handleClick}
        sx={{ padding: '4px', '&:hover': { color: 'white' } }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'flex-start',
            alignItems: 'center',
            color: theme.palette.text.secondary,
            '&:hover': { color: 'white' },
          }}
        >
          <Typography variant="h5">{txFeeLevel} Fee Priority</Typography>
          {open ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />}
        </Box>
      </CustomButton>
      <Menu
        id="fee-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'fee-dropdown-button',
          // sx: { width: anchorEl && anchorEl.offsetWidth },
        }}
      >
        <MenuItem
          onClick={() => {
            setTxFeeLevel('Low');
            setTxFee(feeStats.sorobanInclusionFee.p30);
            handleClose();
          }}
          sx={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'flex-start',
            alignItems: 'center',
            borderRadius: '5px',
          }}
        >
          <Typography variant="h3">Low (lowest fees, low priority)</Typography>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setTxFeeLevel('Medium');
            setTxFee(feeStats.sorobanInclusionFee.p70);
            handleClose();
          }}
          sx={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'flex-start',
            alignItems: 'center',
            borderRadius: '5px',
          }}
        >
          <Typography variant="h3">Medium (best in most cases)</Typography>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setTxFeeLevel('High');
            setTxFee(feeStats.sorobanInclusionFee.p95);
            handleClose();
          }}
          sx={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'flex-start',
            alignItems: 'center',
            borderRadius: '5px',
          }}
        >
          <Typography variant="h3">High (high fees, high priority)</Typography>
        </MenuItem>
      </Menu>
    </>
  );
};
