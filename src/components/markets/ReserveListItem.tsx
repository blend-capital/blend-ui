import { Reserve } from '@blend-capital/blend-sdk';
import { Box, BoxProps, Typography, useTheme } from '@mui/material';
import { ViewType, useSettings } from '../../contexts';
import * as formatter from '../../utils/formatter';
import { LinkBox } from '../common/LinkBox';
import { TokenHeader } from '../common/TokenHeader';
import { StackedApy } from './StackedApy';

export interface ReserveListItemProps extends BoxProps {
  poolId: string;
  reserve: Reserve;
}

export const ReserveListItem: React.FC<ReserveListItemProps> = ({
  poolId,
  reserve,
  sx,
  ...props
}) => {
  const theme = useTheme();
  const { viewType } = useSettings();

  const tableNum = viewType == ViewType.REGULAR ? 6 : 3;
  const tableWidth = `${(100 / tableNum).toFixed(2)}%`;
  return (
    <LinkBox
      sx={{
        type: 'alt',
        display: 'flex',
        width: '100%',
        padding: '6px',
        marginBottom: '12px',
        borderRadius: '5px',
        '&:hover': {
          cursor: 'pointer',
          background: theme.palette.menu.light,
        },
        ...sx,
      }}
      to={{ pathname: '/asset', query: { poolId: poolId, assetId: reserve.assetId } }}
      {...props}
    >
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          type: 'alt',
        }}
      >
        <TokenHeader assetId={reserve.assetId} sx={{ width: tableWidth }} />
        <Box
          sx={{
            width: tableWidth,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Typography variant="body1">{formatter.toBalance(reserve.totalSupplyFloat())}</Typography>
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
            {formatter.toBalance(reserve.totalLiabilitiesFloat())}
          </Typography>
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
                {formatter.toPercentage(reserve.config.c_factor / 1e7)}
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
                {formatter.toPercentage(1 / (reserve.config.l_factor / 1e7))}
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
              <StackedApy
                apyLend={formatter.toPercentage(reserve.estSupplyApy)}
                apyBorrow={formatter.toPercentage(reserve.estBorrowApy)}
              />
            </Box>
          </>
        )}
      </Box>
    </LinkBox>
  );
};
