import { Box, IconButton } from '@mui/material';
import Image from 'next/image';
import { ViewType, useSettings } from '../../contexts';
import { useBackstop } from '../../hooks/api';
import { Row } from '../common/Row';
import { Section, SectionSize } from '../common/Section';
import { SectionBase } from '../common/SectionBase';
import { NavItem } from './NavItem';
import { NavMenu } from './NavMenu';
import { WalletMenu } from './WalletMenu';
import { Version } from '../../utils/version';

export const NavBar = () => {
  const { viewType, lastPool } = useSettings();

  const { data: backstop } = useBackstop(Version.V1, lastPool == undefined);
  const poolId = (lastPool ? lastPool.id : backstop?.config?.rewardZone[0]) ?? '';

  return (
    <Row sx={{ height: '62px' }}>
      <SectionBase sx={{ width: '50px', margin: '6px' }}>
        <a href="https://blend.capital" target="_blank" rel="noreferrer">
          <IconButton sx={{ width: '79%', height: '79%', margin: '6px' }}>
            <Image src="/icons/blend_logo.svg" layout="fill" alt="Blend Logo" />
          </IconButton>
        </a>
      </SectionBase>
      {viewType === ViewType.REGULAR && (
        <Box
          sx={{
            width: '762px',
            height: '100%',
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          <Section width={SectionSize.LARGE}>
            <NavItem to={{ pathname: '/' }} title="Markets" sx={{ width: '33%' }} />
            <NavItem
              to={{ pathname: '/dashboard', query: { poolId } }}
              title="Dashboard"
              sx={{ width: '33%' }}
            />
            <NavItem
              to={{ pathname: '/backstop', query: { poolId } }}
              title="Backstop"
              sx={{ width: '33%' }}
            />
          </Section>
          <Section width={SectionSize.SMALL}>
            <WalletMenu />
          </Section>
        </Box>
      )}
      {viewType !== ViewType.REGULAR && (
        <SectionBase sx={{ width: 'calc(100% - 124px)', padding: '6px', margin: '6px' }}>
          <WalletMenu />
        </SectionBase>
      )}

      <SectionBase sx={{ width: '50px', margin: '6px' }}>
        <NavMenu />
      </SectionBase>
    </Row>
  );
};
