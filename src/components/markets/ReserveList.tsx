import { Pool } from '@blend-capital/blend-sdk';
import { Box, BoxProps, Typography } from '@mui/material';
import { ViewType, useSettings } from '../../contexts';
import { ReserveListItem } from './ReserveListItem';

export interface ReserveListProps extends BoxProps {
  pool: Pool;
}

export const ReserveList: React.FC<ReserveListProps> = ({ pool }) => {
  const { viewType } = useSettings();

  const headerNum = viewType == ViewType.REGULAR ? 6 : 3;
  const headerWidth = `${(100 / headerNum).toFixed(2)}%`;
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
        scrollbarColor: 'black grey',
        padding: '6px',
        marginTop: '12px',
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
          Total Supplied
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          align="center"
          sx={{ width: headerWidth }}
        >
          Total Borrowed
        </Typography>
        {headerNum >= 6 && (
          <>
            <Typography
              variant="body2"
              color="text.secondary"
              align="center"
              sx={{ width: headerWidth }}
            >
              Collateral Factor
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              align="center"
              sx={{ width: headerWidth }}
            >
              Liability Factor
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              align="center"
              sx={{ width: headerWidth }}
            >
              APY
            </Typography>
          </>
        )}
      </Box>
      {pool.reserves.size > 0 &&
        Array.from(pool.reserves.values()).map((reserve) => (
          <ReserveListItem key={reserve.assetId} poolId={pool.id} reserve={reserve} />
        ))}
    </Box>
  );
};
