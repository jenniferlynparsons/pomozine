/* ==========================================================
   TIBETAN SINGING BOWL (bell)

   A metal bowl rings at several pitches at once, and they are NOT
   neat multiples of each other (that's what makes it sound like metal
   instead of a musical instrument). Each pitch is played twice, very
   slightly out of tune, which makes the slow "wah-wah" shimmer.

   tone(pitchHz, loudness, ringSeconds, startTime)
   ========================================================== */

Pomozine.addBell({
  id: 'bowl',
  label: 'singing bowl',

  // when  = the moment to ring (in audio-clock seconds)
  // final = true at the very end of a session (ring a bit more)
  ring({ when, final, tone }) {
    const BASE = 220;   // TRY: 180 for a bigger bowl, 300 for a smaller one

    const strike = (at, strength) => {
      //   [pitch ratio, loudness, ring seconds]
      const partials = [
        [1,    0.55, 9],
        [2.71, 0.28, 6.5],
        [5.13, 0.12, 4],
        [8.3,  0.05, 2.5]
      ];
      for (const [ratio, amp, ring] of partials) {
        tone(BASE * ratio, amp * strength, ring, at);
        // TRY: 1.0035 -> 1.008 for a faster shimmer
        tone(BASE * ratio * 1.0035, amp * 0.8 * strength, ring * 0.9, at);
      }
    };

    strike(when, 1);
    if (final) {
      strike(when + 2.4, 0.8);
      strike(when + 4.8, 0.6);
    }
  }
});
