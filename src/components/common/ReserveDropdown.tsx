import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { Box, Menu, MenuItem, Typography, useTheme } from '@mui/material';
import { useRouter } from 'next/router';
import React from 'react';
import { useStore } from '../../store/store';
import { CustomButton } from './CustomButton';
import { PoolComponentProps } from './PoolComponentProps';
import { TokenIcon } from './TokenIcon';

export interface ReserveDropdown extends PoolComponentProps {
  action: string;
  poolId: string;
  activeReserveId: string;
}

export const ReserveDropdown: React.FC<ReserveDropdown> = ({ action, poolId, activeReserveId }) => {
  const theme = useTheme();
  const router = useRouter();

  const reserves = useStore((state) => state.poolData.get(poolId)?.reserves);
  const activeReserve = reserves?.find((reserve) => {
    reserve.assetId == activeReserveId;
  });

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
          <TokenIcon
            symbol={activeReserve?.symbol ?? 'unknown'}
            sx={{ height: '30px', width: '30px' }}
          />
          <Typography variant="h3" sx={{ marginLeft: '12px' }}>
            {`${capitalizedAction} ${activeReserve?.symbol ?? 'unknown'}`}
          </Typography>
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
        {Array.from(reserves?.values() ?? []).map((reserve) => (
          <MenuItem
            key={reserve.assetId}
            onClick={() => handleClickReserve(reserve.assetId)}
            sx={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'flex-start',
              alignItems: 'center',
              borderRadius: '5px',
              paddingLeft: '6px',
            }}
          >
            <TokenIcon
              symbol={reserve?.symbol ?? 'unknown'}
              sx={{ height: '30px', width: '30px' }}
            />
            <Typography variant="h3" sx={{ marginLeft: '12px' }}>
              {`${capitalizedAction} ${reserve?.symbol ?? 'unknown'}`}
            </Typography>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};
