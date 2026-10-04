import { FixedMath } from '@blend-capital/blend-sdk';
import { Box, Typography, useTheme } from '@mui/material';
import { useBackstop, useBackstopPool, useBackstopPoolUser, usePoolMeta } from '../../hooks/api';
import { PoolComponentProps } from '../common/PoolComponentProps';
import { Row } from '../common/Row';
import { Section, SectionSize } from '../common/Section';
import { BackstopQueueItem } from './BackstopQueueItem';
import { isV2Contracts } from '../../utils/version';

export const BackstopQueueMod: React.FC<PoolComponentProps> = ({ poolId }) => {
  const theme = useTheme();

  const { data: poolMeta } = usePoolMeta(poolId);
  const { data: backstop } = useBackstop(poolMeta?.version);
  const { data: backstopPoolData } = useBackstopPool(poolMeta);
  const { data: backstopUserData } = useBackstopPoolUser(poolMeta);

  if (
    poolMeta === undefined ||
    backstop === undefined ||
    backstopUserData === undefined ||
    backstopPoolData === undefined ||
    (backstopUserData.balance.totalQ4W == BigInt(0) &&
      backstopUserData.balance.unlockedQ4W == BigInt(0))
  ) {
    return <></>;
  }

  const sharesToTokens =
    Number(backstopPoolData.poolBalance.tokens) / Number(backstopPoolData.poolBalance.shares);

  const totalQ4WEntries = backstopUserData.balance.q4w.length;

  return (
    <Row>
      <Section width={SectionSize.FULL} sx={{ display: 'flex', flexDirection: 'column' }}>
        <Row>
          <Box
            sx={{
              margin: '6px',
              padding: '6px',
              width: '100%',
              alignItems: 'center',
              backgroundColor: theme.palette.background.default,
              borderRadius: '5px',
            }}
          >
            <Typography sx={{ padding: '6px' }}>Queued for withdrawal (Q4W)</Typography>
          </Box>
        </Row>
        {backstopUserData.balance.unlockedQ4W != BigInt(0) && (
          <BackstopQueueItem
            key={0}
            version={poolMeta.version}
            poolId={poolId}
            q4w={{ exp: BigInt(0), amount: backstopUserData.balance.unlockedQ4W }}
            inTokens={FixedMath.toFloat(backstopUserData.balance.unlockedQ4W) * sharesToTokens}
            canUnqueue={false}
          />
        )}
        {backstopUserData.balance.q4w
          .sort((a, b) => Number(a.exp) - Number(b.exp))
          .map((q4w, index) => {
            let canUnqueue = false;
            if (isV2Contracts(poolMeta.version)) {
              // V2 unqueues from the most recently queued entry
              canUnqueue = totalQ4WEntries - 1 === index;
            } else {
              // V1 unqueues from the oldest entry (which can be unlocked)
              canUnqueue = backstopUserData.balance.unlockedQ4W === BigInt(0) && index === 0;
            }
            return (
              <BackstopQueueItem
                key={Number(q4w.exp)}
                version={poolMeta.version}
                poolId={poolId}
                q4w={q4w}
                inTokens={FixedMath.toFloat(q4w.amount) * sharesToTokens}
                canUnqueue={canUnqueue}
              />
            );
          })}
      </Section>
    </Row>
  );
};
