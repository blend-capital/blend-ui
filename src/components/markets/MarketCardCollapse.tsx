import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Box, BoxProps, Typography, useTheme } from '@mui/material';
import { Icon } from '../common/Icon';
import { LinkBox } from '../common/LinkBox';
import { OpaqueButton } from '../common/OpaqueButton';
import { Row } from '../common/Row';
import { StackedTextBox } from '../common/StackedTextBox';
import { MarketsList } from './MarketsList';

export interface MarketCardCollapseProps extends BoxProps {
  name: string;
}

export const MarketCardCollapse: React.FC<MarketCardCollapseProps> = ({ name, sx, ...props }) => {
  const theme = useTheme();

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
            width: '100%',
            margin: '6px',
            padding: '6px',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: theme.palette.text.secondary,
          }}
        >
          <Box sx={{ margin: '6px', height: '30px' }}>
            <Icon src={'/icons/pageicons/oracle_icon.svg'} alt="oracle-icon" isCircle={false} />
          </Box>
          <Box sx={{ padding: '6px', display: 'flex', flexDirection: 'row', height: '30px' }}>
            <Box sx={{ paddingRight: '12px', lineHeight: '100%' }}>Oracle</Box>
            <Box>
              <ArrowForwardIcon fontSize="inherit" />
            </Box>
          </Box>
        </OpaqueButton>
      </Row>
      <Row>
        <LinkBox
          sx={{ width: '100%', marginRight: '12px' }}
          to={{ pathname: '/backstop', query: { poolId: 'poolId' } }}
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
                <StackedTextBox name="Backstop APR" sx={{ width: '50%' }}></StackedTextBox>
                <StackedTextBox
                  name="Q4W"
                  sx={{ width: '50%', color: theme.palette.backstop.main }}
                ></StackedTextBox>
              </Row>
            </Box>
          </OpaqueButton>
        </LinkBox>
      </Row>
      <MarketsList />
    </Box>
  );
};