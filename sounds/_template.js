/* ==========================================================
   TEMPLATE: make your own background sound

   1. Copy this file and rename it, e.g. sounds/ocean.js
   2. Change id and label below
   3. In index.html, add a line next to the other sound files:
        <script src="sounds/ocean.js"></script>
   4. Refresh the page. Your sound shows up as a new button.

   This example is a slow "ocean": pink noise that swells and fades
   every ~8 seconds. It's not loaded by default.
   ========================================================== */

Pomozine.addNoise({
  id: 'ocean',          // short, no spaces, unique
  label: 'ocean',       // button text
  seconds: 24,          // loop length (a multiple of the swell keeps it smooth)
  loudness: 0.11,       // 0.09-0.16 matches the other sounds
  mono: false,

  fill(d, sr, ch, { rand, pinkGen }) {
    const pink = pinkGen();
    let smooth = 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;                                   // time in seconds
      // a wave every 8 seconds, from 0.15 (trough) to 1 (crashing)
      const wave = 0.15 + 0.85 * Math.pow(0.5 + 0.5 * Math.sin(2 * Math.PI * t / 8), 2);
      // brighter when the wave is big: the smoothing amount follows the wave
      smooth += (0.05 + 0.4 * wave) * (pink() - smooth);
      d[i] = smooth * wave;
    }
  }
});
