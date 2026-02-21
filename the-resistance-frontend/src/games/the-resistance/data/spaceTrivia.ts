export const SPACE_TRIVIA = [
  "Only about 4.9% of the universe is composed of ordinary matter. The remaining 95% is dark matter and dark energy.",
  "Neutron stars are so incredibly dense that a single teaspoon of their material would weigh more than all of humanity combined.",
  "There are theoretical 'white holes', which are the exact opposite of black holes—instead of consuming everything, they violently spew out matter.",
  "Venus takes 243 Earth days to rotate on its axis, but only 225 Earth days to orbit the Sun. A day on Venus is longer than its year.",
  "If two pieces of the same type of metal touch in the vacuum of space, they will permanently bond together. This is known as cold welding.",
  "Saturn is the only planet in our solar system less dense than water. If you found a bathtub big enough, Saturn would float in it.",
  "Precious metals like silver and gold are not formed in standard stars; they are forged during the catastrophic collision of neutron stars.",
  "Jupiter and the Sun don't perfectly orbit each other. Their immense gravitational dance causes them to orbit a point in space 30,000 km above the Sun's surface.",
  "Rogue planets wander through empty space without orbiting any star. Astronomers estimate there could be billions of them in our galaxy alone.",
  "Gamma-ray bursts are the most powerful explosions in the universe, releasing more energy in 10 seconds than our Sun will produce over its entire 10-billion-year lifespan.",
  "The observable universe is estimated to be around 93 billion light-years wide, containing roughly two trillion galaxies.",
  "Despite its immense heat near stars, the baseline temperature of the universe is a freezing 2.7 Kelvin, or -455° Fahrenheit.",
  "Jupiter's moon Io is the most volcanically active body in our solar system, with hundreds of erupting volcanoes constantly reshaping its surface.",
  "Valles Marineris on Mars is the largest canyon system in the solar system, stretching over 4,000 kilometers—roughly the width of the entire United States.",
  "The winds on Neptune are the fastest in the solar system, reaching supersonic speeds of up to 2,575 kilometers per hour.",
  "Space is not completely silent; the interstellar medium contains a very low-frequency humming sound.",
  "You are constantly bombarded by invisible micrometeorites. Thousands of these tiny cosmic dust particles rain down on Earth every day.",
  "A comet's tail doesn't follow its trajectory. It actually always points directly away from the Sun, meaning the tail leads the comet when it's moving away.",
  "The stars you see at night are so far away that their light takes millions of years to reach us. We are technically looking backwards in time.",
  "Astronomers have identified exoplanets, such as 55 Cancri e, that are believed to be largely composed of crystallized diamond.",
  "The footprints left by Apollo astronauts on the Moon will likely stay there for millions of years, as there is no wind or water to erode them.",
  "Currently, Mercury is shrinking. As its core cools, the planet contracts, causing its surface to buckle and form massive fault scarps.",
  "The Sun constitutes a staggering 99.86% of the entire mass of our solar system. Everything else—planets, asteroids, moons—fits in the remaining 0.14%.",
  "There is a supermassive black hole at the center of the Milky Way, named Sagittarius A*, which has the mass of four million suns.",
  "A photon of light takes tens of thousands of years to travel from the core of the Sun to its surface, but only 8 minutes to travel from its surface to Earth."
];

export function getTriviaForStar(starId: number): string {
  // Deterministically return the same trivia fact for the same star ID
  return SPACE_TRIVIA[starId % SPACE_TRIVIA.length];
}
