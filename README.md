# pomozine

A cut-and-paste pomodoro timer with background sounds. Plain HTML, CSS, and JavaScript. No accounts, no tracking, no build step, no audio files.

[Demo](https://jenniferlynparsons.github.io/pomozine/)


---

## Quick start

1. Double-click `index.html` to open it in your browser.
2. Pick a sound, your focus and break lengths, and a bell.
3. (Optional) Tell it how much time you have.
4. Hit **start**.

---

## How to use it

### 1. Pick your noise

| Sound | What it's like |
|---|---|
| brown noise | Deep, soft, steady. Like a distant waterfall |
| fireplace | Low roar, warm crackles, the occasional pop |
| rain | Steady rain with drops and drips, no thunder |
| mixtape hiss | A cassette deck: soft tape hiss and wobbly reels |

- **hear it** plays a preview. Click again to stop.
- **volume** sets the level for the noise and the bells.
- The noise plays during focus and goes quiet during breaks, so the silence itself tells you it's break time.

### 2. Pick your lengths

- **Focus:** 10, 15, or 20 minutes
- **Break:** 10 or 20 minutes

Every break is the same length. There's no long break after a set number of cycles.

### 3. Pick your bell

- **singing bowl:** low and shimmery
- **bright chime:** three quick high notes

The bell rings when you start, every time focus and break switch, and three times at the very end. Click **hear it** to preview.

### 4. How much time do you have?

Choose one:

- **minutes:** type how many minutes you have, e.g. `90`
- **until a time:** pick when you need to stop, e.g. 3:30pm

The planner tells you:

- how many cycles fit (one cycle = one focus + one break)
- how much focus time that adds up to
- roughly when you'll finish
- how many minutes are left over

**A session always ends on a break**, so you never stop mid-focus.

If another combination of lengths wastes fewer minutes, a pink **better fit** box appears. Click **use this** to switch to it, or ignore it.

Leave the time blank to run **open-ended**: it keeps cycling until you stop it.

### 5. Extras

- **pop-up when it switches:** shows a desktop notification at each change, handy if your sound is muted. Your browser asks for permission the first time.

---

## While it's running

| Control | What it does |
|---|---|
| **pause / resume** | Freezes the timer and the sound |
| **skip →** | Jumps to the next focus or break right away |
| **stop** | Ends the session. Click twice ("sure?") so a stray click can't end it |
| **space bar** | Start, pause, or resume |

Things to know:

- **The browser tab** shows the countdown, e.g. `12:34 FOCUS`, so you can check it from another tab.
- **The card flips to black** during breaks and turns pink when you're done.
- **The strip of blocks** shows your whole session. Pink blocks are focus, striped blocks are breaks, finished ones get crossed out, and the current block fills up as time passes.
- You can change the **noise, bell, and volume** mid-session. Lengths and time are locked until you stop.
- **Your settings are saved** in your browser and are there next time you open it.

---

## Troubleshooting

**No sound.** Browsers only allow sound after you click something on the page. Click **start** or a **hear it** button. Check the volume slider and your computer's volume.

**Pop-ups don't appear.** Some browsers block notifications for files opened straight from your computer. They work once the page is on a website. Also check your browser's site settings and your computer's notification settings.

**The bell was late while I was in another tab.** It shouldn't be: bells are scheduled on the audio clock, which keeps running in the background. The on-screen timer and pop-ups can lag a few seconds in a background tab, though.

**My settings disappeared.** They're saved per browser. A private window, a different browser, or clearing site data starts fresh.

---

## Put it online

Upload the whole folder to any static host (GitHub Pages, Netlify, Neocities, your own server). Keep the files together:

```
pomozine/
├── index.html
├── style.css
├── app.js
└── sounds/
```

Any number of people can use it at once. Each visitor's timer runs entirely in their own browser, so nobody's session affects anyone else's.

---

## What's in the box

| File | What it does |
|---|---|
| `index.html` | Page structure, and the list of sound files to load |
| `style.css` | The zine look. Colors are at the top in `:root` |
| `app.js` | Timer, planner, and the audio engine that plays the sounds |
| `sounds/` | One file per sound. This is the fun part |

Fonts load from Google Fonts. Offline, it falls back to built-in fonts and still works.

---

## Playing with the sounds

Every sound is made from math when the page loads. Each one lives in its own file in `sounds/`:

| File | Sound |
|---|---|
| `_toolkit.js` | Start here. Explains how the sounds work, plus shared helpers |
| `brown-noise.js` | The simplest one. A good first file to tinker with |
| `rain.js` | Dark wash + tiny drops + a few big drips |
| `fireplace.js` | Fluttering roar + big pops + crackles |
| `mixtape.js` | Pink-noise hiss + wobbly reels + motor |
| `singing-bowl.js` | Bell: metal-sounding tones that shimmer |
| `bright-chime.js` | Bell: three quick high notes |
| `_template.js` | A starter "ocean" sound to copy for your own |

Lines marked `TRY:` are good numbers to change. Edit, save, refresh the page.

**To add a new sound:**

1. Copy `_template.js` and give the copy a new name, e.g. `ocean.js`.
2. Change its `id` and `label`.
3. In `index.html`, add `<script src="sounds/ocean.js"></script>` next to the other sound files.
4. Refresh. A button for it appears automatically.

**If a sound breaks:** open the browser console (Cmd+Option+J in Chrome, Cmd+Option+C in Safari once the Develop menu is turned on). The error names the file and line.
