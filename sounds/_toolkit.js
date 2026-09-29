/* ==========================================================
   POMOZINE SOUND TOOLKIT
   Load this before any sound file. It sets up the list that
   sound files add themselves to, plus a few shared helpers.

   ----------------------------------------------------------
   HOW THESE SOUNDS WORK (the 5-minute version)
   ----------------------------------------------------------

   Sound is a list of numbers.
     A speaker cone moves in and out. Each number says where the cone
     should be at one instant: -1 is all the way in, +1 all the way out,
     0 is resting. Play tens of thousands of these per second and you
     hear sound.

   Sample rate (sr).
     How many numbers per second. Usually 44100 or 48000.
     So one second of sound = `sr` numbers. Half a second = sr * 0.5.

   Background noises (addNoise).
     Your `fill` function gets an empty list `d` and fills every slot.
     The app then loops it, fades it in and out, and matches its volume
     to the other sounds. You never have to worry about clipping or
     loop clicks.

   Bells (addBell).
     Built from sine-wave "tones" that ring and fade. You say which
     pitch, how loud, and how long each one rings.

   ----------------------------------------------------------
   THE ONE TRICK USED EVERYWHERE: SMOOTHING (a "one-pole filter")
   ----------------------------------------------------------

       smooth += a * (input - smooth);

   Each step, `smooth` moves a fraction `a` of the way toward the input.
     - small a (0.01)  -> moves slowly -> only low, rumbly sound gets through
     - big a   (0.5)   -> moves fast   -> brighter, hissier sound
   That's a low-pass filter: it keeps the lows, removes the highs.

   Flip it around to keep only the highs (a "high-pass"):
       bright = input - smooth;

   Subtract a slow smooth from a fast smooth and you keep a band in the
   middle (a "band-pass"). Most of the sounds here are just random noise
   run through a few of these, with the volume shaped over time.

   ----------------------------------------------------------
   HANDY PATTERNS
   ----------------------------------------------------------

   Random number between -1 and 1 ....... rand()
   Random number between A and B ........ A + Math.random() * (B - A)
   A sine wave at F hertz ............... phase += 2 * Math.PI * F / sr;  Math.sin(phase)
   Something that fades out fast ........ Math.exp(-j / (sr * 0.01))   (0.01 = fades in ~10ms)
   "Happens about N times per second" ... count = Math.floor(seconds * N), put each at a random spot
   ========================================================== */

window.Pomozine = {
  noises: [],
  bells: [],

  // Register a background noise. See brown-noise.js for the simplest example.
  addNoise(def) { this.noises.push(def); },

  // Register a bell. See bright-chime.js for the simplest example.
  addBell(def) { this.bells.push(def); },

  tools: {
    // Random number between -1 and 1. This is "white noise" one sample at a time.
    rand: () => Math.random() * 2 - 1,

    // Pink noise: white noise with the highs rolled off, so it sounds darker
    // and softer. Call pinkGen() once to get a generator, then call the
    // generator once per sample.  (Paul Kellet's well-known recipe.)
    pinkGen() {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      return () => {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.96900 * b2 + w * 0.1538520;
        b3 = 0.86650 * b3 + w * 0.3104856;
        b4 = 0.55000 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.0168980;
        const out = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
        b6 = w * 0.115926;
        return out * 0.11;
      };
    }
  }
};
