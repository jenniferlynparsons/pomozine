/* ==========================================================
   BROWN NOISE
   The simplest sound here, and a good one to start playing with.

   Brown noise is what you get when each sample is the previous sample
   plus a small random nudge. The signal wanders instead of jumping,
   so it sounds deep and soft, like a distant waterfall.
   ========================================================== */

Pomozine.addNoise({
  id: 'brown',            // saved in settings; don't change once people use it
  label: 'brown noise',   // what the button says
  seconds: 14,            // length of the loop
  loudness: 0.16,         // overall level (the others are 0.09-0.12)
  mono: false,            // false = slightly different in each ear (feels wider)

  // d  = the empty list of samples to fill
  // sr = samples per second
  // ch = 0 for left ear, 1 for right ear
  fill(d, sr, ch, { rand }) {
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      // TRY: change 0.02 (bigger = brighter/rougher, smaller = deeper)
      last = (last + 0.02 * rand()) / 1.02;
      d[i] = last;
    }
  }
});
