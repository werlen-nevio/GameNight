import { MODE_IDS, MODE_META } from '../catalog';
import type { GameModule } from '../shared/types';
import { GuessPrice } from './GuessPrice';

export const guessPriceModule: GameModule = {
  meta: MODE_META[MODE_IDS.guessPrice],
  rules: {
    objective: 'Schätze den Preis verschiedener Produkte so genau wie möglich. Je näher dein Tipp, desto mehr Punkte.',
    steps: [
      { icon: 'pricetag', title: 'Produkt ansehen', text: 'Jede Runde wird ein Produkt gezeigt.' },
      { icon: 'calculator', title: 'Preis schätzen', text: 'Gib deinen Tipp in Euro über das Tastenfeld ein.' },
      { icon: 'trophy', title: 'Genauigkeit zählt', text: 'Bis zu 100 Punkte pro Produkt – Volltreffer für sehr nahe Tipps.' },
    ],
  },
  Gameplay: GuessPrice,
  defaultOptions: {},
  buildConfig: () => ({ rounds: 5, timeLimit: 0 }),
  scoreCap: (config) => config.rounds * 100,
};
