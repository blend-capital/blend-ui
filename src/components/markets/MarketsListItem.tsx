import { Box, BoxProps, Typography, useTheme } from '@mui/material';
import { ViewType, useSettings } from '../../contexts';
import { ReserveEstimates } from '../../store/estimationSlice';
import * as formatter from '../../utils/formatter';
import { TokenHeader } from '../common/TokenHeader';
import { StackedApr } from './StackedApr';

export interface MarketsListItemProps extends BoxProps {
  poolId: string;
  reserveData: ReserveEstimates;
}

export const MarketsListItem: React.FC<MarketsListItemProps> = ({
  poolId,
  reserveData,
  sx,
  ...props
}) => {
  const theme = useTheme();
  const { viewType } = useSettings();

  const tableNum = viewType == ViewType.REGULAR ? 6 : 3;
  const tableWidth = `${(100 / tableNum).toFixed(2)}%`;
  return (
    <Box
      sx={{
        type: 'alt',
        display: 'flex',
        width: '100%',
        padding: '6px',
        marginBottom: '12px',
        borderRadius: '5px',
        '&:hover': {
          background: theme.palette.menu.light,
        },
        ...sx,
      }}
      {...props}
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
        <TokenHeader
          poolId={poolId}
          assetId={reserveData.id}
          displayLink={true}
          sx={{ width: tableWidth, marginRight: '12px' }}
        />
        <Box
          sx={{
            width: tableWidth,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Typography variant="body1">{formatter.toBalance(reserveData.supplied)}</Typography>
        </Box>
        <Box
          sx={{
            width: tableWidth,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Typography variant="body1">{formatter.toBalance(reserveData.borrowed)}</Typography>
        </Box>
        {tableNum >= 6 && (
          <>
            <Box
              sx={{
                width: tableWidth,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Typography variant="body1">
                {formatter.toPercentage(reserveData.c_factor)}
              </Typography>
            </Box>
            <Box
              sx={{
                width: tableWidth,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Typography variant="body1">
                {formatter.toPercentage(1 / reserveData.l_factor)}
              </Typography>
            </Box>
            <Box
              sx={{
                width: tableWidth,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <StackedApr
                aprLend={formatter.toPercentage(reserveData.supply_apy)}
                aprBorrow={formatter.toPercentage(reserveData.apy)}
              ></StackedApr>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};
