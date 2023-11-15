import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Box, Typography, useTheme } from '@mui/material';
import { ViewType, useSettings } from '../../contexts';
import { ReserveEstimates, UserReserveEstimates } from '../../store/estimationSlice';
import * as formatter from '../../utils/formatter';
import { CustomButton } from '../common/CustomButton';
import { LinkBox } from '../common/LinkBox';
import { PoolComponentProps } from '../common/PoolComponentProps';
import { SectionBase } from '../common/SectionBase';
import { TokenHeader } from '../common/TokenHeader';

export interface LendPositionCardProps extends PoolComponentProps {
  reserveData: ReserveEstimates;
  userResData: UserReserveEstimates;
}

export const LendPositionCard: React.FC<LendPositionCardProps> = ({
  poolId,
  reserveData,
  userResData,
  sx,
  ...props
}) => {
  const theme = useTheme();
  const { viewType } = useSettings();

  const tableNum = viewType === ViewType.REGULAR ? 5 : 4;
  const tableWidth = `${(100 / tableNum).toFixed(2)}%`;
  return (
    <SectionBase
      type="alt"
      sx={{
        display: 'flex',
        width: '100%',
        marginBottom: '12px',
        ...sx,
      }}
      {...props}
    >
      <LinkBox
        sx={{ width: '100%' }}
        to={{ pathname: '/withdraw', query: { poolId: poolId, assetId: reserveData.id } }}
      >
        <CustomButton
          sx={{
            width: '100%',
            padding: '12px',
            backgroundColor: theme.palette.background.default,
            '&:hover': {
              color: theme.palette.lend.main,
            },
          }}
        >
          <TokenHeader
            poolId={poolId}
            assetId={reserveData.id}
            displayLink={false}
            sx={{ width: tableWidth }}
          />
          <Box
            sx={{
              width: tableWidth,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Typography variant="body1">
              {formatter.toBalance(userResData.supplied, reserveData.decimals)}
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
              {formatter.toPercentage(reserveData.supply_apy)}
            </Typography>
          </Box>
          {tableNum >= 5 && <Box sx={{ width: tableWidth }} />}
          <Box
            sx={{
              width: tableWidth,
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
            }}
          >
            <ArrowForwardIcon fontSize="inherit" />
          </Box>
        </CustomButton>
      </LinkBox>
    </SectionBase>
  );
};
