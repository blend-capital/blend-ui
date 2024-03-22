import { IconProps as MuiIconProps } from '@mui/material';
import React from 'react';

import { useStore } from '../../store/store';
import { Icon } from './Icon';
import { LetterIcon } from './LetterIcon';

export interface TokenIconProps extends MuiIconProps {
  symbol: string;
  assetId?: string;
}
export const TokenIcon: React.FC<TokenIconProps> = ({ symbol, assetId, ...props }) => {
  const assetStellarMetadata = useStore((state) => state.assetStellarMetadata);
  if (assetId) {
    const tokenMetadata = assetStellarMetadata.get(assetId);

    if (tokenMetadata?.image) {
      return <Icon src={tokenMetadata.image} alt={`${tokenMetadata.code}`} {...props} />;
    } else {
      const code = tokenMetadata?.code || symbol;
      // return circle with capitalized first letter of the symbol
      return <LetterIcon text={code.charAt(0).toUpperCase()} {...props} />;
    }
  }
  return <Icon src={`/icons/tokens/${symbol.toLowerCase()}.svg`} alt={`${symbol}`} {...props} />;
};
