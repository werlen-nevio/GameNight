import type { MillionaireQuestion } from '../types';

/**
 * Core question bank (curated, factually safe). Merged with the generated
 * extension in {@link MILLIONAIRE_QUESTIONS}. Keep answers unambiguous.
 */
export const MILLIONAIRE_BASE: MillionaireQuestion[] = [
  // ---- easy ----
  {
    id: 'q_e1',
    question: 'Welche Farbe entsteht, wenn man Blau und Gelb mischt?',
    answers: ['Grün', 'Lila', 'Orange', 'Braun'],
    correct: 0,
    tier: 'easy',
    category: 'Allgemein',
  },
  {
    id: 'q_e2',
    question: 'Wie viele Beine hat eine Spinne?',
    answers: ['6', '8', '10', '12'],
    correct: 1,
    tier: 'easy',
    category: 'Natur',
  },
  {
    id: 'q_e3',
    question: 'Welches Tier wird als „König der Tiere“ bezeichnet?',
    answers: ['Tiger', 'Elefant', 'Löwe', 'Bär'],
    correct: 2,
    tier: 'easy',
    category: 'Natur',
  },
  {
    id: 'q_e4',
    question: 'Wie heißt die Hauptstadt von Deutschland?',
    answers: ['München', 'Hamburg', 'Köln', 'Berlin'],
    correct: 3,
    tier: 'easy',
    category: 'Geografie',
  },
  {
    id: 'q_e5',
    question: 'Wie viele Tage hat eine Woche?',
    answers: ['7', '5', '6', '8'],
    correct: 0,
    tier: 'easy',
    category: 'Allgemein',
  },
  {
    id: 'q_e6',
    question: 'Welcher Planet ist der Sonne am nächsten?',
    answers: ['Venus', 'Merkur', 'Mars', 'Erde'],
    correct: 1,
    tier: 'easy',
    category: 'Wissenschaft',
  },
  // ---- medium ----
  {
    id: 'q_m1',
    question: 'In welchem Land steht die Freiheitsstatue?',
    answers: ['Frankreich', 'Großbritannien', 'USA', 'Kanada'],
    correct: 2,
    tier: 'medium',
    category: 'Geografie',
  },
  {
    id: 'q_m2',
    question: 'Wie viele Spieler stehen bei einer Fußballmannschaft auf dem Feld?',
    answers: ['9', '10', '11', '12'],
    correct: 2,
    tier: 'medium',
    category: 'Sport',
  },
  {
    id: 'q_m3',
    question: 'Welches chemische Element hat das Symbol „O“?',
    answers: ['Gold', 'Sauerstoff', 'Osmium', 'Wasserstoff'],
    correct: 1,
    tier: 'medium',
    category: 'Wissenschaft',
  },
  {
    id: 'q_m4',
    question: 'Wer malte die „Mona Lisa“?',
    answers: ['Leonardo da Vinci', 'Michelangelo', 'Picasso', 'Van Gogh'],
    correct: 0,
    tier: 'medium',
    category: 'Kunst',
  },
  {
    id: 'q_m5',
    question: 'Welcher Ozean ist der größte der Erde?',
    answers: ['Atlantik', 'Indischer Ozean', 'Arktischer Ozean', 'Pazifik'],
    correct: 3,
    tier: 'medium',
    category: 'Geografie',
  },
  {
    id: 'q_m6',
    question: 'Wie viele Kontinente gibt es?',
    answers: ['5', '6', '7', '8'],
    correct: 2,
    tier: 'medium',
    category: 'Geografie',
  },
  // ---- hard ----
  {
    id: 'q_h1',
    question: 'In welchem Jahr fiel die Berliner Mauer?',
    answers: ['1987', '1989', '1991', '1985'],
    correct: 1,
    tier: 'hard',
    category: 'Geschichte',
  },
  {
    id: 'q_h2',
    question: 'Welches ist das härteste natürliche Material?',
    answers: ['Quarz', 'Stahl', 'Diamant', 'Titan'],
    correct: 2,
    tier: 'hard',
    category: 'Wissenschaft',
  },
  {
    id: 'q_h3',
    question: 'Wie viele Knochen hat ein erwachsener Mensch?',
    answers: ['206', '212', '198', '224'],
    correct: 0,
    tier: 'hard',
    category: 'Biologie',
  },
  {
    id: 'q_h4',
    question: 'Welche Stadt war die Hauptstadt des antiken Reiches der Inka?',
    answers: ['Lima', 'Bogotá', 'Cusco', 'Quito'],
    correct: 2,
    tier: 'hard',
    category: 'Geschichte',
  },
];
