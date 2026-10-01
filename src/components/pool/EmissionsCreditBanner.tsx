import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Typography, useTheme } from '@mui/material';
import { V2_1_EMISSIONS_NOTICE } from '../../utils/version';
import { Banner } from '../common/Banner';
import { SectionSize } from '../common/Section';

export const EmissionsCreditBanner = () => {
  const theme = useTheme();
  return (
    <Banner
      sx={{
        width: SectionSize.FULL,
        margin: '6px',
        padding: '12px',
        background: theme.palette.positive.opaque,
        color: theme.palette.positive.main,
      }}
    >
      <InfoOutlinedIcon sx={{ marginRight: '6px' }} />
      <Typography variant="body2">{V2_1_EMISSIONS_NOTICE}</Typography>
    </Banner>
  );
};
