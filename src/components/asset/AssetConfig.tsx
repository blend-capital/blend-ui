import { I128MAX, ReserveConfigV2 } from '@blend-capital/blend-sdk';
import { Box, Typography, useTheme } from '@mui/material';
import { usePool, usePoolMeta, usePoolOracle } from '../../hooks/api';
import { toBalance } from '../../utils/formatter';
import { ReserveComponentProps } from '../common/ReserveComponentProps';
import { Row } from '../common/Row';
import { Section, SectionSize } from '../common/Section';
import { Skeleton } from '../common/Skeleton';
import { StackedText } from '../common/StackedText';
import { ReactivityRing } from './AssetReactivityRing';

export const AssetConfig: React.FC<ReserveComponentProps> = ({ poolId, assetId }) => {
  const theme = useTheme();
  const { data: poolMeta } = usePoolMeta(poolId);
  const { data: pool } = usePool(poolMeta);
  const { data: poolOracle } = usePoolOracle(pool);
  const oraclePrice = poolOracle?.getPriceFloat(assetId);
  const reserve = pool?.reserves.get(assetId);

  if (!pool || !reserve || !oraclePrice) {
    return <Skeleton />;
  }

  let collateralCap = 'None';
  if (reserve.config instanceof ReserveConfigV2) {
    collateralCap =
      reserve.config.collateral_cap === I128MAX
        ? 'None'
        : toBalance(reserve.config.collateral_cap, reserve.config.decimals);
  }

  return (
    <Section
      width={SectionSize.FULL}
      sx={{ margin: '6px', padding: '6px', display: 'flex', flexDirection: 'column' }}
    >
      <Row sx={{ margin: '6px', paddingLeft: '6px' }}>
        <Typography
          sx={{
            display: 'flex',
            alignItems: 'center',
          }}
          color={theme.palette.text.primary}
        >
          Reserve Configuration
        </Typography>
      </Row>
      <Row
        sx={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'flex-start',
          padding: '12px',
        }}
      >
        <ReactivityRing
          reactivity={reserve.config.reactivity}
          sx={{ marginRight: '6px', flex: 1 }}
        />
        <StackedText
          title={'Reserve Index'}
          text={reserve.config.index.toString()}
          sx={{ flex: 1 }}
        />
      </Row>

      <Row
        sx={{
          display: 'flex',
          flexDirection: 'row',
          padding: '12px',
          justifyContent: 'flex-start',
        }}
      >
        <StackedText
          title={'Emission Indexes'}
          text={
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'row',
              }}
            >
              <Typography>Supply</Typography>
              <Typography
                color={theme.palette.lend.main}
                sx={{
                  backgroundColor: theme.palette.lend.opaque,
                  borderRadius: '5px',
                  padding: '2px 6px',
                  margin: '0px 6px',
                }}
              >
                {reserve.getBTokenEmissionIndex().toString()}
              </Typography>

              <Typography>Borrow</Typography>
              <Typography
                color={theme.palette.borrow.main}
                sx={{
                  backgroundColor: theme.palette.borrow.opaque,
                  borderRadius: '5px',
                  padding: '2px 6px',
                  margin: '0px 6px',
                }}
              >
                {reserve.getDTokenEmissionIndex().toString()}
              </Typography>
            </Box>
          }
          tooltip="Emission Indexes are used for claiming pool emissions"
          sx={{ marginRight: '6px', flex: 1 }}
        />
        <StackedText title={'Collateral Cap'} text={collateralCap} sx={{ flex: 1 }} />
      </Row>
    </Section>
  );
};
