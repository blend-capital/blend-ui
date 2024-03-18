import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded';
import { Alert, IconButton, Menu, MenuItem, Snackbar, useTheme } from '@mui/material';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { ViewType, useSettings } from '../../contexts';
import { useStore } from '../../store/store';
import { NavItem } from './NavItem';

export const NavMenu = () => {
  const theme = useTheme();
  const { viewType, lastPool } = useSettings();

  const rewardZone = useStore((state) => state.backstop?.config?.rewardZone ?? []);

  const [openCon, setOpenCon] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSnackClose = () => {
    setOpenCon(false);
  };

  const [poolId, setPoolId] = useState<string | undefined>(lastPool);

  useEffect(() => {
    if (!poolId || poolId !== lastPool) {
      if (lastPool) {
        setPoolId(lastPool);
      } else if (rewardZone.length != 0) {
        // get the last (oldest) pool in the reward zone
        const rewardPoolId = rewardZone[rewardZone.length - 1];
        if (rewardPoolId !== poolId) {
          setPoolId(rewardPoolId);
        }
      }
    }
  }, [lastPool, rewardZone]);

  return (
    <>
      <IconButton
        id="nav-dropdown-button"
        onClick={handleClick}
        sx={{ width: '100%', height: '100%', color: theme.palette.text.secondary }}
      >
        <MoreHorizRoundedIcon />
      </IconButton>
      {viewType === ViewType.REGULAR && (
        <Menu
          id="nav-menu"
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          MenuListProps={{
            'aria-labelledby': 'pool-dropdown-button',
          }}
          PaperProps={{
            // @ts-ignore - TODO: Figure out why typing is broken
            backgroundColor: theme.palette.menu.main,
          }}
        >
          <Link href="/network" >
            <MenuItem onClick={handleClose} sx={{ color: '#FFFFFF' }}>
              Network Config
            </MenuItem>
          </Link>
          <a href="https://docs.blend.capital/" target="_blank" rel="noreferrer">
            <MenuItem onClick={handleClose} sx={{ color: '#FFFFFF' }}>
              Docs
            </MenuItem>
          </a>
        </Menu>
      )}
      {viewType !== ViewType.REGULAR && (
        <Menu
          id="nav-menu"
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          MenuListProps={{
            'aria-labelledby': 'pool-dropdown-button',
          }}
          PaperProps={{
            // @ts-ignore - TODO: Figure out why typing is broken
            backgroundColor: theme.palette.menu.main,
          }}
        >
          <NavItem
            onClick={handleClose}
            to={{ pathname: '/', query: { poolId: poolId } }}
            title="Markets"
            sx={{ width: '90%', justifyContent: 'left', marginBottom: '6px' }}
          />
          <NavItem
            onClick={handleClose}
            to={{ pathname: '/dashboard', query: { poolId: poolId } }}
            title="Dashboard"
            sx={{ width: '90%', justifyContent: 'left', marginBottom: '6px' }}
          />
          <NavItem
            onClick={handleClose}
            to={{ pathname: '/backstop', query: { poolId: poolId } }}
            title="Backstop"
            sx={{ width: '90%', justifyContent: 'left', marginBottom: '6px' }}
          />
          <Link href="/network" >
            <MenuItem onClick={handleClose} sx={{ color: '#FFFFFF' }}>
              Network Config
            </MenuItem>
          </Link>
          <a href="https://docs.blend.capital/" target="_blank" rel="noreferrer">
            <MenuItem onClick={handleClose} sx={{ color: '#FFFFFF' }}>
              Docs
            </MenuItem>
          </a>
        </Menu>
      )}

      <Snackbar
        open={openCon}
        autoHideDuration={4000}
        onClose={handleSnackClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
      >
        <Alert
          onClose={handleClose}
          severity="info"
          sx={{
            backgroundColor: theme.palette.info.opaque,
            alignItems: 'center',
            width: '100%',
          }}
        >
          Wallet already received funds.
        </Alert>
      </Snackbar>
    </>
  );
};
