import { Box, BoxProps, Typography } from '@mui/material';

import { useStore } from '../../store/store';
import { toCompactAddress } from '../../utils/formatter';
import { TokenIcon } from './TokenIcon';

/// @dev TODO: Consider consolidation of icons / headers

export interface TokenHeaderProps extends BoxProps {
  id: string;
}

export const TokenHeader: React.FC<TokenHeaderProps> = ({ id, sx, ...props }) => {
  const assetStellarMetadata = useStore((state) => state.assetStellarMetadata);
  const tokenMetadata = assetStellarMetadata.get(id);
  const code = tokenMetadata?.code || id;
  const domain = tokenMetadata?.domain || tokenMetadata?.issuer;
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        borderRadius: '5px',
        ...sx,
      }}
      {...props}
    >
      <TokenIcon
        assetId={id}
        symbol={code}
        sx={{ width: '32px', height: '32px', marginRight: '6px' }}
      />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
        }}
      >
        <Typography variant="body1">{code}</Typography>
        <Typography variant="body2" color="text.secondary">
          {domain?.length === 56 ? toCompactAddress(domain) : domain}
        </Typography>
      </Box>
    </Box>
  );
};
