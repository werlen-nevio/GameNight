import { View } from 'react-native';

import { spacing } from '../../../core/design/tokens';
import { Chip, SectionHeader } from '../../../core/ui';
import { MODE_IDS, MODE_META } from '../catalog';
import type { GameModule, GameOptionsProps } from '../shared/types';
import { HigherLower } from './HigherLower';
import { HL_CATEGORIES } from './data/categories';

function Options({ options, setOption }: GameOptionsProps) {
  const selected = (options.category as string) ?? 'random';
  return (
    <View>
      <SectionHeader title="Thema" subtitle="Wähle eine Kategorie oder lass zufällig wählen" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <Chip label="🎲 Zufällig" selected={selected === 'random'} onPress={() => setOption('category', 'random')} />
        {HL_CATEGORIES.map((c) => (
          <Chip
            key={c.id}
            label={`${c.emoji} ${c.name}`}
            selected={selected === c.id}
            onPress={() => setOption('category', c.id)}
          />
        ))}
      </View>
    </View>
  );
}

export const higherLowerModule: GameModule = {
  meta: MODE_META[MODE_IDS.higherLower],
  rules: {
    objective: 'Hat der zweite Begriff einen höheren oder niedrigeren Wert? Triff so viele Entscheidungen richtig wie möglich.',
    steps: [
      { icon: 'eye', title: 'Wert ansehen', text: 'Oben siehst du einen Begriff mit seinem Wert.' },
      { icon: 'swap-vertical', title: 'Höher oder tiefer?', text: 'Schätze, ob der untere Begriff mehr oder weniger hat.' },
      { icon: 'flame', title: 'Serie aufbauen', text: 'Jede richtige Antwort gibt einen Punkt – wie weit kommst du?' },
    ],
  },
  Gameplay: HigherLower,
  Options,
  defaultOptions: { category: 'random' },
  buildConfig: ({ options }) => ({
    rounds: 7,
    timeLimit: 0,
    options: { category: options.category ?? 'random' },
  }),
  scoreCap: (config) => config.rounds,
};
