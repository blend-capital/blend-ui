import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Typography, useTheme } from '@mui/material';
import { OpaqueButton } from '../common/OpaqueButton';
import { Row } from '../common/Row';
import { Section, SectionSize } from '../common/Section';

export const AllbridgeButton = () => {
  const theme = useTheme();

  return (
    <Row>
      <Section width={SectionSize.FULL}>
        <OpaqueButton
          palette={theme.palette.primary}
          sx={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}
          onClick={() => window.open('https://core.allbridge.io/', '_blank')}
        >
          <Typography>Bridge USDC Via Allbridge</Typography>
          <OpenInNewIcon fontSize="inherit" />
        </OpaqueButton>
      </Section>
    </Row>
  );
};
