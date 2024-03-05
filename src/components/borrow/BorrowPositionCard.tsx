import { PoolUser, Reserve } from '@blend-capital/blend-sdk';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Box, Typography, useTheme } from '@mui/material';
import { ViewType, useSettings } from '../../contexts';
import * as formatter from '../../utils/formatter';
import { getEmissionsPerDayPerUnit } from '../../utils/token';
import { CustomButton } from '../common/CustomButton';
import { FlameIcon } from '../common/FlameIcon';
import { LinkBox } from '../common/LinkBox';
import { PoolComponentProps } from '../common/PoolComponentProps';
import { SectionBase } from '../common/SectionBase';
import { TokenHeader } from '../common/TokenHeader';

export interface BorrowPositionCardProps extends PoolComponentProps {
  reserve: Reserve;
  userPoolData: PoolUser;
}

export const BorrowPositionCard: React.FC<BorrowPositionCardProps> = ({
  poolId,
  reserve,
  userPoolData,
  sx,
  ...props
}) => {
  const theme = useTheme();
  const { viewType } = useSettings();

  const userBorrowEst = userPoolData.positionEstimates.liabilities.get(reserve.assetId) ?? 0;

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
        to={{ pathname: '/repay', query: { poolId: poolId, assetId: reserve.assetId } }}
      >
        <CustomButton
          sx={{
            width: '100%',
            padding: '12px',
            backgroundColor: theme.palette.background.default,
            '&:hover': {
              color: theme.palette.borrow.main,
            },
          }}
        >
          <TokenHeader id={reserve.assetId} sx={{ width: tableWidth }} />
          <Box
            sx={{
              width: tableWidth,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Typography variant="body1">
              {formatter.toBalance(userBorrowEst, reserve.config.decimals)}
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
            <Typography variant="body1">{formatter.toPercentage(reserve.estimates.apy)}</Typography>
            {!!reserve.borrowEmissions && (
              <FlameIcon
                width={22}
                height={22}
                title={formatter.getEmissionTextFromValue(
                  getEmissionsPerDayPerUnit(
                    reserve.borrowEmissions?.config.eps || BigInt(0),
                    reserve.estimates.borrowed,
                    reserve.config.decimals
                  ),
                  reserve.tokenMetadata.symbol
                )}
              />
            )}
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
