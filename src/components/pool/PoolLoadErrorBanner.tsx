import WarningIcon from '@mui/icons-material/Warning';
import { Box, Typography, useTheme } from '@mui/material';
import { toCompactAddress } from '../../utils/formatter';

export interface PoolLoadErrorProps {
  poolId: string;
  poolName?: string;
}

export const PoolLoadError: React.FC<PoolLoadErrorProps> = ({ poolId, poolName }) => {
  const theme = useTheme();
  const displayName = poolName ? `${poolName} pool` : toCompactAddress(poolId);
  return (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        margin: '6px',
        padding: '12px',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingRight: '20px',
        borderRadius: '4px',
        color: theme.palette.warning.main,
        backgroundColor: theme.palette.warning.opaque,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
        <WarningIcon sx={{ marginRight: '6px' }} />
        <Typography variant="body2">
          {`${displayName} failed to load. Please check back later.`}
        </Typography>
      </Box>
    </Box>
  );
};
