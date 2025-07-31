import { Box, SxProps, Theme } from '@mui/material';
import Image from 'next/image';

export interface IconProps {
  src: string;
  alt: string;
  height?: string;
  width?: string;
  isCircle?: boolean; // defaults to true
  sx?: SxProps<Theme>;
  onError?: (error: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

export const Icon: React.FC<IconProps> = ({
  src,
  alt,
  height = '30px',
  width = '30px',
  isCircle = true,
  sx,
  onError,
}) => {
  return (
    <Box
      sx={{
        borderRadius: isCircle ? '50%' : '5px',
        width,
        height,
        minWidth: width,
        minHeight: height,
        maxWidth: width,
        maxHeight: height,
        position: 'relative',
        overflow: 'hidden',
        display: 'inline-block',
        ...sx,
      }}
    >
      <Image src={src} alt={alt} fill={true} style={{ objectFit: 'cover' }} onError={onError} />
    </Box>
  );
};
