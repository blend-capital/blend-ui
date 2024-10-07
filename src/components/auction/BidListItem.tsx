import { Reserve } from '@blend-capital/blend-sdk';
import { Box, BoxProps, Typography, useTheme } from '@mui/material';
import { useSettings, ViewType } from '../../contexts';
import { toBalance } from '../../utils/formatter';
import { Icon } from '../common/Icon';
import { TokenHeader } from '../common/TokenHeader';

export interface BidItemProps extends BoxProps {
  reserve: Reserve | undefined;
  type: string;
  amount: bigint;
}
export const BidListItem: React.FC<BidItemProps> = ({ reserve, type, amount, ...props }) => {
  const theme = useTheme();
  const { viewType } = useSettings();

  const tableNum = viewType == ViewType.REGULAR ? 3 : 3;
  const tableWidth = `${(100 / tableNum).toFixed(2)}%`;
  return (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px',
        type: 'alt',
      }}
      {...props}
    >
      <Box
        sx={{
          width: tableWidth,
          display: 'flex',
          justifyContent: 'left',
        }}
      >
        {reserve ? (
          <TokenHeader reserve={reserve} />
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
            <Icon
              src={`/icons/tokens/blndusdclp.svg`}
              alt={`blndusdclp`}
              sx={{ height: '30px', width: '30px', marginRight: '12px' }}
            />

            <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
              BLND-USDC LP
            </Typography>
          </Box>
        )}
      </Box>
      <Box
        sx={{
          width: tableWidth,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Typography variant="body1">{type}</Typography>
      </Box>
      <Box
        sx={{
          width: tableWidth,
          display: 'flex',
          justifyContent: 'right',
        }}
      >
        <Typography variant="body1">{toBalance(amount, reserve?.config.decimals ?? 7)}</Typography>
      </Box>
    </Box>
  );
};
