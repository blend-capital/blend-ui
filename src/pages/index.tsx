import { Version } from '@blend-capital/blend-sdk';
import { useTheme } from '@mui/material';
import type { NextPage } from 'next';
import { useEffect, useState } from 'react';
import { Divider } from '../components/common/Divider';
import { Row } from '../components/common/Row';
import { SectionBase } from '../components/common/SectionBase';
import { ToggleSlider } from '../components/common/ToggleSlider';
import { MarketsList } from '../components/markets/MarketsList';
import { useSettings } from '../contexts';

const Markets: NextPage = () => {
  const theme = useTheme();
  const { isV2Enabled, lastPool } = useSettings();

  const [version, setVersion] = useState<Version | undefined>(undefined);

  useEffect(() => {
    if (isV2Enabled && lastPool?.version) {
      setVersion(lastPool.version);
    } else {
      setVersion(Version.V2);
    }
  }, [isV2Enabled, lastPool]);

  return (
    <>
      <Row sx={{ alignItems: 'center' }}>
        <SectionBase type="alt" sx={{ margin: '6px', padding: '6px' }}>
          Markets
        </SectionBase>
        {isV2Enabled && version !== undefined && (
          <ToggleSlider
            options={[
              { optionName: Version.V1, palette: theme.palette.primary },
              { optionName: Version.V2, palette: theme.palette.backstop },
            ]}
            selected={version}
            changeState={setVersion}
            sx={{ height: '24px', width: '80px', marginRight: '6px' }}
          />
        )}
      </Row>
      <Divider />
      <MarketsList version={version} />
    </>
  );
};

export default Markets;
