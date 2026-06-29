import { View } from 'react-native';

import { spacing } from '../../../core/design/tokens';
import { Chip, SectionHeader } from '../../../core/ui';
import { MODE_IDS, MODE_META } from '../catalog';
import type { GameModule, GameOptionsProps } from '../shared/types';
import { SLF_PACKS, type SlfPack } from './types';
import { StadtLandFluss } from './StadtLandFluss';
import { timeForDifficulty } from './logic';

const COUNT_OPTIONS = [4, 6, 8];

function Options({ options, setOption }: GameOptionsProps) {
  const count = (options.count as number) ?? 6;
  const packs = (options.packs as SlfPack[] | 'all') ?? 'all';
  const allSelected = packs === 'all';

  const togglePack = (id: SlfPack) => {
    const current = allSelected ? [] : (packs as SlfPack[]);
    const next = current.includes(id) ? current.filter((p) => p !== id) : [...current, id];
    setOption('packs', next.length === 0 ? 'all' : next);
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <View>
        <SectionHeader title="Kategorien pro Runde" />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {COUNT_OPTIONS.map((c) => (
            <Chip key={c} label={String(c)} selected={count === c} onPress={() => setOption('count', c)} />
          ))}
        </View>
      </View>

      <View>
        <SectionHeader title="Pakete" subtitle="Wähle Themen oder spiele mit allen" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <Chip label="Alle" selected={allSelected} onPress={() => setOption('packs', 'all')} />
          {SLF_PACKS.map((p) => (
            <Chip
              key={p.id}
              label={`${p.emoji} ${p.name}`}
              selected={!allSelected && (packs as SlfPack[]).includes(p.id)}
              onPress={() => togglePack(p.id)}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

export const stadtLandFlussModule: GameModule = {
  meta: MODE_META[MODE_IDS.stadtLandFluss],
  rules: {
    objective: 'Finde zu einem zufälligen Buchstaben passende Begriffe in jeder Kategorie – schneller und kreativer als alle anderen.',
    steps: [
      { icon: 'shuffle', title: 'Buchstabe & Kategorien', text: 'Jede Runde gibt es einen Buchstaben und mehrere Kategorien.' },
      { icon: 'create', title: 'Begriffe eintragen', text: 'Trage zu jeder Kategorie einen Begriff mit dem Buchstaben ein, bevor die Zeit abläuft.' },
      { icon: 'calculator', title: 'Automatische Punkte', text: '20 Punkte allein, 10 für einzigartige, 5 für doppelte Begriffe.' },
      { icon: 'trophy', title: 'Meiste Punkte gewinnt', text: 'Nach allen Runden gewinnt, wer am meisten gesammelt hat.' },
    ],
  },
  Gameplay: StadtLandFluss,
  Options,
  defaultOptions: { count: 6, packs: 'all' },
  buildConfig: ({ difficulty, options }) => ({
    rounds: 3,
    timeLimit: timeForDifficulty(difficulty),
    options: { count: (options.count as number) ?? 6, packs: options.packs ?? 'all' },
  }),
  scoreCap: (config) => config.rounds * ((config.options?.count as number) ?? 6) * 20,
};
