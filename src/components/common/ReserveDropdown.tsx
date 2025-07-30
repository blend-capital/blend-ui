import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { Box, Menu, Typography, useTheme } from '@mui/material';
import { useRouter } from 'next/router';
import React from 'react';
import { usePool, usePoolMeta, useTokenMetadata } from '../../hooks/api';
import { toCompactAddress } from '../../utils/formatter';
import { CustomButton } from './CustomButton';
import { LetterIcon } from './LetterIcon';
import { PoolComponentProps } from './PoolComponentProps';
import ReserveDropdownItem from './ReserveDropdownItem';
import { TokenIcon } from './TokenIcon';

export interface ReserveDropdown extends PoolComponentProps {
  action: string;
  poolId: string;
  activeReserveId: string;
}

export const ReserveDropdown: React.FC<ReserveDropdown> = ({ action, poolId, activeReserveId }) => {
  const theme = useTheme();
  const router = useRouter();

  const { data: poolMeta } = usePoolMeta(poolId);
  const { data: pool } = usePool(poolMeta);
  const activeReserve = pool?.reserves?.get(activeReserveId);
  const { data: tokenMetadata } = useTokenMetadata(activeReserveId);
  const symbol = tokenMetadata?.symbol ?? toCompactAddress(activeReserveId);

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const capitalizedAction = action[0].toUpperCase() + action.slice(1);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleClickReserve = (reserveId: string) => {
    handleClose();
    router.push({ pathname: `/${action}`, query: { poolId: poolId, assetId: reserveId } });
  };

  return (
    <>
      <CustomButton
        id="borrow-dropdown-button"
        onClick={handleClick}
        sx={{ width: '100%', '&:hover': { backgroundColor: theme.palette.background.default } }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'flex-start',
            alignItems: 'center',
            borderRadius: '5px',
            paddingLeft: '6px',
          }}
        >
          {activeReserve ? (
            <>
              <TokenIcon assetId={activeReserve.assetId} sx={{ height: '30px', width: '30px' }} />
              <Typography variant="h3" sx={{ marginLeft: '12px' }}>
                {`${capitalizedAction} ${symbol}`}
              </Typography>
            </>
          ) : (
            <>
              <LetterIcon text={'?'} sx={{ height: '30px', width: '30px' }} />
              <Typography variant="h3" sx={{ marginLeft: '12px' }}>
                {toCompactAddress(activeReserveId)}
              </Typography>
            </>
          )}
        </Box>
        <ArrowDropDownIcon sx={{ color: theme.palette.text.secondary }} />
      </CustomButton>
      <Menu
        id="borrow-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'borrow-dropdown-button',
          sx: { width: anchorEl && anchorEl.offsetWidth },
        }}
      >
        {Array.from(pool?.reserves.values() ?? []).map((reserve) => (
          <ReserveDropdownItem
            key={reserve.assetId}
            text={capitalizedAction}
            reserve={reserve}
            onClick={handleClickReserve}
          />
        ))}
      </Menu>
    </>
  );
};
