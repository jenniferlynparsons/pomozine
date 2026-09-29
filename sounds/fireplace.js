/* ==========================================================
   FIREPLACE

   Three layers:
     1. a low roar that flutters unevenly (flames licking)
     2. an occasional big pop, sometimes followed by skittering embers
     3. small, warm crackles a few times a second

   Lessons learned while tuning this one:
     - slow swells in the roar sound like WIND, not fire
     - a steady flutter sounds like a RHYTHM; two uneven ones don't
     - sharp clicks sound brittle; smoothing them makes them warmer
   ========================================================== */

Pomozine.addNoise({
  id: 'fire',
  label: 'fireplace',
  seconds: 45,            // long, so the big pops don't repeat on a noticeable cycle
  loudness: 0.12,
  mono: false,

  fill(d, sr, ch, { rand }) {

    // ---- 1. the roar ---------------------------------------------------
    let last = 0, low = 0, flutFast = 0, flutSlow = 0, activity = 0;
    let hiss = 0, hissSlow = 0, breath = 0;
    for (let i = 0; i < d.length; i++) {
      last = (last + 0.02 * rand()) / 1.02;         // brown noise...
      low += 0.035 * (last - low);                  // ...smoothed way down (~200 Hz)

      flutFast += 0.004 * (rand() - flutFast);      // quicker wobble
      flutSlow += 0.0012 * (rand() - flutSlow);     // lazier wobble
      activity += 0.00004 * (rand() - activity);    // how lively the fire is right now
      const depth = 3 + Math.min(1, Math.abs(activity) * 60) * 7;
      const flutter = 1 + Math.max(-0.4, Math.min(0.4, flutFast * depth + flutSlow * depth * 0.8));

      hiss += 0.3 * (rand() - hiss);                // faint breathy air on top
      hissSlow += 0.05 * (hiss - hissSlow);
      breath += 0.0006 * (rand() - breath);
      const air = (hiss - hissSlow) * 0.035 * (0.6 + Math.abs(breath) * 25);

      // TRY: 2.4 is roar volume. Lower it to let the crackles lead.
      d[i] = low * 2.4 * flutter + air;
    }

    // ---- 2. big pops ---------------------------------------------------
    let tp = Math.floor(sr * (1 + Math.random() * 4));
    while (tp < d.length - sr * 0.3) {
      const amp = 0.35 + Math.random() * 0.35;
      const len = Math.floor(sr * (0.03 + Math.random() * 0.04));
      const bodyHz = 140 + Math.random() * 160;     // the low "thock"
      let y = 0, phase = 0;
      for (let j = 0; j < len; j++) {
        const k = j / len;
        y += 0.45 * (rand() - y);
        phase += (2 * Math.PI * bodyHz * (1 - 0.3 * k)) / sr;
        const snap = Math.exp(-j / (sr * 0.003));   // very quick attack
        const body = Math.exp(-5 * k);
        d[tp + j] += amp * (snap * y * 1.6 + body * Math.sin(phase) * 0.6);
      }
      // embers skitter after about half the pops
      if (Math.random() < 0.5) {
        for (let e = 0, n = 2 + Math.floor(Math.random() * 4); e < n; e++) {
          const pos = tp + Math.floor(sr * (0.05 + Math.random() * 0.4));
          const l = Math.floor(sr * (0.003 + Math.random() * 0.006));
          let z = 0;
          for (let j = 0; j < l && pos + j < d.length; j++) {
            z += 0.3 * (rand() - z);
            d[pos + j] += 0.12 * Math.exp(-j / (l * 0.3)) * z * 2;
          }
        }
      }
      // TRY: gap between big pops, 4-14 seconds
      tp += Math.floor(sr * (4 + Math.random() * 10));
    }

    // ---- 3. crackles ---------------------------------------------------
    let t = 0;
    while (true) {
      // TRY: 1.2 + 5*... is "about 2-3 per second". Raise for a busier fire.
      const rate = 1.2 + 5 * Math.pow(Math.random(), 2);
      t += Math.floor((-Math.log(1 - Math.random()) / rate) * sr);  // random gap
      if (t >= d.length - sr * 0.2) break;
      const cluster = Math.random() < 0.1 ? 2 + Math.floor(Math.random() * 3) : 1;
      let pos = t;
      for (let c = 0; c < cluster; c++) {
        pos += Math.floor(sr * (0.01 + Math.random() * 0.05));
        if (pos >= d.length - sr * 0.03) break;
        const amp = 0.06 + Math.pow(Math.random(), 2.5) * 0.5;
        const len = Math.floor(sr * (0.004 + Math.random() * 0.012));
        const warmth = 0.18 + Math.random() * 0.2;  // TRY: lower = darker crackle
        let y = 0;
        for (let j = 0; j < len; j++) {
          y += warmth * (rand() - y);
          d[pos + j] += amp * Math.exp(-j / (len * 0.3)) * y * 2.2;
        }
      }
    }
  }
});
