import { MODE_IDS, MODE_META } from '../catalog';
import type { GameModule } from '../shared/types';
import { Reaction } from './Reaction';

export const reactionModule: GameModule = {
  meta: MODE_META[MODE_IDS.reaction],
  rules: {
    objective: 'Meistere eine Serie blitzschneller Minispiele. Jedes bringt bis zu 100 Punkte – wer am Ende vorne liegt, gewinnt.',
    steps: [
      { icon: 'flash', title: 'Minispiele', text: 'Reaktion, Kopfrechnen, Merken, Schätzen, Tempo und mehr.' },
      { icon: 'timer', title: 'Sekundenschnell', text: 'Jedes Spiel dauert nur wenige Sekunden – volle Konzentration!' },
      { icon: 'people', title: 'Reihum', text: 'Im lokalen Modus spielt jede:r dieselben Spiele nacheinander.' },
      { icon: 'trophy', title: 'Höchste Summe', text: 'Die meisten Gesamtpunkte gewinnen den Wettkampf.' },
    ],
  },
  Gameplay: Reaction,
  defaultOptions: {},
  buildConfig: () => ({ rounds: 4, timeLimit: 0 }),
  scoreCap: (config) => config.rounds * 100,
};
