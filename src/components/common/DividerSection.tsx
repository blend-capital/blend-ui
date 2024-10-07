import { Box } from '@mui/material';
import theme from '../../theme';

export const DividerSection: React.FC = () => {
  return (
    <Box
      sx={{
        background: theme.palette.background.default,
        height: '2px',
        margin: '12px',
      }}
    ></Box>
  );
};
