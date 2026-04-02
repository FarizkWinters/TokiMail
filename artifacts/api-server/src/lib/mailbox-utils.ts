const adjectives = [
  "quick", "lazy", "bright", "dark", "calm", "wild", "cold", "warm",
  "bold", "shy", "wise", "young", "old", "fast", "slow", "loud",
  "soft", "hard", "thin", "thick", "clean", "messy", "neat", "rough",
];

const nouns = [
  "fox", "cat", "dog", "bird", "wolf", "bear", "lion", "hawk",
  "frog", "fish", "crab", "duck", "crow", "owl", "bat", "bee",
  "ant", "fly", "rat", "pig", "cow", "elk", "ram", "eel",
];

export function generateRandomLocalPart(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `${adj}${noun}${num}`;
}
