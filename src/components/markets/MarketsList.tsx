import { Box, Typography } from '@mui/material';
import { ViewType, useSettings } from '../../contexts';
import { useStore } from '../../store/store';
import { PoolComponentProps } from '../common/PoolComponentProps';
import { MarketsListItem } from './MarketsListItem';

export const MarketsList: React.FC<PoolComponentProps> = ({ poolId }) => {
  const { viewType } = useSettings();

  const poolReserveEstimates = useStore((state) => state.pool_est.get(poolId)?.reserve_est);

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
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ width: headerWidth, marginRight: '12px' }}
        >
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
      {poolReserveEstimates ? (
        poolReserveEstimates.map((reserve) => (
          <MarketsListItem key={reserve.id} poolId={poolId} reserveData={reserve} />
        ))
      ) : (
        <></>
      )}
    </Box>
  );
};
