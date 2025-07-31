import { Reserve } from '@blend-capital/blend-sdk';
import { MenuItem, Typography } from '@mui/material';
import React from 'react';
import { useTokenMetadata } from '../../hooks/api';
import { toCompactAddress } from '../../utils/formatter';
import { TokenIcon } from './TokenIcon';

interface ReserveDropdownItemProps {
  key: React.Key;
  text: string;
  reserve: Reserve;
  onClick: (assetId: string) => void;
}

const ReserveDropdownItem: React.FC<ReserveDropdownItemProps> = ({
  key,
  text,
  reserve,
  onClick,
}) => {
  const { data: tokenMetadata } = useTokenMetadata(reserve.assetId);
  const symbol = tokenMetadata?.symbol ?? toCompactAddress(reserve.assetId);

  return (
    <MenuItem
      key={key}
      onClick={() => onClick(reserve.assetId)}
      sx={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        borderRadius: '5px',
        paddingLeft: '6px',
      }}
    >
      <TokenIcon assetId={reserve.assetId} sx={{ height: '30px', width: '30px' }} />
      <Typography variant="h3" sx={{ marginLeft: '12px' }}>
        {`${text} ${symbol}`}
      </Typography>
    </MenuItem>
  );
};

export default ReserveDropdownItem;
