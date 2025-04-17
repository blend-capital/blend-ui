import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Box, Typography, useTheme } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import { OpaqueButton } from './OpaqueButton';

export interface OverlayModalTextProps {
  message: string;
  allowReturn: boolean;
  handleCloseOverlay: () => void;
}

export const OverlayModalText: React.FC<OverlayModalTextProps> = ({
  message,
  allowReturn,
  handleCloseOverlay,
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        top: '0',
        left: '0',
        display: 'flex',
        position: 'fixed',
        justifyContent: 'top',
        alignItems: 'center',
        zIndex: '10',
        flexWrap: 'wrap',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          flexDirection: 'column',
          marginTop: '18vh',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress size={70} sx={{ color: theme.palette.primary.main }} />
        <Typography variant="h2" sx={{ margin: '12px', textAlign: 'center' }}>
          {message}
        </Typography>
        {allowReturn && (
          <OpaqueButton
            onClick={handleCloseOverlay}
            palette={theme.palette.primary}
            sx={{
              margin: '6px',
              padding: '6px',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Box sx={{ padding: '6px', display: 'flex', flexDirection: 'row', height: '30px' }}>
              <Box sx={{ paddingRight: '12px', lineHeight: '100%' }}>Return</Box>
              <Box>
                <ArrowForwardIcon fontSize="inherit" />
              </Box>
            </Box>
          </OpaqueButton>
        )}
      </Box>
    </Box>
  );
};
