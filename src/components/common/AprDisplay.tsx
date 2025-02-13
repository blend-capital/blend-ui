import { Box, Tooltip, Typography, useTheme } from '@mui/material';
import * as formatter from '../../utils/formatter';
import { Icon } from './Icon';

interface AprDisplayParams {
  assetSymbol: string;
  assetApr: number;
  emissionSymbol: string;
  emissionApr: number | undefined;
  isSupply: boolean;
  direction: 'vertical' | 'horizontal';
}

export const AprDisplay = ({
  assetSymbol,
  assetApr,
  emissionSymbol,
  emissionApr,
  isSupply,
  direction,
}: AprDisplayParams) => {
  const theme = useTheme();

  return (
    <Tooltip
      title={
        isSupply ? (
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="body2">
              {`${assetSymbol} interest earned ${`${formatter.toPercentage(assetApr)}`}`}
            </Typography>
            {emissionApr && (
              <Typography variant="body2">{`${emissionSymbol} emissions earned ${formatter.toPercentage(
                emissionApr
              )}`}</Typography>
            )}
            <Typography variant="body2">
              {`Net APR earned ${formatter.toPercentage((emissionApr ?? 0) + assetApr)}`}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="body2">
              {`${assetSymbol} interest charged ${`${formatter.toPercentage(assetApr)}`}`}
            </Typography>
            {emissionApr && (
              <Typography variant="body2">{`${emissionSymbol} emissions earned ${formatter.toPercentage(
                emissionApr
              )}`}</Typography>
            )}
            <Typography variant="body2">
              {`Net APR charged ${formatter.toPercentage(assetApr - (emissionApr ?? 0))}`}
            </Typography>
          </Box>
        )
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
        <Typography variant="body1">{formatter.toPercentage(assetApr)}</Typography>

        {emissionApr !== undefined && emissionApr > 0 && (
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
              alt="emzission"
            />
          </Box>
        )}
      </Box>
    </Tooltip>
  );
};
