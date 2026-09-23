import { useEffect } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop, Path, G } from 'react-native-svg';
import Animated, { Easing, useSharedValue, useAnimatedProps, withTiming, useAnimatedStyle, withDelay } from 'react-native-reanimated';
import { makeStyles, useTheme } from '@/src/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
export default function ScoreRing({ score }: { score: number | null }) {
  const s = useStyles(); const { colors: c } = useTheme();
  const progress = useSharedValue(0); const glow = useSharedValue(0);
  useEffect(() => { progress.value = withTiming((score || 0) / 100, { duration: 1800, easing: Easing.bezier(.2, .8, .2, 1) }); glow.value = withDelay(1300, withTiming(1, { duration: 1100 })); }, [score, progress, glow]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: 502.65 * (1 - progress.value) }));
  const gs = useAnimatedStyle(() => ({ opacity: glow.value * .6, transform: [{ scale: .85 + glow.value * .15 }] }));
  const fill = score === null || score >= 80 ? c.success : score >= 50 ? c.warning : c.error;
  return <View testID="daily-score-ring" style={s.wrap}>
    <Animated.View style={[s.glow, gs]} />
    <Svg width={188} height={188} viewBox="0 0 188 188">
      <Defs><LinearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={fill} /><Stop offset="1" stopColor={c.brandPrimary} /></LinearGradient></Defs>
      <Circle cx={94} cy={94} r={80} stroke={c.surfaceSecondary} strokeWidth={11} fill="none" opacity={.6} />
      <G transform="rotate(-90 94 94)"><AnimatedCircle cx={94} cy={94} r={80} stroke="url(#ring)" strokeWidth={11} fill="none" strokeDasharray="502.65" animatedProps={props} strokeLinecap="round" /></G>
      <Path d="M72 132 Q84 124 95 132 T118 131" stroke={c.borderStrong} strokeWidth={1.5} fill="none" />
    </Svg>
    <View style={s.center}><Text testID="daily-score-value" style={s.value}>{score ?? '—'}</Text><Text style={s.label}>{score === null ? 'İLK ADIMIN' : '/ 100'}</Text></View>
  </View>;
}
const useStyles = makeStyles(c => ({ wrap: { width: 188, height: 188, alignItems: 'center', justifyContent: 'center' }, glow: { position: 'absolute', width: 145, height: 145, borderRadius: 80, backgroundColor: c.glow }, center: { position: 'absolute', alignItems: 'center', top: 47 }, value: { fontSize: 59, fontWeight: '500', letterSpacing: -3, color: c.onSurface }, label: { fontSize: 10, letterSpacing: 1.4, color: c.onSurfaceTertiary, marginTop: 1 } }));