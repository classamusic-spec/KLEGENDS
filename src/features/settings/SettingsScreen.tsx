import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Switch, View } from 'react-native';

import { TRANSLATION } from '@/content/scripture';
import { colors, spacing } from '@/design/tokens';
import type { RevealSpeed } from '@/domain/packs';
import { audio, feedback } from '@/feedback';
import { describeServiceError } from '@/services/gameService';
import { gameService } from '@/state/game';
import { updateSettings, useSettings, type ReducedMotionPreference, type VisualQuality } from '@/state/settings';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Panel } from '@/ui/Panel';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { Segmented } from '@/ui/Segmented';

type Level = 'off' | 'low' | 'medium' | 'high';
const LEVELS: Readonly<Record<Level, number>> = { off: 0, low: 0.35, medium: 0.7, high: 1 };
const LEVEL_OPTIONS = [
  { value: 'off', label: 'Off' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
] as const;
const toLevel = (volume: number): Level =>
  (Object.keys(LEVELS) as Level[]).reduce<Level>((best, level) => (Math.abs(LEVELS[level] - volume) < Math.abs(LEVELS[best] - volume) ? level : best), 'off');

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Panel style={styles.section}>
      <AppText variant="eyebrow" accessibilityRole="header">
        {title}
      </AppText>
      {children}
    </Panel>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <AppText variant="bodyStrong">{label}</AppText>
      {hint ? <AppText variant="caption">{hint}</AppText> : null}
      {children}
    </View>
  );
}

/** react-native-web colors an active Switch thumb from its own prop. */
const WEB_SWITCH_PROPS: Record<string, unknown> = Platform.OS === 'web' ? { activeThumbColor: colors.goldBright } : {};

function ToggleRow({ label, hint, value, onChange, disabled, testID }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean; testID?: string }) {
  return (
    <View style={styles.toggle}>
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{label}</AppText>
        {hint ? <AppText variant="caption">{hint}</AppText> : null}
      </View>
      <Switch
        {...WEB_SWITCH_PROPS}
        value={value}
        disabled={disabled}
        onValueChange={(v) => {
          feedback.select();
          onChange(v);
        }}
        trackColor={{ false: '#2A2E37', true: colors.goldDeep }}
        thumbColor={value ? colors.goldBright : '#9A9AA2'}
        accessibilityLabel={label}
        testID={testID}
      />
    </View>
  );
}

/** Prototype-only tools for exercising the local development backend. */
function PrototypeTools() {
  const [message, setMessage] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!confirmReset) return;
    const id = setTimeout(() => setConfirmReset(false), 4000);
    return () => clearTimeout(id);
  }, [confirmReset]);

  const run = async (action: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage(done);
    } catch (error) {
      setMessage(describeServiceError(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section title="Prototype tools">
      <AppText variant="caption">{`Backend: ${gameService.label}. These tools exist for testing this prototype and are not part of the finished game.`}</AppText>
      <Button
        label="Grant a Demo Pack"
        icon="sparkle"
        variant="secondary"
        size="md"
        disabled={busy}
        onPress={() => run(() => gameService.prototype.grantDemoPack(), 'A demo pack is waiting in the Royal Treasury.')}
        testID="tools-grant"
      />
      <Button
        label="Simulate a Connection Failure"
        variant="secondary"
        size="md"
        disabled={busy}
        onPress={() => {
          gameService.prototype.failNextRequest();
          setMessage('The next request to the game service will fail once, to test error handling.');
        }}
        testID="tools-fail"
      />
      <Button
        label={confirmReset ? 'Tap Again to Erase Everything' : 'Reset Local Data'}
        variant="secondary"
        size="md"
        disabled={busy}
        onPress={() => {
          if (!confirmReset) {
            setConfirmReset(true);
            return;
          }
          setConfirmReset(false);
          void run(() => gameService.prototype.reset(), 'Local data erased. Your collection starts fresh.');
        }}
        testID="tools-reset"
      />
      {message ? (
        <AppText variant="caption" color={colors.parchment} accessibilityLiveRegion="polite" testID="tools-message">
          {message}
        </AppText>
      ) : null}
    </Section>
  );
}

/** Settings: sound, touch, motion and visual quality, plus prototype tools and credits. */
export function SettingsScreen() {
  const router = useRouter();
  const settings = useSettings((s) => s);

  return (
    <Screen testID="settings">
      <ScreenHeader eyebrow="Kingdom Legends" title="Settings" onBack={() => router.back()} />

      <Section title="Sound">
        <Field label="Music and ambience">
          <Segmented
            options={LEVEL_OPTIONS}
            value={toLevel(settings.musicVolume)}
            onChange={(level) => updateSettings({ musicVolume: LEVELS[level] })}
            accessibilityLabel="Music and ambience volume"
            testID="settings-music"
          />
        </Field>
        <Field label="Effects">
          <Segmented
            options={LEVEL_OPTIONS}
            value={toLevel(settings.effectsVolume)}
            onChange={(level) => {
              updateSettings({ effectsVolume: LEVELS[level] });
              audio.play('ui_confirm');
            }}
            accessibilityLabel="Sound effects volume"
            testID="settings-effects"
          />
        </Field>
      </Section>

      <Section title="Touch">
        <ToggleRow
          label="Haptics"
          hint={Platform.OS === 'web' ? 'Haptics are only available on iPhone and Android devices.' : 'Gentle vibrations for tearing, reveals and buttons.'}
          value={settings.haptics}
          onChange={(haptics) => updateSettings({ haptics })}
          testID="settings-haptics"
        />
        <ToggleRow
          label="Tilt cards with device motion"
          hint={Platform.OS === 'web' ? 'Requires a phone or tablet with motion sensors.' : 'In the Artifact Chamber, cards follow how you hold your device.'}
          value={settings.motionTilt}
          disabled={Platform.OS === 'web'}
          onChange={(motionTilt) => updateSettings({ motionTilt })}
          testID="settings-motion-tilt"
        />
      </Section>

      <Section title="Motion">
        <Field label="Reduce motion" hint="Replaces camera moves, flips and light sweeps with calm fades. “System” follows your device setting.">
          <Segmented<ReducedMotionPreference>
            options={[
              { value: 'system', label: 'System' },
              { value: 'on', label: 'On' },
              { value: 'off', label: 'Off' },
            ]}
            value={settings.reducedMotion}
            onChange={(reducedMotion) => updateSettings({ reducedMotion })}
            accessibilityLabel="Reduce motion"
            testID="settings-reduced-motion"
          />
        </Field>
        <Field label="Card reveal speed" hint="Every reveal can also be skipped with a tap.">
          <Segmented<RevealSpeed>
            options={[
              { value: 'cinematic', label: 'Cinematic' },
              { value: 'standard', label: 'Standard' },
              { value: 'quick', label: 'Quick' },
            ]}
            value={settings.revealSpeed}
            onChange={(revealSpeed) => updateSettings({ revealSpeed })}
            accessibilityLabel="Card reveal speed"
            testID="settings-reveal-speed"
          />
        </Field>
      </Section>

      <Section title="Visual quality">
        <Segmented<VisualQuality>
          options={[
            { value: 'performance', label: 'Performance' },
            { value: 'balanced', label: 'Balanced' },
            { value: 'cinematic', label: 'Cinematic' },
          ]}
          value={settings.visualQuality}
          onChange={(visualQuality) => updateSettings({ visualQuality })}
          accessibilityLabel="Visual quality"
          testID="settings-quality"
        />
        <AppText variant="caption">Performance lowers foil detail and card thickness for older devices and longer battery life.</AppText>
      </Section>

      <PrototypeTools />

      <Section title="About">
        <AppText variant="body">{TRANSLATION.attribution}</AppText>
        <AppText variant="body">Card summaries, quests and trivia are drafts awaiting biblical editorial review.</AppText>
        <AppText variant="body">All artwork and sound are original to this prototype; most card scenes are temporary placeholders.</AppText>
        <AppText variant="body">Fonts: Cinzel, Manrope and Cormorant Garamond, under the SIL Open Font License.</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          Kingdom Legends · Milestone 1 prototype
        </AppText>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  field: { gap: spacing.xs },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
});
