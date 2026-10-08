import type { BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, layout } from '@/design/tokens';
import { feedback } from '@/feedback';
import { AppText } from '@/ui/AppText';
import { Icon, type IconName } from '@/ui/Icon';

const TABS: Readonly<Record<string, { label: string; icon: IconName }>> = {
  hall: { label: 'Home', icon: 'home' },
  collection: { label: 'Collection', icon: 'collection' },
  journey: { label: 'Journey', icon: 'journey' },
  challenges: { label: 'Challenges', icon: 'challenges' },
  shop: { label: 'Shop', icon: 'shop' },
};

/**
 * The royal tab bar: engraved icons on obsidian, gold for the current
 * place. Labels are always shown so navigation never depends on icons.
 */
export function TabBar({ state, navigation, insets }: BottomTabBarProps) {
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 6) }]} accessibilityRole="tablist">
      <View style={styles.hairline} />
      {state.routes.map((route, index) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const focused = state.index === index;
        const color = focused ? colors.goldBright : colors.textMuted;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            feedback.select();
            navigation.navigate(route.name, route.params);
          }
        };
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            aria-selected={focused}
            accessibilityLabel={tab.label}
            onPress={onPress}
            style={({ pressed }) => [styles.item, pressed ? styles.pressed : null]}
            testID={`tab-${route.name}`}
          >
            <View style={[styles.indicator, focused ? styles.indicatorOn : null]} />
            <Icon name={tab.icon} size={23} color={color} strokeWidth={focused ? 1.8 : 1.5} />
            <AppText variant="caption" color={color} style={styles.label} numberOfLines={1}>
              {tab.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#0C0F14',
    paddingTop: 6,
    minHeight: layout.tabBarHeight,
  },
  hairline: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: colors.borderSubtle },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: layout.minTouch },
  pressed: { opacity: 0.7 },
  indicator: { width: 6, height: 6, transform: [{ rotate: '45deg' }], marginBottom: 1, backgroundColor: 'transparent' },
  indicatorOn: { backgroundColor: colors.gold },
  label: { fontSize: 10.5, letterSpacing: 0.3 },
});
