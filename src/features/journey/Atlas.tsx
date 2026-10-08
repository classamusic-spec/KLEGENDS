import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useIsFocused } from 'expo-router';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { colors } from '@/design/tokens';
import { fonts } from '@/design/fonts';
import type { CampaignDefinition } from '@/domain/quests';
import { feedback } from '@/feedback';
import { Icon } from '@/ui/Icon';
import { useSvgId } from '@/ui/svgId';

const VB_W = 360;
const VB_H = 280;

/** Stylized, non-surveyed map of the lands of the Bible (decorative, not to scale). */
function AtlasArt() {
  const land = useSvgId('kl-atlas-land');
  const sea = useSvgId('kl-atlas-sea');
  const glow = useSvgId('kl-atlas-glow');
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <Defs>
        <LinearGradient id={land} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#1C2232" />
          <Stop offset="1" stopColor="#141823" />
        </LinearGradient>
        <LinearGradient id={sea} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#0E1A2C" />
          <Stop offset="1" stopColor="#0A1220" />
        </LinearGradient>
        <RadialGradient id={glow} cx="48%" cy="45%" rx="55%" ry="55%">
          <Stop offset="0" stopColor="#C6A46A" stopOpacity={0.16} />
          <Stop offset="1" stopColor="#C6A46A" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width={VB_W} height={VB_H} fill={`url(#${land})`} />
      {/* The Great Sea and its coast. */}
      <Path d="M0 0 H150 C146 30 140 62 136 92 C132 120 128 146 118 166 C100 186 70 196 44 200 C28 202 12 198 0 194 Z" fill={`url(#${sea})`} />
      <Path d="M150 0 C146 30 140 62 136 92 C132 120 128 146 118 166 C100 186 70 196 44 200 C28 202 12 198 0 194" fill="none" stroke="#A88A55" strokeOpacity={0.55} strokeWidth={1.1} />
      <Path d="M146 0 C142 30 136 62 132 92 C128 120 124 144 114 162 C97 181 68 191 44 195 C28 197 12 194 0 190" fill="none" stroke="#A88A55" strokeOpacity={0.2} strokeWidth={0.6} />
      {/* Red Sea gulfs. */}
      <Path d="M150 280 C140 258 128 236 118 214 C124 230 136 250 142 280 Z" fill={`url(#${sea})`} stroke="#A88A55" strokeOpacity={0.45} strokeWidth={0.8} />
      <Path d="M170 280 C176 262 184 244 192 226 C188 246 182 264 182 280 Z" fill={`url(#${sea})`} stroke="#A88A55" strokeOpacity={0.45} strokeWidth={0.8} />
      {/* Persian Gulf. */}
      <Path d="M360 168 C344 178 332 196 322 218 C334 214 350 206 360 200 Z" fill={`url(#${sea})`} stroke="#A88A55" strokeOpacity={0.45} strokeWidth={0.8} />
      {/* Rivers: Nile, Jordan, Euphrates and Tigris. */}
      <Path d="M44 200 C50 222 52 246 58 280" fill="none" stroke="#5E7FA8" strokeOpacity={0.6} strokeWidth={1.1} />
      <Path d="M30 199 C40 206 46 214 50 226 M58 200 C54 210 52 220 51 230" fill="none" stroke="#5E7FA8" strokeOpacity={0.35} strokeWidth={0.7} />
      <Path d="M168 92 C170 108 166 122 169 140" fill="none" stroke="#5E7FA8" strokeOpacity={0.7} strokeWidth={1} />
      <Path d="M262 0 C270 40 286 76 300 110 C312 140 320 160 332 186" fill="none" stroke="#5E7FA8" strokeOpacity={0.55} strokeWidth={1} />
      <Path d="M300 0 C306 36 318 76 330 110 C338 136 340 160 336 186" fill="none" stroke="#5E7FA8" strokeOpacity={0.4} strokeWidth={0.8} />
      <Ellipse cx={168} cy={88} rx={4} ry={6} fill="#14243A" stroke="#5E7FA8" strokeOpacity={0.7} strokeWidth={0.8} />
      <Ellipse cx={169} cy={150} rx={4.5} ry={11} fill="#14243A" stroke="#5E7FA8" strokeOpacity={0.7} strokeWidth={0.8} />
      {/* The way out of Egypt (dotted), drawn as a faint route. */}
      <Path d="M60 222 C90 236 118 226 140 238 C160 250 176 222 172 190 C170 172 168 160 166 150" fill="none" stroke="#E8CB8E" strokeOpacity={0.28} strokeWidth={1} strokeDasharray="2 4" />
      {/* Mountains. */}
      {(
        [
          [150, 248],
          [158, 241],
          [190, 112],
          [228, 60],
          [310, 132],
          [320, 124],
        ] as const
      ).map(([x, y], i) => (
        <Path key={i} d={`M${x - 6} ${y + 4} L${x} ${y - 5} L${x + 6} ${y + 4}`} fill="none" stroke="#8B8990" strokeOpacity={0.45} strokeWidth={0.8} />
      ))}
      <Rect width={VB_W} height={VB_H} fill={`url(#${glow})`} />
      {/* Labels. */}
      <G fontFamily={fonts.display} fill="#C6A46A" fillOpacity={0.55} fontSize={8} letterSpacing={2}>
        <SvgText x={44} y={92}>THE GREAT SEA</SvgText>
        <SvgText x={14} y={246}>EGYPT</SvgText>
        <SvgText x={136} y={272}>SINAI</SvgText>
        <SvgText x={142} y={176}>JUDAH</SvgText>
        <SvgText x={236} y={176}>BABYLON</SvgText>
        <SvgText x={296} y={84}>PERSIA</SvgText>
      </G>
      {/* Compass rose. */}
      <G transform="translate(334 28)" stroke="#C6A46A" strokeOpacity={0.6} fill="none" strokeWidth={0.8}>
        <Circle r={11} />
        <Path d="M0 -15 L3 0 L0 15 L-3 0 Z" fill="#C6A46A" fillOpacity={0.35} />
        <Path d="M-15 0 L0 3 L15 0 L0 -3 Z" />
      </G>
      {/* Frame. */}
      <Rect x={3} y={3} width={VB_W - 6} height={VB_H - 6} fill="none" stroke="#A88A55" strokeOpacity={0.6} strokeWidth={1} rx={6} />
      <Rect x={7} y={7} width={VB_W - 14} height={VB_H - 14} fill="none" stroke="#A88A55" strokeOpacity={0.25} strokeWidth={0.6} rx={4} />
    </Svg>
  );
}

function Pulse({ active, reducedMotion }: { active: boolean; reducedMotion: boolean }) {
  // Tabs stay mounted: the pulse only runs while the Journey is on screen.
  const focused = useIsFocused();
  const running = active && focused && !reducedMotion;
  const t = useSharedValue(0);
  useEffect(() => {
    if (!running) {
      cancelAnimation(t);
      t.set(0);
      return;
    }
    t.set(withRepeat(withTiming(1, { duration: 1800 }), -1, false));
  }, [running, t]);
  const style = useAnimatedStyle(() => ({ opacity: active ? 0.6 * (1 - t.get()) : 0, transform: [{ scale: 1 + t.get() * 0.9 }] }));
  return <Animated.View pointerEvents="none" style={[styles.pulse, style]} />;
}

export interface AtlasProps {
  readonly campaigns: readonly CampaignDefinition[];
  readonly selectedId: string;
  readonly onSelect: (id: string) => void;
  readonly width: number;
  readonly reducedMotion: boolean;
}

/** The Ancient Atlas: campaigns placed on a stylized map of the biblical world. */
export function Atlas({ campaigns, selectedId, onSelect, width, reducedMotion }: AtlasProps) {
  const height = (width * VB_H) / VB_W;
  return (
    <View style={[styles.atlas, { width, height }]} testID="atlas">
      <AtlasArt />
      {campaigns.map((campaign) => {
        const available = campaign.availability === 'available';
        const selected = campaign.id === selectedId;
        const x = campaign.atlasPosition.x * width;
        const y = campaign.atlasPosition.y * height;
        return (
          <Pressable
            key={campaign.id}
            accessibilityRole="button"
            aria-selected={selected}
            accessibilityLabel={`${campaign.title}, ${campaign.region}. ${available ? 'Available' : 'In development'}.`}
            onPress={() => {
              feedback.select();
              onSelect(campaign.id);
            }}
            hitSlop={8}
            style={[styles.marker, { left: x - 22, top: y - 22 }]}
            testID={`atlas-${campaign.id}`}
          >
            <Pulse active={available && selected} reducedMotion={reducedMotion} />
            <View style={[styles.medallion, available ? styles.medallionOn : styles.medallionOff, selected ? styles.medallionSelected : null]}>
              <Icon name={available ? 'crown' : 'lock'} size={16} color={available ? colors.goldBright : colors.textMuted} strokeWidth={1.6} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  atlas: { borderRadius: 12, overflow: 'hidden', alignSelf: 'center', backgroundColor: '#141823' },
  marker: { position: 'absolute', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  medallion: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  medallionOn: { backgroundColor: '#1B1710', borderColor: colors.gold },
  medallionOff: { backgroundColor: '#15171C', borderColor: '#4A4D56' },
  medallionSelected: { borderColor: colors.goldBright, boxShadow: '0px 0px 14px rgba(232, 203, 142, 0.55)' },
  pulse: { position: 'absolute', width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: colors.goldBright },
});
