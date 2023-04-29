import { Box, BoxProps, Typography } from '@mui/material';
import { TokenIcon } from '../common/TokenIcon';

export interface LendHeaderProps extends BoxProps {
  name: string;
}

export const LendHeader: React.FC<LendHeaderProps> = ({ name, sx, ...props }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        borderRadius: '5px',
        paddingLeft: '6px',
        ...sx,
      }}
      {...props}
    >
      <TokenIcon symbol={name} sx={{ height: '30px', width: '30px' }} />
      <Typography variant="h3" sx={{ marginLeft: '12px' }}>
        {`Lend ${name}`}
      </Typography>
    </Box>
  );
};