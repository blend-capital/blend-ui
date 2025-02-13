import BlockIcon from '@mui/icons-material/Block';
import CheckIcon from '@mui/icons-material/Check';
import { Box, BoxProps, Typography, useTheme } from '@mui/material';
import React from 'react';

export interface AssetStatusBoxProps extends BoxProps {
  type?: 'normal' | 'large' | undefined;
  titleColor?: string | undefined;
  status?: boolean | undefined;
}

export const AssetStatusBox: React.FC<AssetStatusBoxProps> = ({
  type,
  titleColor,
  status,
  ...props
}) => {
  const theme = useTheme();
  const textType = type ? type : 'normal';
  const textVariant = textType == 'large' ? 'h2' : 'h4';
  const muiTitleColor = titleColor ? titleColor : 'text.secondary';

  let poolStatus = 'Enabled';
  let statusTextColor = 'primary.main';
  let statusBackColor = 'primary.opaque';
  let statusIcon = <CheckIcon />;
  if (status !== undefined && !status) {
    poolStatus = 'Disabled';
    statusTextColor = 'error.main';
    statusBackColor = 'error.opaque';
    statusIcon = <BlockIcon />;
  }
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '6px',
        ...props.sx,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Typography variant={textVariant} color={theme.palette.text.primary}>
          {poolStatus}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'row' }}>
        <Box
          sx={{
            backgroundColor: statusBackColor,
            color: statusTextColor,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '30px',
            height: '30px',
            borderRadius: '100px',
            padding: '4px',
          }}
        >
          {statusIcon}
        </Box>
      </Box>
    </Box>
  );
};
