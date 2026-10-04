import { Box, BoxProps, Typography } from '@mui/material';
import { useSettings } from '../../contexts';
import { Row } from '../common/Row';
import { VersionTag } from '../common/VersionTag';
import { PoolIcon } from './PoolIcon';
import { Version } from '../../utils/version';

export interface TrackedPoolProps extends BoxProps {
  name: string;
  id: string;
  version: Version;
}

export const TrackedPool: React.FC<TrackedPoolProps> = ({ name, id, version, sx, ...props }) => {
  const { isV2Enabled } = useSettings();
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        borderRadius: '5px',
        padding: '12px',
        ...sx,
      }}
      {...props}
    >
      <PoolIcon
        name={name}
        poolAddress={id}
        sx={{ height: '30px', width: '30px', borderRadius: '50%' }}
      />
      <Row sx={{ flexDirection: 'column' }}>
        <Row sx={{ justifyContent: 'flex-start' }}>
          <Typography variant="h3" sx={{ marginLeft: '6px' }}>
            {`${name} Pool`}
          </Typography>
          {isV2Enabled && <VersionTag version={version} sx={{ marginLeft: '6px' }} />}
        </Row>
        <Typography variant="h3" sx={{ marginLeft: '6px', wordBreak: 'break-word' }}>
          {`${id}`}
        </Typography>
      </Row>
    </Box>
  );
};
