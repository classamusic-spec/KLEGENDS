import { Canvas, Group, Image as SkiaImage, Path, Points, RadialGradient, Rect, Skia, vec, LinearGradient } from '@shopify/react-native-skia';
import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { PixelRatio, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useDerivedValue, useSharedValue, withDelay, withTiming, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '@/design/tokens';
import { easings } from '@/design/motion';
import { audio } from '@/feedback';
import { drawCrown, GOLD } from '@/graphics/art/emblems';
import { useFrameTime } from '@/graphics/fx/useFrameTime';
import { bakeImage } from '@/graphics/skia/bake';
import { rng } from '@/graphics/skia/draw';
import { useReducedMotion } from '@/state/settings';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { OrnamentDivider } from '@/ui/controls';

interface StageProps {
  readonly width: number;
  readonly height: number;
  readonly time: SharedValue<number>;
  readonly light: SharedValue<number>;
  readonly crownIn: SharedValue<number>;
  readonly crownY: number;
  readonly crownSize: number;
}

/** Light, rays, dust and the crown crest, drawn in one Skia canvas. */
function WelcomeStage({ width, height, time, light, crownIn, crownY, crownSize }: StageProps) {
  const cx = width / 2;
  const crown = useMemo(() => {
    const scale = Math.min(3, PixelRatio.get());
    const size = crownSize * 1.5;
    return bakeImage(size * scale, size * scale, (canvas) => {
      canvas.scale(scale, scale);
      drawCrown(canvas, [size / 2, size / 2], crownSize, GOLD, true);
    });
  }, [crownSize]);
  const rays = useMemo(() => {
    const b = Skia.PathBuilder.Make();
    const n = 18;
    const reach = Math.max(width, height);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const w = 0.045;
      b.moveTo(0, 0);
      b.lineTo(Math.cos(a - w) * reach, Math.sin(a - w) * reach);
      b.lineTo(Math.cos(a + w) * reach, Math.sin(a + w) * reach);
      b.close();
    }
    return b.build();
  }, [width, height]);
  const motes = useMemo(() => {
    const r = rng(23);
    return Array.from({ length: 40 }, () => ({ x: r.next() * width, y: r.next() * height, speed: 8 + r.next() * 18, sway: 6 + r.next() * 12, phase: r.next() * 6.28 }));
  }, [width, height]);

  const rayTransform = useDerivedValue(() => [{ translateX: cx }, { translateY: crownY }, { rotate: time.get() * 0.03 }]);
  const rayOpacity = useDerivedValue(() => light.get() * 0.5);
  const glowOpacity = useDerivedValue(() => light.get());
  const dust = useDerivedValue(() => {
    const t = time.get();
    return motes.map((m) => vec(m.x + Math.sin(t * 0.35 + m.phase) * m.sway, (((m.y - t * m.speed) % height) + height) % height));
  });
  const dustOpacity = useDerivedValue(() => light.get() * 0.8);
  const crownTransform = useDerivedValue(() => {
    const s = 0.9 + 0.1 * crownIn.get();
    const float = Math.sin(time.get() * 0.9) * 2.5;
    return [{ translateX: cx }, { translateY: crownY + float + (1 - crownIn.get()) * 14 }, { scale: s }, { translateX: -crownSize * 0.75 }, { translateY: -crownSize * 0.75 }];
  });
  const crownOpacity = useDerivedValue(() => crownIn.get());

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={['#06070A', '#0E1219', '#0B0D12', '#050608']} positions={[0, 0.4, 0.75, 1]} />
      </Rect>
      <Group opacity={rayOpacity} blendMode="plus">
        <Group transform={rayTransform}>
          <Path path={rays}>
            <RadialGradient c={vec(0, 0)} r={Math.max(width, height) * 0.7} colors={['rgba(255,214,150,0.22)', 'rgba(255,214,150,0.05)', 'rgba(255,214,150,0)']} positions={[0, 0.45, 1]} />
          </Path>
        </Group>
      </Group>
      <Group opacity={glowOpacity} blendMode="plus">
        <Rect x={0} y={0} width={width} height={height}>
          <RadialGradient c={vec(cx, crownY)} r={width * 0.75} colors={['rgba(232,203,142,0.30)', 'rgba(198,164,106,0.08)', 'rgba(198,164,106,0)']} positions={[0, 0.45, 1]} />
        </Rect>
      </Group>
      <Group opacity={dustOpacity} blendMode="plus">
        <Points points={dust} mode="points" color="rgba(255,226,170,0.5)" style="stroke" strokeWidth={2} strokeCap="round" />
      </Group>
      <Group transform={crownTransform} opacity={crownOpacity}>
        <SkiaImage image={crown} x={0} y={0} width={crownSize * 1.5} height={crownSize * 1.5} fit="fill" />
      </Group>
      <Rect x={0} y={0} width={width} height={height}>
        <RadialGradient c={vec(cx, height * 0.45)} r={Math.max(width, height) * 0.8} colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.75)']} positions={[0, 0.55, 1]} />
      </Rect>
    </Canvas>
  );
}

/**
 * The cinematic welcome: light rises over the crown crest, the title is
 * engraved in, and the way into the kingdom opens. Static under reduced motion.
 */
export function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const time = useFrameTime(!reducedMotion);
  const light = useSharedValue(reducedMotion ? 1 : 0);
  const crownIn = useSharedValue(reducedMotion ? 1 : 0);
  const titleIn = useSharedValue(reducedMotion ? 1 : 0);
  const restIn = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) {
      [light, crownIn, titleIn, restIn].forEach((v) => v.set(1));
      return;
    }
    light.set(withTiming(1, { duration: 1600, easing: easings.cinematic }));
    crownIn.set(withDelay(400, withTiming(1, { duration: 1300, easing: easings.cinematic })));
    titleIn.set(withDelay(1100, withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) })));
    restIn.set(withDelay(1900, withTiming(1, { duration: 800 })));
  }, [reducedMotion, light, crownIn, titleIn, restIn]);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleIn.get(),
    transform: [{ translateY: (1 - titleIn.get()) * 12 }, { scale: 1.06 - 0.06 * titleIn.get() }],
  }));
  const restStyle = useAnimatedStyle(() => ({ opacity: restIn.get(), transform: [{ translateY: (1 - restIn.get()) * 8 }] }));

  const crownSize = Math.min(width * 0.36, 150);
  const crownY = height * 0.32;

  const enter = () => {
    audio.play('stone_slide', { volume: 0.8 });
    router.replace('/hall');
  };

  return (
    <View style={styles.root} testID="welcome">
      <WelcomeStage width={width} height={height} time={time} light={light} crownIn={crownIn} crownY={crownY} crownSize={crownSize} />
      <View style={[styles.content, { top: crownY + crownSize * 0.62, paddingBottom: insets.bottom + spacing.xxl }]}>
        <Animated.Text style={[styles.title, titleStyle]} accessibilityRole="header" maxFontSizeMultiplier={1.2}>
          KINGDOM LEGENDS
        </Animated.Text>
        <Animated.View style={[styles.center, restStyle]}>
          <OrnamentDivider width={200} style={styles.divider} />
          <AppText variant="scriptureItalic" align="center" color={colors.parchment}>
            Discover the heroes of Scripture
          </AppText>
        </Animated.View>
        <View style={styles.spacer} />
        <Animated.View style={[styles.actions, restStyle]}>
          <Button label="Enter the Kingdom" trailingIcon="arrowRight" onPress={enter} sound="none" testID="welcome-enter" />
          <AppText variant="caption" align="center" color={colors.textMuted}>
            Milestone 1 prototype · demo content
          </AppText>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundDeep },
  content: { position: 'absolute', left: spacing.gutter, right: spacing.gutter, bottom: 0, alignItems: 'center' },
  title: {
    fontFamily: 'Cinzel_700Bold',
    fontSize: 34,
    lineHeight: 42,
    letterSpacing: 4,
    color: colors.goldBright,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 2 },
  },
  center: { alignItems: 'center' },
  divider: { marginVertical: spacing.md },
  spacer: { flex: 1 },
  actions: { alignSelf: 'stretch', gap: spacing.md, maxWidth: 420, width: '100%', marginHorizontal: 'auto' },
});
