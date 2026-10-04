import { Typography, TypographyProps, useTheme } from '@mui/material';
import { Version } from '../../utils/version';

export interface VersionTagProps extends TypographyProps {
  version: Version;
}

export const VersionTag: React.FC<VersionTagProps> = ({ version, sx, ...props }) => {
  const theme = useTheme();
  return (
    <Typography
      variant="body1"
      sx={{
        backgroundColor:
          version == Version.V1 ? theme.palette.primary.opaque : theme.palette.backstop.opaque,
        color: version == Version.V1 ? theme.palette.primary.main : theme.palette.backstop.main,
        borderRadius: '5px',
        paddingLeft: '6px',
        paddingRight: '6px',
        ...sx,
      }}
      {...props}
    >
      {version}
    </Typography>
  );
};
