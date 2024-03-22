import { Icon as MuiIcon, IconProps as MuiIconProps } from '@mui/material';
import stellarDefaultIcon from '../../../public/icons/tokens/stellar.svg';
import theme from '../../theme';
export interface LetterIconProps extends MuiIconProps {
  height?: string;
  width?: string;
  isCircle?: boolean;
  text: string;
}

export const LetterIcon: React.FC<LetterIconProps> = ({
  height,
  width,
  isCircle,
  text,
  sx,
  ...props
}) => {
  const resolvedHeight = height != undefined ? height : '30px';
  const resolvedWidth = width != undefined ? width : '30px';
  const resolvedIsCircle = isCircle == undefined ? true : isCircle;
  return (
    <MuiIcon
      sx={{
        borderRadius: resolvedIsCircle ? '50%' : '5px',
        height: resolvedHeight,
        width: resolvedWidth,
        backgroundImage: `url(${stellarDefaultIcon.src})`,
        color: theme.palette.primary.main,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: '1.2rem',
        fontWeight: 'bolder',
        ...sx,
      }}
      {...props}
    >
      {text}
    </MuiIcon>
  );
};
