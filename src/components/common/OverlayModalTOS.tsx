import { Box, Typography, useTheme } from '@mui/material';
import { useEffect, useState } from 'react';
import { OpaqueButton } from './OpaqueButton';
import { TOS } from './TOS';

export const OverlayModalTOS: React.FC = () => {
  const theme = useTheme();

  const [showTosModal, setShowTosModal] = useState(true);
  const handleAcknowledge = () => {
    localStorage.setItem('acknowledgeTos', 'true');
    setShowTosModal(false);
  };
  const handleCancel = () => {
    window.open(`https://blend.capital`, '_self');
    window.close();
  };
  useEffect(() => {
    let returningUser = localStorage.getItem('acknowledgeTos');
    setShowTosModal(!returningUser);
  }, []);

  return (
    <>
      {showTosModal && (
        <Box
          sx={{
            width: '100%',
            height: '100%',
            top: '0',
            left: '0',
            position: 'fixed',
            justifyContent: 'top',
            alignItems: 'center',
            zIndex: '10',
            flexWrap: 'wrap',
            flexDirection: 'column',
            backgroundColor: 'rgba(25, 27, 31, 0.9)',
            overflowY: 'scroll',
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
            <Typography variant="h2" sx={{ margin: '12px' }}>
              Blend App Terms of Service
            </Typography>
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                flexDirection: 'column',
                overflowY: 'scroll',
                maxWidth: '500px',
                height: 'clamp(150px, 50vh, 400px)',
                padding: '12px',
                margin: '12px',
              }}
            >
              <TOS />
            </Box>
            <Box>
              <OpaqueButton
                onClick={handleCancel}
                palette={theme.palette.error}
                sx={{
                  margin: '6px',
                  padding: '6px',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Box sx={{ padding: '6px', display: 'flex', flexDirection: 'row', height: '30px' }}>
                  <Box sx={{ lineHeight: '100%' }}>Reject</Box>
                </Box>
              </OpaqueButton>
              <OpaqueButton
                onClick={handleAcknowledge}
                palette={theme.palette.primary}
                sx={{
                  margin: '6px',
                  padding: '6px',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Box sx={{ padding: '6px', display: 'flex', flexDirection: 'row', height: '30px' }}>
                  <Box sx={{ lineHeight: '100%' }}>Acknowledge</Box>
                </Box>
              </OpaqueButton>
            </Box>
          </Box>
        </Box>
      )}
    </>
  );
};
