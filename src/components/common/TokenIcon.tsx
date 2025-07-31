import React from 'react';

import { Theme } from '@emotion/react';
import { SxProps } from '@mui/material';
import { useTokenMetadata } from '../../hooks/api';
import { toCompactAddress } from '../../utils/formatter';
import { Icon } from './Icon';
import { LetterIcon } from './LetterIcon';

export interface TokenIconProps {
  assetId: string;
  height?: string;
  width?: string;
  sx?: SxProps<Theme> | undefined;
}
export const TokenIcon: React.FC<TokenIconProps> = ({ assetId, ...props }) => {
  const { data: stellarTokenMetadata } = useTokenMetadata(assetId);
  const symbol = stellarTokenMetadata?.symbol || toCompactAddress(assetId);

  if (stellarTokenMetadata?.image) {
    return <Icon src={stellarTokenMetadata.image} alt={symbol} {...props} />;
  } else {
    // return circle with capitalized first letter of the symbol
    return <LetterIcon text={symbol.charAt(0).toUpperCase()} {...props} />;
  }
};
