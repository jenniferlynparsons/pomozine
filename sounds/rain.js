/* ==========================================================
   RAIN (no thunder)

   A plain hiss sounds like white noise, not rain. What makes the ear
   say "rain" is lots of separate little impacts. So this is three layers:
     1. a soft, dark wash underneath (rain landing far away)
     2. lots of tiny pitched "plinks" (close drops)
     3. a few bigger, rounder drips (gutter, leaves, windowsill)
   ========================================================== */

Pomozine.addNoise({
  id: 'rain',
  label: 'rain',
  seconds: 16,
  loudness: 0.11,
  mono: false,

  fill(d, sr, ch, { rand }) {
    const secs = d.length / sr;

    // ---- 1. the wash -------------------------------------------------
    let lo = 0, mid = 0, midSlow = 0, gust = 0;
    const offset = ch * 1.7;                        // left & right swell out of step
    for (let i = 0; i < d.length; i++) {
      const w = rand();
      const t = i / sr;
      lo = (lo + 0.02 * w) / 1.02;                  // low rumble (brown noise)
      mid += 0.14 * (w - mid);                      // smooth to ~1kHz...
      midSlow += 0.01 * (mid - midSlow);            // ...minus the lows = a middle band
      gust += 0.00001 * (rand() - gust * 0.3);      // very slow random drift
      const swell = 0.8
        + 0.12 * Math.sin(2 * Math.PI * 0.045 * t + offset)   // a swell every ~22s
        + Math.max(-0.1, Math.min(0.1, gust * 30));
      // TRY: raise 0.28 for more hiss, raise 1.4 for more rumble
      d[i] = (lo * 1.4 + (mid - midSlow) * 0.28) * swell;
    }

    // ---- a single drop -------------------------------------------------
    // A short sine wave that slides down in pitch and fades fast,
    // with a tiny tick of noise at the very start.
    const drop = (pos, amp, startHz, ms) => {
      const len = Math.floor(sr * ms / 1000);
      if (pos + len >= d.length) return;
      let phase = 0;
      for (let j = 0; j < len; j++) {
        const k = j / len;                          // 0 -> 1 across the drop
        phase += (2 * Math.PI * startHz * (1 - 0.35 * k)) / sr;   // pitch falls 35%
        d[pos + j] += amp * Math.exp(-5 * k) * Math.sin(phase);
        if (j < 12) d[pos + j] += amp * 0.4 * rand() * (1 - j / 12);
      }
    };
    const randomSpot = () => Math.floor(Math.random() * d.length);

    // ---- 2. small drops ----------------------------------------------
    // TRY: 160 per second -> 60 for a light drizzle, 300 for a downpour
    for (let k = 0, n = Math.floor(secs * 160); k < n; k++) {
      drop(randomSpot(),
        0.01 + Math.pow(Math.random(), 4) * 0.12,   // mostly quiet, a few louder
        1400 + Math.random() * 2600,                 // pitch: 1400-4000 Hz
        6 + Math.random() * 18);                     // length: 6-24 ms
    }

    // ---- 3. big drips ------------------------------------------------
    for (let k = 0, n = Math.floor(secs * 1.6); k < n; k++) {
      drop(randomSpot(),
        0.12 + Math.random() * 0.12,
        650 + Math.random() * 900,                   // lower pitch: 650-1550 Hz
        35 + Math.random() * 45);                    // longer: 35-80 ms
    }
  }
});
