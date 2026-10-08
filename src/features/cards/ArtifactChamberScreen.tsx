import { useIsFocused, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { HeroCard } from './HeroCard';
import { catalog } from '@/content';
import { getPassage, passageText, TRANSLATION } from '@/content/scripture';
import { colors, radii, rarityMaterials, spacing } from '@/design/tokens';
import { CARD_CATEGORY_LABEL, standardEditionId, type CardId } from '@/domain/cards';
import { RARITY_LABEL } from '@/domain/rarity';
import { formatReference } from '@/domain/scripture';
import { audio, feedback } from '@/feedback';
import { describeServiceError } from '@/services/gameService';
import { gameService, useGame, useQuestProgress } from '@/state/game';
import { useReducedMotion } from '@/state/settings';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { IconButton, OrnamentDivider } from '@/ui/controls';
import { Icon } from '@/ui/Icon';
import { Panel } from '@/ui/Panel';
import { RarityBadge } from '@/ui/RarityBadge';
import { ScreenBackdrop } from '@/ui/Screen';
import { useSvgId } from '@/ui/svgId';

/** Warm chamber light pooled behind the artifact. */
function ChamberLight({ color }: { color: string }) {
  const id = useSvgId('kl-chamber');
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} aria-hidden>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="45%" rx="60%" ry="45%">
          <Stop offset="0" stopColor={color} stopOpacity={0.22} />
          <Stop offset="0.6" stopColor={color} stopOpacity={0.05} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

function QuestLink({ questId }: { questId: string }) {
  const router = useRouter();
  const quest = catalog.quest(questId);
  const progress = useQuestProgress(questId);
  if (!quest) return null;
  const done = progress?.status === 'completed';
  return (
    <Panel style={styles.panel}>
      <AppText variant="eyebrow">Live the Story</AppText>
      <AppText variant="displayS">{`${quest.chapterLabel}: ${quest.title}`}</AppText>
      <AppText variant="body">{quest.subtitle}</AppText>
      <Button
        label={done ? 'Review Chapter' : progress ? 'Continue Chapter' : 'Begin Chapter'}
        variant={done ? 'secondary' : 'primary'}
        size="md"
        trailingIcon="arrowRight"
        onPress={() => router.push({ pathname: '/quest/[questId]', params: { questId } })}
        testID="chamber-quest"
      />
    </Panel>
  );
}

export interface ArtifactChamberScreenProps {
  readonly cardId: CardId;
  /** Open with the story section in view. */
  readonly panel?: 'story';
}

/**
 * The Artifact Chamber: one card, large, to be turned in the light and
 * read. Owned cards show their story; undiscovered cards show only their
 * silhouette and where to find them.
 */
export function ArtifactChamberScreen({ cardId, panel }: ArtifactChamberScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const focused = useIsFocused();
  const reducedMotion = useReducedMotion();
  const card = catalog.card(cardId);
  const editionId = standardEditionId(cardId);
  const entry = useGame((db) => db.inventory[editionId], undefined);
  const [flipped, setFlipped] = useState(false);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);
  const scroll = useRef<ScrollView>(null);
  const scrolledToStory = useRef(false);
  // The live card pauses while it is scrolled out of view (saves battery).
  const [cardInView, setCardInView] = useState(true);
  const [storyY, setStoryY] = useState<number | null>(null);

  // Arriving from "View Biblical Story": bring the story into view, once.
  useEffect(() => {
    if (panel !== 'story' || storyY === null || scrolledToStory.current) return;
    const id = setTimeout(() => {
      scrolledToStory.current = true;
      scroll.current?.scrollTo({ y: Math.max(0, storyY - 24), animated: !reducedMotion });
    }, 450);
    return () => clearTimeout(id);
  }, [panel, storyY, reducedMotion]);

  if (!card) {
    return (
      <View style={[styles.root, styles.center]}>
        <ScreenBackdrop />
        <AppText variant="displayS">This card could not be found.</AppText>
        <Button label="Go Back" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  const owned = entry !== undefined;
  const material = rarityMaterials[card.rarity];
  const number = `No. ${String(card.collectorNumber).padStart(2, '0')}`;
  const verse = getPassage(card.keyVerse);
  const cardWidth = Math.min(width * 0.7, 320);

  const toggleFavorite = () => {
    if (!entry) return;
    feedback.select();
    setFavoriteError(null);
    gameService.setFavorite(editionId, !entry.favorite).catch((error: unknown) => setFavoriteError(describeServiceError(error)));
  };
  const flip = () => {
    audio.play('card_flip');
    setFlipped((f) => !f);
  };

  return (
    <View style={styles.root} testID="chamber">
      <ScreenBackdrop />
      {/* Fixed header: back and favorite stay reachable while reading. */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <IconButton icon="back" label="Back" onPress={() => router.back()} testID="chamber-back" />
        <View style={styles.headerText}>
          <AppText variant="eyebrow">Artifact Chamber</AppText>
          <AppText variant="caption" color={colors.textMuted}>{`${number} · Kingdom Discovery`}</AppText>
        </View>
        {owned ? (
          <IconButton icon="heart" label={entry.favorite ? 'Remove from favorites' : 'Add to favorites'} active={entry.favorite} onPress={toggleFavorite} testID="chamber-favorite" />
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <ScrollView
        ref={scroll}
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        scrollEventThrottle={100}
        onScroll={(e) => {
          const visible = e.nativeEvent.contentOffset.y < cardWidth * 1.2;
          if (visible !== cardInView) setCardInView(visible);
        }}
      >
        <View style={styles.stage}>
          <ChamberLight color={owned ? material.glow : '#8B8990'} />
          <HeroCard
            cardId={cardId}
            undiscovered={!owned}
            width={cardWidth}
            active={focused && cardInView}
            flipped={flipped}
            sensorTilt
            onPress={flip}
            accessibilityLabel={
              owned ? `${card.title}, ${card.epithet ?? ''}. ${RARITY_LABEL[card.rarity]} card${flipped ? ', showing its back' : ''}.` : `Undiscovered card, ${number}.`
            }
            accessibilityHint="Drag to turn it in the light. Double tap to flip it over."
            testID="chamber-card"
          />
          <View style={styles.stageControls}>
            <Button label={flipped ? 'Show Front' : 'Turn Over'} icon="rotate" variant="ghost" size="md" onPress={flip} sound="none" testID="chamber-flip" />
          </View>
          <AppText variant="caption" align="center" color={colors.textMuted}>
            Drag the card to turn it in the light
          </AppText>
        </View>

        {owned ? (
          <Animated.View entering={reducedMotion ? FadeIn : FadeInDown.duration(450)} style={styles.titleBlock}>
            <AppText variant="displayL" align="center" accessibilityRole="header">
              {card.title}
            </AppText>
            {card.epithet ? (
              <AppText variant="scriptureItalic" align="center" color={colors.parchment}>
                {card.epithet}
              </AppText>
            ) : null}
            <View style={styles.badges}>
              <RarityBadge rarity={card.rarity} />
              <AppText variant="caption">{`${CARD_CATEGORY_LABEL[card.category]} · ${formatReference(card.passage)}`}</AppText>
            </View>
          </Animated.View>
        ) : (
          <View style={styles.titleBlock}>
            <AppText variant="displayL" align="center" accessibilityRole="header">
              Undiscovered
            </AppText>
            <AppText variant="body" align="center">
              {`This ${RARITY_LABEL[card.rarity]} card has not been discovered yet. Cards are found in Discovery Packs and by completing Journey chapters.`}
            </AppText>
            <AppText variant="caption" align="center" color={colors.textMuted}>{`Look for it in ${formatReference(card.passage)}.`}</AppText>
          </View>
        )}

        {owned ? (
          <View onLayout={(e) => setStoryY(e.nativeEvent.layout.y)} style={styles.sections} testID="chamber-story">
            <Panel ornate style={styles.panel}>
              <AppText variant="eyebrow">The Story</AppText>
              <AppText variant="bodyL">{card.summary}</AppText>
              <AppText variant="caption" color={colors.textMuted}>
                Summary · draft awaiting editorial review
              </AppText>
              {verse ? (
                <View style={styles.verse} accessible accessibilityLabel={`${verse.label}. ${passageText(verse)}`}>
                  <OrnamentDivider style={styles.divider} />
                  <AppText variant="scripture" align="center" color={colors.parchment}>
                    {`“${passageText(verse)}”`}
                  </AppText>
                  <AppText variant="label" align="center" color={colors.gold}>{`${verse.label} · ${TRANSLATION.id}`}</AppText>
                </View>
              ) : null}
              <View style={styles.themes}>
                {card.themes.map((theme) => (
                  <View key={theme} style={styles.theme}>
                    <AppText variant="caption" color={colors.parchment}>
                      {theme}
                    </AppText>
                  </View>
                ))}
              </View>
            </Panel>

            {card.relatedQuestId ? <QuestLink questId={card.relatedQuestId} /> : null}

            <Panel style={styles.panel}>
              <AppText variant="eyebrow">Editions</AppText>
              <View style={styles.editionRow}>
                <Icon name="editions" size={20} color={material.label} />
                <View style={styles.flex}>
                  <AppText variant="bodyStrong">Standard Edition</AppText>
                  <AppText variant="caption">{`Owned ×${entry.copies} · first discovered ${new Date(entry.firstAcquiredAt).toLocaleDateString()}`}</AppText>
                </View>
              </View>
              <AppText variant="caption" color={colors.textMuted}>
                Holo and Celestial editions are planned for a later series. Editions change only the finish, never the story.
              </AppText>
            </Panel>

            {card.editorial.placeholderArt ? (
              <AppText variant="caption" align="center" color={colors.textMuted}>
                Artwork shown is a temporary placeholder while the final illustration is prepared.
              </AppText>
            ) : null}
            {favoriteError ? (
              <AppText variant="caption" align="center" color={colors.error}>
                {favoriteError}
              </AppText>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  content: { paddingHorizontal: spacing.gutter, gap: spacing.lg, maxWidth: 640, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.gutter, paddingBottom: spacing.sm, maxWidth: 640, width: '100%', alignSelf: 'center' },
  scroll: { flex: 1 },
  headerText: { flex: 1, alignItems: 'center' },
  headerSpacer: { width: 44 },
  stage: { alignItems: 'center', paddingVertical: spacing.sm },
  stageControls: { flexDirection: 'row', justifyContent: 'center', marginTop: -spacing.sm },
  titleBlock: { alignItems: 'center', gap: spacing.xs },
  badges: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs, flexWrap: 'wrap', justifyContent: 'center' },
  sections: { gap: spacing.lg },
  panel: { gap: spacing.sm },
  verse: { gap: spacing.sm, alignItems: 'center' },
  divider: { marginVertical: spacing.xs },
  themes: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  theme: { borderRadius: radii.pill, borderWidth: 1, borderColor: colors.borderGold, paddingHorizontal: 10, paddingVertical: 3 },
  editionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
});
