/* ==========================================================
   BRIGHT CHIME (bell)

   Three high notes played quickly one after another (E6, A6, E7).
   Each note gets two faint overtones so it sounds like a bell,
   not a plain beep.

   tone(pitchHz, loudness, ringSeconds, startTime)
   ========================================================== */

Pomozine.addBell({
  id: 'chime',
  label: 'bright chime',

  ring({ when, final, tone }) {
    // TRY: other notes. Middle C is 261.63; each octave up doubles it.
    const NOTES = [1318.5, 1760, 2637];
    const GAP = 0.13;   // seconds between notes

    const arpeggio = (at) => {
      NOTES.forEach((hz, i) => {
        const t = at + i * GAP;
        tone(hz, 0.32, 2.4, t);          // the note
        tone(hz * 2.01, 0.1, 1.2, t);    // overtone
        tone(hz * 3.02, 0.05, 0.6, t);   // higher, quieter overtone
      });
    };

    arpeggio(when);
    if (final) {
      arpeggio(when + 0.8);
      arpeggio(when + 1.6);
    }
  }
});
