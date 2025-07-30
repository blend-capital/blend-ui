import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import CancelIcon from '@mui/icons-material/Cancel';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  IconButton,
  InputAdornment,
  Popover,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useState } from 'react';
import { useTokenMetadataList } from '../../hooks/api';
import { ToggleButton } from '../common/ToggleButton';
import { TokenHeader } from '../common/TokenHeader';

export type SortType = 'poolTvl' | 'backstopTvl';
export type SortDirection = 'asc' | 'desc';

export interface MarketFilterProps {
  onFilterChange: (key: keyof MarketFilters, value: any) => void;
  availableAssets: string[]; // List of available asset contract ids
  defaultFilters: MarketFilters;
}

export interface MarketFilters {
  search: string;
  sortBy: SortType;
  sortDirection: SortDirection;
  selectedAssets: string[];
}

const sortByOptions: { value: SortType; label: string; direction: SortDirection }[] = [
  { value: 'poolTvl', label: 'Pool TVL', direction: 'desc' },
  { value: 'poolTvl', label: 'Pool TVL', direction: 'asc' },
  { value: 'backstopTvl', label: 'Backstop TVL', direction: 'desc' },
  { value: 'backstopTvl', label: 'Backstop TVL', direction: 'asc' },
];

export const MarketFilter: React.FC<MarketFilterProps> = ({
  onFilterChange,
  availableAssets,
  defaultFilters,
}) => {
  const theme = useTheme();

  const tokenMetadataList = useTokenMetadataList(availableAssets);

  // Dropdown menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  // Handle changes by calling the parent's handler
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange('search', event.target.value);
  };

  const handleSortByChange = (option: SortType, direction: SortDirection) => {
    onFilterChange('sortBy', option);
    onFilterChange('sortDirection', direction);
  };

  const handleAssetChange = (assetSymbol: string) => {
    const newSelectedAssets = defaultFilters.selectedAssets.includes(assetSymbol)
      ? defaultFilters.selectedAssets.filter((asset) => asset !== assetSymbol)
      : [...defaultFilters.selectedAssets, assetSymbol];
    onFilterChange('selectedAssets', newSelectedAssets);
  };

  const handleClearSearch = () => {
    onFilterChange('search', '');
  };

  // Open filter dropdown
  const openFilterMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  // Close filter dropdown
  const closeFilterMenu = () => {
    setAnchorEl(null);
  };

  return (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Box
        sx={{
          flexGrow: 1,
          flexShrink: 1,
          minWidth: '100px',
          maxWidth: '230px',
          marginRight: 1,
        }}
      >
        <TextField
          size="small"
          variant="standard"
          placeholder="Search pools by name or asset"
          value={defaultFilters.search}
          onChange={handleSearchChange}
          sx={{
            backgroundColor: theme.palette.background.paper,
            borderRadius: 6,
            width: '100%',
            '& .MuiInputBase-input': {
              padding: '8px 0',
              fontSize: '12px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            },
            '& .MuiInputAdornment-root': {
              margin: 0,
            },
            '& .MuiInput-underline:before': {
              borderBottom: 'none',
            },
            '& .MuiInputBase-input::placeholder': {
              fontSize: '12px',
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" fontSize="small" sx={{ marginLeft: '6px' }} />
              </InputAdornment>
            ),
            endAdornment: defaultFilters.search ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={handleClearSearch}>
                  <CancelIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.palette.primary.opaque,
            color: theme.palette.primary.main,
            height: '32px',
            borderRadius: 6,
            padding: '4px 8px',
          }}
        >
          <Typography
            variant="body2"
            sx={{
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            {defaultFilters.sortBy === 'poolTvl' ? 'Pool TVL' : 'Backstop TVL'}
          </Typography>
          <ArrowUpwardIcon
            fontSize="small"
            sx={{
              transform: defaultFilters.sortDirection === 'asc' ? 'rotate(0deg)' : 'rotate(180deg)',
              transition: 'transform 0.2s ease-in-out',
              ml: 0.5,
              flexShrink: 0,
            }}
          />
        </Box>

        <Box
          sx={{
            display: 'flex',
            ml: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconButton
            color={open ? 'primary' : 'default'}
            onClick={openFilterMenu}
            sx={{
              backgroundColor: theme.palette.background.paper,
              height: '32px',
              width: '32px',
            }}
          >
            <FilterListIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={closeFilterMenu}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              width: 250,
              maxHeight: '80vh',
              overflowY: 'auto',
              borderRadius: 1.5,
              backgroundColor: theme.palette.background.paper,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            },
          },
        }}
      >
        <Box sx={{ padding: 1 }}>
          <Typography variant="subtitle2" fontWeight="medium" sx={{ marginBottom: 1 }}>
            Sort By
          </Typography>
          <Box sx={{ marginBottom: 1 }}>
            <Stack spacing={1}>
              {sortByOptions.map((option) => (
                <ToggleButton
                  active={
                    defaultFilters.sortBy === option.value &&
                    defaultFilters.sortDirection === option.direction
                  }
                  key={option.value}
                  onClick={() => handleSortByChange(option.value, option.direction)}
                  palette={theme.palette.primary}
                  sx={{
                    width: '100%',
                    height: '36px',
                    fontSize: '14px',
                    borderRadius: 1.5,
                    justifyContent: 'left',
                    padding: '4px 8px',
                  }}
                >
                  {option.label} {option.direction === 'asc' ? '(Low to High)' : '(High to Low)'}
                </ToggleButton>
              ))}
            </Stack>
          </Box>

          <Typography variant="subtitle2" fontWeight="medium" sx={{ marginBottom: 1 }}>
            Filter By
          </Typography>
          <Box sx={{ marginBottom: 1 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 1,
              }}
            >
              {tokenMetadataList.map((option) => (
                <ToggleButton
                  active={defaultFilters.selectedAssets.some(
                    (asset) => asset === option.data?.symbol
                  )}
                  key={option.data?.asset?.code}
                  onClick={() => handleAssetChange(option.data?.symbol || '')}
                  palette={theme.palette.primary}
                  sx={{
                    width: '100%',
                    height: '36px',
                    fontSize: '14px',
                    borderRadius: 1.5,
                    justifyContent: 'left',
                    padding: '4px 8px',
                    // Ensure text doesn't overflow
                    '& .MuiTypography-root': {
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    },
                  }}
                >
                  <TokenHeader
                    assetId={option.data?.assetId ?? ''}
                    hideDomain={true}
                    iconSize="24px" // Slightly smaller icon for grid layout
                  />
                </ToggleButton>
              ))}
            </Box>
          </Box>
        </Box>
      </Popover>
    </Box>
  );
};

export default MarketFilter;
