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
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex', width: '66px' }}>
      <CircularProgress
        sx={{ color: theme.palette.primary.main, marginLeft: '18px' }}
        size="30px"
        thickness={4.5}
        variant="determinate"
        value={borrow_capacity_fill}
      />
    </Box>
  );
};
