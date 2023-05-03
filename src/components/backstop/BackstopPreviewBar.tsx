import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Box, useTheme } from '@mui/material';
import { useSettings, ViewType } from '../../contexts';
import { useStore } from '../../store/store';
import { toBalance, toPercentage } from '../../utils/formatter';
import { CustomButton } from '../common/CustomButton';
import { Icon } from '../common/Icon';
import { LinkBox } from '../common/LinkBox';
import { PoolComponentProps } from '../common/PoolComponentProps';
import { Row } from '../common/Row';
import { Section, SectionSize } from '../common/Section';
import { StackedText } from '../common/StackedText';

export const BackstopPreviewBar: React.FC<PoolComponentProps> = ({ poolId }) => {
  const { viewType } = useSettings();
  const theme = useTheme();

  const poolEst = useStore((state) => state.pool_est.get(poolId));
  const backstopTokenToBase = useStore((state) => state.backstopTokenPrice);
  const backstopPoolBalance = useStore((state) => state.poolBackstopBalance.get(poolId));
  const userBackstopBalance = useStore((state) => state.shares.get(poolId));

  const tokenToBase = Number(backstopTokenToBase) / 1e7;
  const estBackstopSize = backstopPoolBalance
    ? (Number(backstopPoolBalance.tokens) / 1e7) * tokenToBase
    : undefined;
  const estBackstopApy =
    poolEst && estBackstopSize ? poolEst.total_backstop_take_base / estBackstopSize : undefined;
  const poolQ4W = backstopPoolBalance
    ? Number(backstopPoolBalance.q4w) / Number(backstopPoolBalance.shares)
    : undefined;
  const shareRate = backstopPoolBalance
    ? Number(backstopPoolBalance.tokens) / Number(backstopPoolBalance.shares)
    : 1;
  const userBalance = userBackstopBalance
    ? (Number(userBackstopBalance) / 1e7) * shareRate
    : undefined;

  return (
    <Row>
      {viewType === ViewType.REGULAR && (
        <Section width={SectionSize.FULL} sx={{ display: 'flex', flexWrap: 'wrap' }}>
          <LinkBox
            sx={{ width: '40%' }}
            to={{ pathname: '/backstop-q4w', query: { poolId: 'poolId' } }}
          >
            <CustomButton
              sx={{
                width: '100%',
                margin: '6px',
                padding: '12px',
                color: theme.palette.text.primary,
                backgroundColor: theme.palette.background.default,
                '&:hover': {
                  color: theme.palette.backstop.main,
                },
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                <Icon
                  src={'/icons/dashboard/emissions_icon.svg'}
                  alt={`emissions icon`}
                  sx={{ marginRight: '12px' }}
                />
                <StackedText
                  title="Balance"
                  titleColor="inherit"
                  text={`$${toBalance(userBalance)}`}
                  textColor="inherit"
                  type="large"
                />
              </Box>
              <ArrowForwardIcon fontSize="inherit" />
            </CustomButton>
          </LinkBox>
          <Box
            sx={{
              width: '60%',
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-around',
              alignItems: 'center',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <StackedText
                title="Backstop Size"
                titleColor="inherit"
                text={`$${toBalance(estBackstopSize)}`}
                textColor="inherit"
                type="large"
              />
              <Icon
                src={'/icons/dashboard/bkstp_size.svg'}
                alt={`backstop size icon`}
                sx={{ marginLeft: '12px' }}
              />
            </Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <StackedText
                title="Backstop Q4W"
                titleColor="inherit"
                text={toPercentage(estBackstopApy)}
                textColor="inherit"
                type="large"
              />
              <Icon
                src={'/icons/dashboard/bkstp_queue.svg'}
                alt={`backstop queue icon`}
                isCircle={false}
                sx={{ marginLeft: '12px' }}
              />
            </Box>
          </Box>
        </Section>
      )}
      {viewType !== ViewType.REGULAR && (
        <Section width={SectionSize.FULL} sx={{ display: 'flex', flexWrap: 'wrap' }}>
          <LinkBox
            sx={{ width: '100%', margin: '6px' }}
            to={{ pathname: '/backstop-q4w', query: { poolId: 'poolId' } }}
          >
            <CustomButton
              sx={{
                width: '100%',
                padding: '12px',
                color: theme.palette.text.primary,
                backgroundColor: theme.palette.background.default,
                '&:hover': {
                  color: theme.palette.backstop.main,
                },
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                <Icon
                  src={'/icons/dashboard/emissions_icon.svg'}
                  alt={`emissions icon`}
                  sx={{ marginRight: '12px' }}
                />
                <StackedText
                  title="Claimable earnings"
                  titleColor="inherit"
                  text="$888.888k"
                  textColor="inherit"
                  type="large"
                />
              </Box>
              <ArrowForwardIcon fontSize="inherit" />
            </CustomButton>
          </LinkBox>
          <Box
            sx={{
              width: '100%',
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-around',
              alignItems: 'center',
              marginTop: '12px',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <StackedText
                title="Backstop Size"
                titleColor="inherit"
                text="$888.888M"
                textColor="inherit"
                type="large"
              />
              <Icon
                src={'/icons/dashboard/bkstp_size.svg'}
                alt={`backstop size icon`}
                sx={{ marginLeft: '12px' }}
              />
            </Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <StackedText
                title="Backstop Q4W"
                titleColor="inherit"
                text="28.888%"
                textColor="inherit"
                type="large"
              />
              <Icon
                src={'/icons/dashboard/bkstp_queue.svg'}
                alt={`backstop queue icon`}
                isCircle={false}
                sx={{ marginLeft: '12px' }}
              />
            </Box>
          </Box>
        </Section>
      )}
    </Row>
  );
};
