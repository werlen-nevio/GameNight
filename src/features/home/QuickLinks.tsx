import { View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { radii, spacing } from '../../core/design/tokens';
import { AppText, Card, Icon, PressableScale, type IconName } from '../../core/ui';
import { t } from '../../core/i18n';

interface Link {
  label: string;
  icon: IconName;
  href: Href;
  color: string;
}

const LINKS: Link[] = [
  { label: t.home.friends, icon: 'people', href: '/friends', color: '#22E0D6' },
  { label: t.home.shop, icon: 'cart', href: '/shop', color: '#FFD23F' },
  { label: t.progression.achievements, icon: 'trophy', href: '/achievements', color: '#FF8A3D' },
  { label: t.home.profile, icon: 'person', href: '/profile', color: '#9D5CFF' },
];

/** Bottom-of-home quick navigation tiles. */
export function QuickLinks() {
  const router = useRouter();
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      {LINKS.map((l) => (
        <PressableScale key={l.label} feedback="tap" onPress={() => router.push(l.href)} style={{ flex: 1 }}>
          <Card padding="md" radius="lg" alt style={{ alignItems: 'center', gap: spacing.xs }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: radii.md,
                backgroundColor: l.color + '26',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name={l.icon} size={22} color={l.color} />
            </View>
            <AppText variant="label" color="textMuted" numberOfLines={1}>
              {l.label}
            </AppText>
          </Card>
        </PressableScale>
      ))}
    </View>
  );
}
