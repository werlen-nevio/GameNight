import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { radii, spacing } from '../../core/design/tokens';
import {
  AppText,
  Card,
  Chip,
  CurrencyPill,
  Icon,
  ModalHeader,
  PressableScale,
  Screen,
  Tag,
} from '../../core/ui';
import { Confetti } from '../../core/fx';
import { Feedback } from '../../core/services';
import { t } from '../../core/i18n';
import { groupNumber } from '../../core/utils/format';
import {
  cosmeticPreview,
  FRAME_BY_ID,
  RARITY_COLOR,
  RARITY_LABEL,
  SHOP_ITEMS,
  THEME_BY_ID,
  type CosmeticKind,
  type ShopItem,
} from '../../domain';
import { usePlayerStore } from '../../state';

type Filter = 'featured' | CosmeticKind;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'featured', label: t.shop.featured },
  { id: 'avatar', label: t.shop.avatars },
  { id: 'frame', label: t.shop.frames },
  { id: 'theme', label: t.shop.themes },
  { id: 'emote', label: t.shop.emotes },
  { id: 'title', label: 'Titel' },
];

const INV_KEY: Record<CosmeticKind, 'avatars' | 'frames' | 'titles' | 'emotes' | 'themes'> = {
  avatar: 'avatars',
  frame: 'frames',
  title: 'titles',
  emote: 'emotes',
  theme: 'themes',
};

export function ShopScreen() {
  const router = useRouter();
  const player = usePlayerStore((s) => s.player);
  const purchase = usePlayerStore((s) => s.purchase);
  const [filter, setFilter] = useState<Filter>('featured');
  const [burst, setBurst] = useState(0);

  const items = SHOP_ITEMS.filter((i) => (filter === 'featured' ? i.featured : i.kind === filter));

  const owns = (item: ShopItem) => player.inventory[INV_KEY[item.kind]].includes(item.cosmeticId);

  const buy = (item: ShopItem) => {
    if (owns(item)) return;
    const ok = purchase(item);
    if (ok) {
      Feedback.unlock();
      setBurst((b) => b + 1);
    } else {
      Feedback.error();
      Alert.alert(t.shop.notEnough, `Dir fehlen ${item.currency === 'gems' ? 'Gems' : 'Münzen'}.`);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      {burst > 0 && <Confetti key={burst} mode="burst" originY={0.4} count={50} />}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingTop: spacing.sm }}>
        <AppText variant="title" color="text">
          {t.shop.title}
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <CurrencyPill kind="coin" value={player.coins} />
          <CurrencyPill kind="gem" value={player.gems} />
          <PressableScale feedback="tap" onPress={() => router.back()}>
            <Icon name="close" size={26} color="text" />
          </PressableScale>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.xl, gap: spacing.sm, paddingVertical: spacing.md }}>
        {FILTERS.map((f) => (
          <Chip key={f.id} label={f.label} selected={filter === f.id} onPress={() => setFilter(f.id)} />
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingTop: 0, gap: spacing.md }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          {items.map((item) => (
            <ItemCard key={item.id} item={item} owned={owns(item)} onBuy={() => buy(item)} />
          ))}
        </View>
        {items.length === 0 && (
          <AppText variant="body" color="textFaint" align="center" style={{ marginTop: spacing.huge }}>
            Bald mehr im Angebot!
          </AppText>
        )}
      </ScrollView>
    </Screen>
  );
}

function ItemCard({ item, owned, onBuy }: { item: ShopItem; owned: boolean; onBuy: () => void }) {
  const preview = cosmeticPreview(item);
  const swatch =
    item.kind === 'frame'
      ? FRAME_BY_ID[item.cosmeticId]?.gradient
      : item.kind === 'theme'
        ? THEME_BY_ID[item.cosmeticId]?.swatch
        : undefined;
  const rarityColor = RARITY_COLOR[item.rarity];

  return (
    <PressableScale feedback={null} onPress={onBuy} disabled={owned} scaleTo={0.95} style={{ width: '47.5%' }}>
      <Card padding="md" radius="xl" style={{ gap: spacing.sm, borderColor: rarityColor + '66', borderWidth: 1.5 }}>
        <View style={{ position: 'absolute', top: spacing.sm, right: spacing.sm, zIndex: 2 }}>
          <Tag label={RARITY_LABEL[item.rarity]} tone={item.rarity === 'legendary' ? 'pro' : item.rarity === 'epic' ? 'new' : 'neutral'} />
        </View>

        <View
          style={{
            height: 88,
            borderRadius: radii.lg,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            backgroundColor: 'rgba(0,0,0,0.25)',
          }}
        >
          {swatch ? (
            <LinearGradient colors={swatch} style={{ width: 56, height: 56, borderRadius: 28 }} />
          ) : (
            <AppText style={{ fontSize: 44 }}>{preview.emoji ?? preview.text ?? '🎁'}</AppText>
          )}
        </View>

        <AppText variant="caption" color="text" numberOfLines={1}>
          {item.name}
        </AppText>

        {owned ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center', paddingVertical: 4 }}>
            <Icon name="checkmark-circle" size={16} color="success" />
            <AppText variant="caption" color="success">
              {t.common.owned}
            </AppText>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: radii.pill, paddingVertical: 6 }}>
            <Icon name={item.currency === 'gems' ? 'diamond' : 'logo-bitcoin'} size={15} color={item.currency === 'gems' ? 'gem' : 'coin'} />
            <AppText variant="caption" color="text">
              {groupNumber(item.price)}
            </AppText>
          </View>
        )}
      </Card>
    </PressableScale>
  );
}
