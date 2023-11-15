import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Box, BoxProps, IconButton, Typography } from '@mui/material';
import { useStore } from '../../store/store';
import { TOKEN_META } from '../../utils/token_display';
import { TokenIcon } from './TokenIcon';
/// @dev TODO: Consider consolidation of icons / headers

export interface TokenHeaderProps extends BoxProps {
  poolId: string;
  assetId: string;
  displayLink: boolean;
}

export const TokenHeader: React.FC<TokenHeaderProps> = ({
  assetId,
  poolId,
  displayLink,
  sx,
  ...props
}) => {
  const reserve = useStore((state) =>
    state.poolData.get(poolId)?.reserves.find((reserve) => {
      return reserve.assetId == assetId;
    })
  );
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (reserve && reserve.tokenMetadata.asset) {
      console.log('This working?');
      event.stopPropagation();
      if (reserve.tokenMetadata.asset.isNative()) {
        window.open(
          `https://stellar.expert/explorer/testnet/asset/${reserve.tokenMetadata.asset.code}`,
          '_blank',
          'noreferrer'
        );
      } else {
        window.open(
          `https://stellar.expert/explorer/testnet/asset/${reserve.tokenMetadata.asset.code}-${reserve.tokenMetadata.asset.issuer}`,
          '_blank',
          'noreferrer'
        );
      }
    }
  };
  // TODO: Find a better way to do this
  const code = TOKEN_META[assetId as keyof typeof TOKEN_META]?.code ?? 'unknown';
  const issuer = TOKEN_META[assetId as keyof typeof TOKEN_META]?.issuer ?? '';
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
      <TokenIcon symbol={code} sx={{ width: '32px', height: '32px', marginRight: '6px' }} />
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
          {issuer}
        </Typography>
      </Box>
      {displayLink && reserve?.tokenMetadata.asset ? (
        <IconButton
          sx={{
            width: '30px',
            height: '30px',
            justifyContent: 'center',
            margin: '6px',
          }}
          onClick={handleClick}
        >
          <OpenInNewIcon fontSize="inherit" />
        </IconButton>
      ) : (
        <></>
      )}
    </Box>
  );
};
