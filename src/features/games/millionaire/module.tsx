import { MODE_IDS, MODE_META } from '../catalog';
import type { GameModule } from '../shared/types';
import { Millionaire } from './Millionaire';

export const millionaireModule: GameModule = {
  meta: MODE_META[MODE_IDS.millionaire],
  rules: {
    objective: 'Beantworte 15 Fragen mit steigendem Schwierigkeitsgrad und arbeite dich zur Million vor.',
    steps: [
      { icon: 'help-circle', title: '15 Fragen', text: 'Jede richtige Antwort bringt dich eine Stufe höher.' },
      { icon: 'shield-checkmark', title: 'Sicherheitsstufen', text: 'Bei Frage 5 und 10 sicherst du deinen Gewinn ab.' },
      { icon: 'options', title: '4 Joker', text: '50:50, Publikum, Telefon und Fragentausch helfen dir weiter.' },
      { icon: 'exit', title: 'Aussteigen', text: 'Steig jederzeit aus und nimm deinen aktuellen Gewinn mit.' },
    ],
  },
  Gameplay: Millionaire,
  defaultOptions: {},
  buildConfig: () => ({ rounds: 15, timeLimit: 0 }),
};
