import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import { Box, BoxProps, CircularProgress, useTheme } from '@mui/material';
import React from 'react';
import { useStore } from '../../store/store';
export interface BorrowCapRingProps extends BoxProps {
  poolId: string;
}

export const BorrowCapRing: React.FC<BorrowCapRingProps> = ({ poolId, ...props }) => {
  const theme = useTheme();

  const poolUserEstimate = useStore((state) => state.userPoolData.get(poolId));

  const borrow_capacity_fill = poolUserEstimate
    ? (poolUserEstimate.positionEstimates.totalEffectiveLiabilities /
        poolUserEstimate.positionEstimates.totalEffectiveLiabilities) *
      100
    : 100;
  console.log({
    borrow_capacity_fill,
    poolUserEstimate,
    val: poolUserEstimate?.positionEstimates.totalEffectiveLiabilities,
  });
  const capacityPercentage = 25;

  function getIconByCapacity(capacity: number) {
    if (capacity > 80) {
      return (
        <>
          <PriorityHighIcon
            sx={{
              position: 'absolute',
              left: 'calc(50% - 4px)',
            }}
            fontSize="small"
            color="error"
          />
          <PriorityHighIcon
            sx={{
              position: 'absolute',
              left: 'calc(50% + 2px)',
            }}
            fontSize="small"
            color="error"
          />
        </>
      );
    } else if (capacity > 50) {
      return (
        <PriorityHighIcon
          fontSize="small"
          color="warning"
          sx={{
            position: 'absolute',
            left: 'calc(50% - 1px)',
          }}
        />
      );
    } else {
      return <></>;
    }
  }

  function getBackgroundByCapacity(capacity: number) {
    if (capacity > 80) {
      return theme.palette.error.opaque;
    } else if (capacity > 50) {
      return theme.palette.warning.opaque;
    } else {
      return theme.palette.primary.opaque;
    }
  }

  function getColorByCapacity(capacity: number) {
    if (capacity > 80) {
      return theme.palette.error.main;
    } else if (capacity > 50) {
      return theme.palette.warning.main;
    } else {
      return theme.palette.primary.main;
    }
  }
  return (
    <Box
      sx={{
        width: '100px',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '50px',
        }}
      >
        <CircularProgress
          sx={{ color: getColorByCapacity(capacityPercentage), marginLeft: '18px' }}
          size="30px"
          thickness={4.5}
          variant="determinate"
          value={capacityPercentage}
        />
        <Box
          style={{
            position: 'absolute',
            width: '24px',
            height: '24px',
            top: 'calc(50% - 12px)',
            padding: 'none !important',
            left: 'calc(50% - 12px)',
            background: 'transparent',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {getIconByCapacity(capacityPercentage)}
        </Box>
      </Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'end',
          width: '45px',
        }}
      >
        <Box>
          <HelpOutlineIcon fontSize="small" color="disabled" />
        </Box>
        <Box
          sx={{
            color: getColorByCapacity(capacityPercentage),
            background: getBackgroundByCapacity(capacityPercentage),
            fontSize: '16px',
            width: 'max-content',
            lineHeight: '16px',
            padding: '2px',
            borderRadius: '4px',
            boxSizing: 'border-box',
          }}
        >
          {capacityPercentage}
        </Box>
      </Box>
    </Box>
  );
};
