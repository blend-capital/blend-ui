import { Box, Tooltip, Typography, useTheme } from '@mui/material';
import * as formatter from '../../utils/formatter';
import { Version } from '../../utils/version';
import { Icon } from './Icon';

interface RateDisplayParams {
  assetSymbol: string;
  assetRate: number;
  emissionSymbol: string;
  emissionApr: number | undefined;
  rateType: 'earned' | 'charged';
  direction: 'vertical' | 'horizontal';
  version: Version | undefined;
}

export const RateDisplay = ({
  assetSymbol,
  assetRate,
  emissionSymbol,
  emissionApr,
  rateType,
  direction,
  version,
}: RateDisplayParams) => {
  const theme = useTheme();

  // V2.1 emissions are not shown until they can be claimed
  const showEmissions = version !== Version.V2_1 && emissionApr !== undefined && emissionApr > 0;
  const emissionRate = showEmissions ? emissionApr : 0;
  const net = rateType === 'earned' ? assetRate + emissionRate : assetRate - emissionRate;
  return (
    <Tooltip
      title={
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography variant="body2">
            {`${assetSymbol} interest ${rateType} ${`${formatter.toPercentage(assetRate)}`}`}
          </Typography>
          {showEmissions && (
            <Typography variant="body2">{`${emissionSymbol} emissions earned ${formatter.toPercentage(
              emissionApr
            )}`}</Typography>
          )}
          <Typography variant="body2">
            {`Net interest ${rateType} ${formatter.toPercentage(net)}`}
          </Typography>
        </Box>
      }
      placement="top"
      enterTouchDelay={0}
      enterDelay={500}
      leaveTouchDelay={3000}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: direction === 'vertical' ? 'column' : 'row',
          justifyContent: direction === 'vertical' ? 'center' : 'flex-start',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: direction === 'vertical' ? '0px' : '4px',
        }}
      >
        <Typography variant="body1">{formatter.toPercentage(assetRate)}</Typography>

        {showEmissions && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              borderRadius: '5px',
              paddingLeft: '4px',
              paddingRight: '4px',
              gap: '4px',
              background: theme.palette.primary.opaque,
              alignItems: 'center',
            }}
          >
            <Typography variant="body1" color={theme.palette.primary.main}>
              {formatter.toPercentage(emissionApr)}
            </Typography>
            <Icon
              src="/icons/dashboard/pool_emissions_icon.svg.svg"
              height={`${18}px`}
              width={`${18}px`}
              alt="emission"
            />
          </Box>
        )}
      </Box>
    </Tooltip>
  );
};
