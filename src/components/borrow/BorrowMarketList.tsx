import HelpOutline from '@mui/icons-material/HelpOutline';
import { Box, Skeleton, Tooltip, Typography } from '@mui/material';
import { ViewType, useSettings } from '../../contexts';
import { useStore } from '../../store/store';
import { PoolComponentProps } from '../common/PoolComponentProps';
import { BorrowMarketCard } from './BorrowMarketCard';

export const BorrowMarketList: React.FC<PoolComponentProps> = ({ poolId }) => {
  const { viewType } = useSettings();

  const poolData = useStore((state) => state.pools.get(poolId));

  if (!poolData) {
    return <Skeleton variant="rectangular" />;
  }

  const headerNum = viewType === ViewType.REGULAR ? 5 : 4;
  const headerWidth = `${(100 / headerNum).toFixed(2)}%`;
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
        scrollbarColor: 'black grey',
        padding: '6px',
      }}
    >
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '6px',
          type: 'alt',
        }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ width: headerWidth }}>
          Asset
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          align="center"
          sx={{ width: headerWidth }}
        >
          Available
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          align="center"
          sx={{ width: headerWidth }}
        >
          APY
        </Typography>
        {headerNum >= 5 && (
          <Box sx={{ display: 'flex', flexDirection: 'row' }}>
            <Typography variant="body2" color="text.secondary" align="center">
              Liability Factor
            </Typography>
            <Tooltip
              title="The percent of this asset's value subtracted from your borrow capacity."
              placement="top"
            >
              <HelpOutline
                sx={{
                  color: 'text.secondary',
                  width: '15px',
                  marginTop: '-4px',
                  marginLeft: '4px',
                }}
              />
            </Tooltip>
          </Box>
        )}

        <Box sx={{ width: headerWidth }} />
      </Box>
      {Array.from(poolData.reserves.values())
        .filter((reserve) => reserve.config.l_factor > 0)
        .map((reserve) => (
          <BorrowMarketCard key={reserve.assetId} poolId={poolId} reserve={reserve} />
        ))}
    </Box>
  );
};
