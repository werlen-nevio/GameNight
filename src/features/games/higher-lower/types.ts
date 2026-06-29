/** A comparable item — items within a category are ranked by `value`. */
export interface HLItem {
  id: string;
  label: string;
  emoji?: string;
  value: number;
}

export interface HLCategory {
  id: string;
  name: string;
  emoji: string;
  /** Unit shown after the value, e.g. "km/h" or "Mio.". */
  unit: string;
  /** The comparison prompt, e.g. "Was ist schneller?". */
  question: string;
  items: HLItem[];
}
