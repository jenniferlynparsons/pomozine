/* ==========================================================
   MIXTAPE HISS
   A cassette deck playing a blank-ish dub.

     1. pink-noise tape hiss (white noise, but darker)
     2. two reels turning at different speeds, each with a soft rub per turn
     3. a low capstan-motor whir whose pitch drifts with the wobble
     4. the odd soft tick

   Both ears get the same sound (mono: true) so it sits in one place,
   like a tape deck on the desk.
   ========================================================== */

Pomozine.addNoise({
  id: 'tape',
  label: 'mixtape hiss',
  seconds: 30,
  loudness: 0.09,
  mono: true,

  fill(d, sr, ch, { rand, pinkGen }) {
    const pink = pinkGen();
    let reel1 = 0, reel2 = 0, motorPhase = 0, rub = 0, rubSlow = 0, flut = 0, flutSmooth = 0;

    // TRY: how many wobbles per second (0.45-0.65 now)
    const WOBBLE_RATE = 0.45 + Math.random() * 0.2;

    for (let i = 0; i < d.length; i++) {
      const t = i / sr;

      // ---- speed wobble: a slow wave, a faster one, and a little randomness
      flut += 0.002 * (rand() - flut);
      flutSmooth += 0.01 * (flut - flutSmooth);
      const wobble = 1
        + 0.07 * Math.sin(2 * Math.PI * WOBBLE_RATE * t)        // TRY: 0.07 = wobble depth
        + 0.03 * Math.sin(2 * Math.PI * WOBBLE_RATE * 2.3 * t + 1)
        + flutSmooth * 2;

      // ---- reels: the full one turns slower than the empty one
      reel1 += (0.9 * wobble) / sr;                  // turns per second
      reel2 += (1.35 * wobble) / sr;
      // a bump once per turn (cos wave, sharpened by ^3)
      const turn1 = Math.pow(0.5 + 0.5 * Math.cos(2 * Math.PI * reel1), 3);
      const turn2 = Math.pow(0.5 + 0.5 * Math.cos(2 * Math.PI * reel2 + 2), 3);
      rub += 0.12 * (rand() - rub);                 // mid-band noise = friction
      rubSlow += 0.02 * (rub - rubSlow);
      const reels = (rub - rubSlow) * (0.25 + turn1 * 0.9 + turn2 * 0.6);

      // ---- motor: a 62 Hz hum with a couple of overtones
      motorPhase += (2 * Math.PI * 62 * wobble) / sr;
      const motor = Math.sin(motorPhase) + 0.45 * Math.sin(2 * motorPhase) + 0.2 * Math.sin(3 * motorPhase);

      // TRY: the mix. hiss 0.55, reels 0.22, motor 0.018
      d[i] = pink() * 0.55 + reels * 0.22 + motor * 0.018;
    }

    // ---- soft ticks (dust on the heads) -------------------------------
    // TRY: 0.8 per second. Set to 0 to remove them.
    for (let k = 0, n = Math.floor((d.length / sr) * 0.8); k < n; k++) {
      const pos = Math.floor(Math.random() * (d.length - sr * 0.01));
      const amp = 0.03 + Math.pow(Math.random(), 3) * 0.1;
      const len = Math.floor(sr * (0.001 + Math.random() * 0.003));
      let tk = 0;
      for (let j = 0; j < len; j++) {
        tk += 0.25 * (rand() - tk);
        d[pos + j] += amp * Math.exp(-j / (len * 0.3)) * tk * 2;
      }
    }
  }
});
