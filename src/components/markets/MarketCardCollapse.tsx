import {
  BackstopPool,
  BackstopPoolEst,
  Pool,
  PoolEstimate,
  PoolOracle,
} from '@blend-capital/blend-sdk';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Box, BoxProps, Typography, useTheme } from '@mui/material';
import { useSettings, ViewType } from '../../contexts';
import { toBalance, toCompactAddress, toPercentage } from '../../utils/formatter';
import { Icon } from '../common/Icon';
import { LinkBox } from '../common/LinkBox';
import { OpaqueButton } from '../common/OpaqueButton';
import { Row } from '../common/Row';
import { Section, SectionSize } from '../common/Section';
import { StackedTextBox } from '../common/StackedTextBox';
import { TooltipText } from '../common/TooltipText';
import { PoolIcon } from '../pool/PoolIcon';
import { ReserveList } from './ReserveList';

export interface MarketCardCollapseProps extends BoxProps {
  pool: Pool;
  oracle: PoolOracle | undefined;
  poolEst: PoolEstimate | undefined;
  backstopPool: BackstopPool;
  backstopPoolEst: BackstopPoolEst;
}

export const MarketCardCollapse: React.FC<MarketCardCollapseProps> = ({
  pool,
  oracle,
  poolEst,
  backstopPool,
  backstopPoolEst,
  sx,
  ...props
}) => {
  const theme = useTheme();
  const { viewType } = useSettings();

  const estBackstopApr = poolEst
    ? ((pool.metadata.backstopRate / 1e7) * poolEst.avgBorrowApy * poolEst.totalBorrowed) /
      backstopPoolEst.totalSpotValue
    : undefined;
  return (
    <Box
      sx={{
        flexWrap: 'wrap',
        ...sx,
      }}
      {...props}
    >
      <Row>
        <OpaqueButton
          palette={theme.palette.accent}
          sx={{
            width: SectionSize.FULL,
            margin: '6px',
            padding: '6px',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: theme.palette.text.secondary,
            cursor: 'pointer',
          }}
          onClick={() =>
            window.open(
              `${process.env.NEXT_PUBLIC_STELLAR_EXPERT_URL}/contract/${pool.id}`,
              '_blank'
            )
          }
        >
          <PoolIcon
            name={pool.metadata.name}
            sx={{ margin: '6px', height: '30px', width: '30px' }}
          />
          <Box sx={{ padding: '6px', display: 'flex', flexDirection: 'row', height: '30px' }}>
            <Box sx={{ paddingRight: '12px', lineHeight: '100%' }}>{`Pool ${toCompactAddress(
              pool.id
            )}`}</Box>
            <Box>
              <OpenInNewIcon fontSize="inherit" />
            </Box>
          </Box>
        </OpaqueButton>
      </Row>
      <Row
        sx={{
          flex: 'flex',
          flexDirection: viewType === ViewType.REGULAR ? 'row' : 'column',
        }}
      >
        <OpaqueButton
          palette={theme.palette.accent}
          sx={{
            width: SectionSize.FULL,
            margin: '6px',
            padding: '6px',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: theme.palette.text.secondary,
            cursor: 'pointer',
          }}
          onClick={() =>
            window.open(
              `${process.env.NEXT_PUBLIC_STELLAR_EXPERT_URL}/contract/${pool.metadata.oracle}`,
              '_blank'
            )
          }
        >
          <Box sx={{ margin: '6px', height: '30px' }}>
            <Icon src={'/icons/pageicons/oracle_icon.svg'} alt="oracle-icon" isCircle={false} />
          </Box>
          <Box sx={{ padding: '6px', display: 'flex', flexDirection: 'row', height: '30px' }}>
            <Box sx={{ paddingRight: '12px', lineHeight: '100%' }}>{`Oracle ${toCompactAddress(
              pool.metadata.oracle
            )}`}</Box>
            <Box>
              <OpenInNewIcon fontSize="inherit" />
            </Box>
          </Box>
        </OpaqueButton>
        <OpaqueButton
          palette={theme.palette.accent}
          sx={{
            width: SectionSize.FULL,
            margin: '6px',
            padding: '6px',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: theme.palette.text.secondary,
            cursor: 'pointer',
          }}
          onClick={() => {
            if (pool.metadata.admin.charAt(0) === 'G') {
              window.open(
                `${process.env.NEXT_PUBLIC_STELLAR_EXPERT_URL}/account/${pool.metadata.admin}`,
                '_blank'
              );
            } else {
              window.open(
                `${process.env.NEXT_PUBLIC_STELLAR_EXPERT_URL}/contract/${pool.metadata.admin}`,
                '_blank'
              );
            }
          }}
        >
          <Box sx={{ margin: '6px', height: '30px', width: '30px' }}>
            <AdminPanelSettingsIcon sx={{ fontSize: 30 }} />
          </Box>
          <Box sx={{ padding: '6px', display: 'flex', flexDirection: 'row', height: '30px' }}>
            <Box sx={{ paddingRight: '12px', lineHeight: '100%' }}>{`Admin ${toCompactAddress(
              pool.metadata.admin
            )}`}</Box>
            <Box>
              <OpenInNewIcon fontSize="inherit" />
            </Box>
          </Box>
        </OpaqueButton>
      </Row>
      <Row
        sx={{
          flex: 'flex',
          flexDirection: viewType === ViewType.REGULAR ? 'row' : 'column',
        }}
      >
        <Section
          width={viewType === ViewType.REGULAR ? SectionSize.TILE : SectionSize.FULL}
          height={'54px'}
          type="alt"
          sx={{
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow:
              '0px 3px 1px -2px rgba(0, 0, 0, 0.2), 0px 2px 2px 0px rgba(0, 0, 0, 0.14), 0px 1px 5px 0px rgba(0, 0, 0, 0.12)',
          }}
        >
          <TooltipText
            tooltip={
              'The total number of supply and borrow positions that can be opened in this pool.'
            }
            width={'auto'}
            height={'30px'}
            textVariant="body1"
            sx={{ margin: '6px', justifyContent: 'center' }}
          >
            {'Max Positions'}
          </TooltipText>
          <Typography
            variant="body1"
            sx={{
              padding: '6px',
              display: 'flex',
              flexDirection: 'row',
            }}
          >
            {pool.metadata.maxPositions}
          </Typography>
        </Section>
        <Section
          width={viewType === ViewType.REGULAR ? SectionSize.TILE : SectionSize.FULL}
          type="alt"
          height={'54px'}
          sx={{
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow:
              '0px 3px 1px -2px rgba(0, 0, 0, 0.2), 0px 2px 2px 0px rgba(0, 0, 0, 0.14), 0px 1px 5px 0px rgba(0, 0, 0, 0.12)',
          }}
        >
          <TooltipText
            tooltip={'The minimum value of collateral required to borrow.'}
            width={'auto'}
            height={'30px'}
            textVariant="body1"
            sx={{ margin: '6px', justifyContent: 'center' }}
          >
            {'Min Collateral'}
          </TooltipText>
          <Typography
            variant="body1"
            height={'30px'}
            sx={{
              padding: '6px',
              display: 'flex',
              flexDirection: 'row',
            }}
          >
            {`$${toBalance(pool.metadata.minCollateral, oracle?.decimals)}`}
          </Typography>
        </Section>
      </Row>
      <Row>
        <LinkBox
          sx={{ width: '100%', marginRight: '12px' }}
          to={{ pathname: '/backstop', query: { poolId: pool.id } }}
        >
          <OpaqueButton
            palette={theme.palette.backstop}
            sx={{
              width: '100%',
              margin: '6px',
              padding: '6px',
              alignItems: 'center',
              color: theme.palette.backstop.main,
            }}
          >
            <Box
              sx={{
                flexWrap: 'flex',
                width: '100%',
                borderRadius: '5px',
                '&:hover': {
                  background: theme.palette.backstop.opaque,
                },
              }}
            >
              <Row sx={{ alignItems: 'center' }}>
                <Box
                  sx={{
                    margin: '6px',
                    padding: '6px',
                    width: '100%',
                    color: theme.palette.text.primary,
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ float: 'left' }}
                  >{`${name} Pool Backstop`}</Typography>
                </Box>
                <Box
                  sx={{
                    padding: '6px',
                    display: 'flex',
                    flexDirection: 'row',
                    height: '30px',
                    color: theme.palette.text.primary,
                  }}
                >
                  <ArrowForwardIcon fontSize="inherit" />
                </Box>
              </Row>
              <Row>
                <StackedTextBox
                  name="APR"
                  text={toPercentage(estBackstopApr)}
                  sx={{ width: '50%' }}
                />
                <StackedTextBox
                  name="Q4W"
                  text={toPercentage(backstopPoolEst.q4wPercentage)}
                  sx={{ width: '50%', color: theme.palette.backstop.main }}
                />
                <StackedTextBox
                  name="Take Rate"
                  text={toPercentage(pool.metadata.backstopRate / 1e7)}
                  sx={{ width: '50%', color: theme.palette.backstop.main }}
                />
              </Row>
            </Box>
          </OpaqueButton>
        </LinkBox>
      </Row>
      <ReserveList pool={pool} />
    </Box>
  );
};
