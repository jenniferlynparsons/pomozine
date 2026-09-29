/* ==========================================================
   POMOZINE — vanilla JS pomodoro timer
   - All sounds are synthesized with the Web Audio API (no files).
   - Bells and ambient noise are scheduled on the audio clock, so they
     stay on time even when the tab is in the background.
   ========================================================== */
(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  /* ---------------- settings ---------------- */

  const STORE_KEY = 'pomozine:v1';
  const FOCUS_OPTS = [10, 15, 20];
  const BREAK_OPTS = [10, 20];
  const ENDLESS_CYCLES = 30;      // "open-ended" = up to 30 cycles (10+ hours)
  const SCHEDULE_AHEAD = 24;      // phases of audio scheduled at once

  const DEFAULTS = {
    noise: 'brown', focus: 15, brk: 10, bell: 'bowl', volume: 0.6,
    notify: false, timeMode: 'minutes', minutes: '', until: ''
  };

  function load() {
    let s = { ...DEFAULTS };
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) s = { ...s, ...JSON.parse(raw) };
    } catch (e) { /* storage blocked: use defaults */ }
    if (!FOCUS_OPTS.includes(+s.focus)) s.focus = DEFAULTS.focus;
    if (!BREAK_OPTS.includes(+s.brk)) s.brk = DEFAULTS.brk;
    // sounds come from sounds/*.js; fall back if a saved one was removed
    const reg = window.Pomozine || { noises: [], bells: [] };
    if (!reg.noises.some((n) => n.id === s.noise)) s.noise = reg.noises[0] ? reg.noises[0].id : DEFAULTS.noise;
    if (!reg.bells.some((b) => b.id === s.bell)) s.bell = reg.bells[0] ? reg.bells[0].id : DEFAULTS.bell;
    s.focus = +s.focus; s.brk = +s.brk;
    s.volume = Math.min(1, Math.max(0, +s.volume || 0));
    return s;
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ }
  }
  const settings = load();

  /* ---------------- audio engine ---------------- */

  let ctx = null;
  let master = null;
  const buffers = {};
  let scheduled = [];   // nodes belonging to the running session
  let preview = [];     // nodes for "hear it" buttons

  const volCurve = (v) => v * v; // feels more even than linear

  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = volCurve(settings.volume);
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function killNodes(list) {
    for (const n of list) {
      if (n.gain && ctx) { try { n.gain.cancelScheduledValues(0); n.gain.setValueAtTime(0, ctx.currentTime); } catch (e) { /* ignore */ } }
      if (typeof n.stop === 'function') { try { n.stop(); } catch (e) { /* already stopped */ } }
      try { n.disconnect(); } catch (e) { /* ignore */ }
    }
    list.length = 0;
  }
  const clearSchedule = () => killNodes(scheduled);
  const clearPreview = () => killNodes(preview);

  // The sounds themselves live in sounds/*.js and register on window.Pomozine.
  const SOUNDS = window.Pomozine || { noises: [], bells: [], tools: {} };
  const noiseById = (id) => SOUNDS.noises.find((n) => n.id === id) || SOUNDS.noises[0];
  const bellById = (id) => SOUNDS.bells.find((b) => b.id === id) || SOUNDS.bells[0];

  // Turn a sound definition into a seamlessly looping stereo buffer.
  // The tail is crossfaded into the head so the loop point is inaudible,
  // then the level is matched to the other sounds and soft-clipped.
  function makeLoop(def) {
    const sr = ctx.sampleRate;
    const n = Math.floor(def.seconds * sr);
    const fade = Math.floor(0.6 * sr);
    const buf = ctx.createBuffer(2, n, sr);
    let left = null;
    for (let ch = 0; ch < 2; ch++) {
      let raw;
      if (def.mono && left) raw = left;             // same sound in both ears
      else {
        raw = new Float32Array(n + fade);
        def.fill(raw, sr, ch, SOUNDS.tools);
        for (let i = 0; i < fade; i++) {
          const t = i / fade;
          raw[i] = raw[i] * Math.sqrt(t) + raw[n + i] * Math.sqrt(1 - t);
        }
        left = raw;
      }
      buf.getChannelData(ch).set(raw.subarray(0, n));
    }
    let sum = 0;
    for (let ch = 0; ch < 2; ch++) for (const v of buf.getChannelData(ch)) sum += v * v;
    const gain = (def.loudness || 0.12) / Math.sqrt(sum / (2 * n) || 1e-9);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < n; i++) d[i] = Math.tanh(d[i] * gain);
    }
    return buf;
  }

  function getBuffer(id) {
    const def = noiseById(id);
    if (!buffers[def.id]) buffers[def.id] = makeLoop(def);
    return buffers[def.id];
  }

  // Ambient noise between two audio-clock times, with soft fades.
  function scheduleAmbient(start, end, fadeIn, list) {
    const buf = getBuffer(settings.noise);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const g = ctx.createGain();
    const len = end - start;
    const fi = Math.min(fadeIn, len / 3);
    const fo = Math.min(1.5, len / 3);
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(1, start + fi);
    g.gain.setValueAtTime(1, end - fo);
    g.gain.linearRampToValueAtTime(0, end);
    src.connect(g).connect(master);
    src.start(start, Math.random() * buf.duration);
    src.stop(end + 0.05);
    list.push(src, g);
  }

  // One ringing sine tone: quick attack, then fades out over `decay` seconds.
  function tone(freq, amp, decay, when, out, list) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(amp, when + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, when + decay);
    o.connect(g).connect(out);
    o.start(when);
    o.stop(when + decay + 0.05);
    list.push(o, g);
  }

  function scheduleBell(when, final, list, id = settings.bell) {
    const def = bellById(id);
    if (!def) return;
    const out = ctx.createGain();
    out.gain.value = 0.5;
    out.connect(master);
    list.push(out);
    def.ring({ when, final, tone: (hz, amp, decay, at) => tone(hz, amp, decay, at, out, list) });
  }

  function ringNow(final = false) {
    if (!audio()) return;
    scheduleBell(ctx.currentTime + 0.03, final, scheduled);
  }

  // Schedule every bell + ambient block from phase `idx` onward.
  function scheduleFrom(idx, remainingSec, fadeIn = 2) {
    clearSchedule();
    if (!audio()) return;
    state.schedBase = idx;
    let t = ctx.currentTime + 0.05;
    const last = state.phases.length - 1;
    for (let i = idx; i <= last && i < idx + SCHEDULE_AHEAD; i++) {
      const p = state.phases[i];
      const dur = i === idx ? remainingSec : p.sec;
      const end = t + dur;
      if (p.type === 'focus' && dur > 0.5) scheduleAmbient(t, end, i === idx ? fadeIn : 2, scheduled);
      scheduleBell(end, i === last, scheduled);
      t = end;
    }
  }

  /* ---------------- planner ---------------- */

  function planFor(total, f, b) {
    const cycles = Math.floor(total / (f + b));
    return { f, b, cycles, used: cycles * (f + b), left: total - cycles * (f + b), focusMin: cycles * f };
  }

  // The combo that wastes the fewest minutes (ties → most focus time).
  function bestFit(total) {
    let best = null;
    for (const f of FOCUS_OPTS) for (const b of BREAK_OPTS) {
      const p = planFor(total, f, b);
      if (p.cycles < 1) continue;
      if (!best || p.left < best.left || (p.left === best.left && p.focusMin > best.focusMin)) best = p;
    }
    return best;
  }

  // Minutes available, or null (open-ended), or -1 (time already passed).
  function availableMinutes() {
    if (settings.timeMode === 'minutes') {
      const v = parseInt(settings.minutes, 10);
      return Number.isFinite(v) && v > 0 ? Math.min(v, 720) : null;
    }
    if (!settings.until) return null;
    const [h, m] = settings.until.split(':').map(Number);
    const now = new Date();
    const end = new Date(now);
    end.setHours(h, m, 0, 0);
    let diff = Math.floor((end - now) / 60000);
    if (diff <= 0) diff += 1440;        // e.g. 1:00am when it's 11pm
    return diff > 720 ? -1 : diff;      // more than 12h away = probably a past time
  }

  const fmtClock = (d) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase().replace(/\s/g, '');

  /* ---------------- timer state ---------------- */

  const state = {
    status: 'idle',   // idle | running | paused | done
    phases: [],
    idx: 0,
    phaseEndsAt: 0,
    remaining: 0,
    planned: false,
    cycles: 0,
    schedBase: 0
  };

  function buildPhases(cycles) {
    const out = [];
    for (let i = 0; i < cycles; i++) {
      out.push({ type: 'focus', sec: settings.focus * 60 });
      out.push({ type: 'break', sec: settings.brk * 60 });
    }
    return out;
  }

  let ticker = null;
  function startTicker() { if (!ticker) ticker = setInterval(tick, 250); }
  function stopTicker() { clearInterval(ticker); ticker = null; }

  function start() {
    const avail = availableMinutes();
    let cycles = ENDLESS_CYCLES;
    state.planned = false;
    if (avail === -1) { flash("that time already passed. try another."); return; }
    if (avail != null) {
      const p = planFor(avail, settings.focus, settings.brk);
      if (p.cycles < 1) { flash(`not enough time for one cycle. you need ${settings.focus + settings.brk} min.`); return; }
      cycles = p.cycles;
      state.planned = true;
    }
    stopNoisePreview();
    state.cycles = cycles;
    state.phases = buildPhases(cycles);
    state.idx = 0;
    state.status = 'running';
    state.phaseEndsAt = Date.now() + state.phases[0].sec * 1000;
    scheduleFrom(0, state.phases[0].sec);
    ringNow();
    buildStrip();
    render();
    startTicker();
  }

  function pause() {
    if (state.status !== 'running') return;
    state.remaining = state.phaseEndsAt - Date.now();
    state.status = 'paused';
    clearSchedule();
    render();
  }

  function resume() {
    if (state.status !== 'paused') return;
    audio();
    state.status = 'running';
    state.phaseEndsAt = Date.now() + state.remaining;
    scheduleFrom(state.idx, state.remaining / 1000, 0.8);
    render();
  }

  function skip() {
    if (state.status !== 'running' && state.status !== 'paused') return;
    if (state.idx >= state.phases.length - 1) {
      clearSchedule();
      ringNow(true);
      finish();
      return;
    }
    state.idx++;
    const sec = state.phases[state.idx].sec;
    if (state.status === 'running') {
      state.phaseEndsAt = Date.now() + sec * 1000;
      scheduleFrom(state.idx, sec, 1);
    } else {
      clearSchedule();
      state.remaining = sec * 1000;
    }
    ringNow();
    onPhaseChange();
  }

  function stop() {
    clearSchedule();
    stopTicker();
    state.status = 'idle';
    state.phases = [];
    buildStrip();
    render();
  }

  function finish() {
    // let the final bell ring out: drop references without cutting audio
    scheduled = [];
    state.status = 'done';
    state.idx = state.phases.length;
    stopTicker();
    notify('session done', 'that was the last break. nice work.');
    buildStrip();
    render();
  }

  function tick() {
    if (state.status !== 'running') return;
    const now = Date.now();
    let changed = false;
    while (now >= state.phaseEndsAt) {
      if (state.idx >= state.phases.length - 1) { finish(); return; }
      state.idx++;
      state.phaseEndsAt += state.phases[state.idx].sec * 1000;
      changed = true;
    }
    if (changed) onPhaseChange();
    else render();
  }

  function onPhaseChange() {
    const p = state.phases[state.idx];
    // open-ended runs: top up the audio schedule at the start of a (silent) break
    if (state.status === 'running' && p.type === 'break' && state.idx - state.schedBase >= SCHEDULE_AHEAD / 2) {
      scheduleFrom(state.idx, (state.phaseEndsAt - Date.now()) / 1000);
    }
    const lastBreak = state.idx === state.phases.length - 1;
    if (p.type === 'focus') notify('focus', `${settings.focus} min. one thing.`);
    else notify(lastBreak ? 'last break' : 'break', `${settings.brk} min. stand up, drink water.`);
    buildStrip();
    render();
  }

  /* ---------------- notifications ---------------- */

  function notify(title, body) {
    if (!settings.notify || !('Notification' in window) || Notification.permission !== 'granted') return;
    try { new Notification(`pomozine: ${title}`, { body, tag: 'pomozine', silent: true }); } catch (e) { /* ignore */ }
  }

  /* ---------------- rendering ---------------- */

  const el = {
    body: document.body,
    clock: $('#clock'),
    stamp: $('#phaseLabel'),
    cycle: $('#cycleLabel'),
    tagline: $('#tagline'),
    strip: $('#strip'),
    start: $('#startBtn'),
    pause: $('#pauseBtn'),
    skip: $('#skipBtn'),
    stop: $('#stopBtn'),
    planText: $('#planText'),
    suggest: $('#suggest'),
    suggestText: $('#suggestText'),
    lengthFields: $('#lengthFields'),
    planFields: $('#planFields'),
    hearNoise: $('#hearNoise')
  };

  const TAGLINES = {
    idle: 'set it up below, then hit start.',
    focus: 'head down. one thing.',
    break: 'stand up. water. look at something far away.',
    lastBreak: 'last break. you made it.',
    paused: 'paused. take the time you need.',
    done: "that's the session. you did the thing."
  };

  const mmss = (ms) => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };

  let flashTimer = null;
  function flash(msg) {
    el.tagline.textContent = msg;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { flashTimer = null; render(); }, 4000);
  }

  function render() {
    const s = state.status;
    const p = state.phases[state.idx];
    const active = s === 'running' || s === 'paused';
    const phase = active ? p.type : s === 'done' ? 'done' : 'idle';
    el.body.dataset.phase = phase;

    // clock
    let ms = settings.focus * 60000;
    if (s === 'running') ms = state.phaseEndsAt - Date.now();
    else if (s === 'paused') ms = state.remaining;
    else if (s === 'done') ms = 0;
    el.clock.textContent = mmss(ms);

    // stamp
    el.stamp.textContent = s === 'paused' ? 'paused' : active ? p.type : s === 'done' ? 'done!' : 'ready';

    // cycle label
    const lastBreak = active && state.idx === state.phases.length - 1;
    if (active) {
      const n = Math.floor(state.idx / 2) + 1;
      el.cycle.textContent = `cycle ${n} of ${state.planned ? state.cycles : '∞'}${lastBreak ? ' · last break' : ''}`;
    } else if (s === 'done') {
      el.cycle.textContent = `${state.cycles} cycle${state.cycles === 1 ? '' : 's'} done`;
    } else {
      const avail = availableMinutes();
      const pl = avail > 0 ? planFor(avail, settings.focus, settings.brk) : null;
      el.cycle.textContent = pl && pl.cycles > 0 ? `${pl.cycles} cycle${pl.cycles === 1 ? '' : 's'} planned` : 'open-ended';
    }

    // tagline (unless a flash message is showing)
    if (!flashTimer || s !== 'idle') {
      el.tagline.textContent = s === 'paused' ? TAGLINES.paused
        : active ? (lastBreak ? TAGLINES.lastBreak : TAGLINES[p.type])
        : TAGLINES[s];
    }

    // buttons
    el.start.hidden = active;
    el.start.textContent = s === 'done' ? 'again' : 'start';
    el.pause.hidden = !active;
    el.pause.textContent = s === 'paused' ? 'resume' : 'pause';
    el.skip.hidden = !active;
    el.stop.hidden = !active;
    el.lengthFields.disabled = active;
    el.planFields.disabled = active;
    el.hearNoise.disabled = active;

    // tab title
    document.title = active ? `${mmss(ms)} ${s === 'paused' ? 'PAUSED' : p.type.toUpperCase()} · pomozine`
      : s === 'done' ? 'done! · pomozine' : 'pomozine';

    // progress fill on the current strip block
    const cur = el.strip.querySelector('.blk.now .fill');
    if (cur && active) {
      const pct = 100 * (1 - ms / (p.sec * 1000));
      cur.style.width = `${Math.min(100, Math.max(0, pct))}%`;
    }

    renderPlan();
  }

  // Strip of blocks: preview when idle, progress while running.
  function buildStrip() {
    el.strip.textContent = '';
    let phases, idx;
    if (state.status === 'idle') {
      const avail = availableMinutes();
      const pl = avail > 0 ? planFor(avail, settings.focus, settings.brk) : null;
      if (!pl || pl.cycles < 1) return;
      phases = buildPhases(pl.cycles);
      idx = -1;
    } else {
      phases = state.phases;
      idx = state.idx;
    }
    const MAX = 16;
    let from = 0;
    if (!state.planned && state.status !== 'idle') from = Math.max(0, idx - 2);
    const shown = phases.slice(from, from + MAX);
    shown.forEach((p, k) => {
      const i = from + k;
      const b = document.createElement('div');
      b.className = `blk ${p.type}${i < idx ? ' done' : ''}${i === idx ? ' now' : ''}`;
      b.style.flexGrow = p.sec;
      if (i === idx) b.appendChild(Object.assign(document.createElement('span'), { className: 'fill' }));
      el.strip.appendChild(b);
    });
    if (from + MAX < phases.length) {
      const more = document.createElement('span');
      more.className = 'strip-more';
      more.textContent = state.planned ? '…' : '→ ∞';
      el.strip.appendChild(more);
    }
  }

  function renderPlan() {
    const avail = availableMinutes();
    el.suggest.hidden = true;
    if (avail == null) {
      el.planText.textContent = 'leave it blank to run open-ended — it keeps cycling until you hit stop.';
      return;
    }
    if (avail === -1) {
      el.planText.textContent = "that time's already passed. pick a later one.";
      return;
    }
    const p = planFor(avail, settings.focus, settings.brk);
    const best = bestFit(avail);
    if (p.cycles < 1) {
      el.planText.textContent = `${avail} min isn't enough for one ${settings.focus}+${settings.brk} cycle (${settings.focus + settings.brk} min).`;
    } else {
      const endsAt = fmtClock(new Date(Date.now() + p.used * 60000));
      el.planText.innerHTML = '';
      const strong = document.createElement('strong');
      strong.textContent = `${p.cycles} cycle${p.cycles === 1 ? '' : 's'}`;
      el.planText.append(
        strong,
        ` of ${p.f} on / ${p.b} off = ${p.focusMin} min of focus. ends on a break at ~${endsAt}. `,
        p.left ? `${p.left} min spare.` : 'zero minutes wasted.'
      );
    }
    if (best && (best.f !== settings.focus || best.b !== settings.brk) && (p.cycles < 1 || best.left < p.left)) {
      el.suggestText.textContent = `better fit: ${best.f} on / ${best.b} off × ${best.cycles} → ${best.left ? best.left + ' min spare' : 'zero wasted'}`;
      el.suggest.hidden = false;
      el.suggest.dataset.f = best.f;
      el.suggest.dataset.b = best.b;
    }
  }

  /* ---------------- wiring ---------------- */

  function setRadio(name, value) {
    const r = $(`input[name="${name}"][value="${value}"]`);
    if (r) r.checked = true;
  }

  function syncForm() {
    setRadio('noise', settings.noise);
    setRadio('focus', settings.focus);
    setRadio('brk', settings.brk);
    setRadio('bell', settings.bell);
    setRadio('timeMode', settings.timeMode);
    $('#volume').value = settings.volume;
    $('#minutes').value = settings.minutes;
    $('#until').value = settings.until;
    $('#notify').checked = settings.notify && 'Notification' in window && Notification.permission === 'granted';
    $('#minutesWrap').hidden = settings.timeMode !== 'minutes';
    $('#untilWrap').hidden = settings.timeMode !== 'until';
  }

  function settingsChanged() {
    save();
    if (state.status === 'idle') buildStrip();
    render();
  }

  // one button per sound file loaded in index.html
  function buildSoundChips(containerId, name, list) {
    const box = document.getElementById(containerId);
    box.textContent = '';
    for (const def of list) {
      const label = document.createElement('label');
      label.className = 'chip';
      const input = Object.assign(document.createElement('input'), { type: 'radio', name, value: def.id });
      const span = document.createElement('span');
      span.textContent = def.label || def.id;
      label.append(input, span);
      box.appendChild(label);
    }
  }
  buildSoundChips('noiseChips', 'noise', SOUNDS.noises);
  buildSoundChips('bellChips', 'bell', SOUNDS.bells);

  $$('input[type="radio"]').forEach((r) => r.addEventListener('change', () => {
    const v = r.value;
    if (r.name === 'focus' || r.name === 'brk') settings[r.name] = +v;
    else settings[r.name] = v;
    if (r.name === 'timeMode') syncForm();
    // live changes to sound while a session runs
    if ((r.name === 'noise' || r.name === 'bell') && state.status === 'running') {
      scheduleFrom(state.idx, (state.phaseEndsAt - Date.now()) / 1000, 0.8);
    }
    if (r.name === 'noise' && previewTimer) playNoisePreview();
    settingsChanged();
  }));

  $('#volume').addEventListener('input', (e) => {
    settings.volume = +e.target.value;
    if (master) master.gain.setTargetAtTime(volCurve(settings.volume), ctx.currentTime, 0.05);
    save();
  });

  $('#minutes').addEventListener('input', (e) => { settings.minutes = e.target.value; settingsChanged(); });
  $('#until').addEventListener('input', (e) => { settings.until = e.target.value; settingsChanged(); });
  $('#clearTime').addEventListener('click', () => {
    settings.minutes = ''; settings.until = '';
    syncForm(); settingsChanged();
  });

  $('#useSuggest').addEventListener('click', () => {
    settings.focus = +el.suggest.dataset.f;
    settings.brk = +el.suggest.dataset.b;
    syncForm(); settingsChanged();
  });

  // "hear it" preview: plays until stopped (or 20s), follows the selected sound
  let previewTimer = null;
  function stopNoisePreview() {
    clearTimeout(previewTimer);
    previewTimer = null;
    clearPreview();
    el.hearNoise.textContent = '\u25b6 hear it';
  }
  function playNoisePreview() {
    if (!audio()) return;
    clearTimeout(previewTimer);
    clearPreview();
    const t = ctx.currentTime + 0.05;
    scheduleAmbient(t, t + 20, 0.6, preview);
    el.hearNoise.textContent = '\u25a0 stop';
    previewTimer = setTimeout(stopNoisePreview, 20000);
  }
  el.hearNoise.addEventListener('click', () => (previewTimer ? stopNoisePreview() : playNoisePreview()));
  $('#hearBell').addEventListener('click', () => {
    if (!audio()) return;
    scheduleBell(ctx.currentTime + 0.03, false, []);
  });

  $('#notify').addEventListener('change', async (e) => {
    const note = $('#notifyNote');
    if (!e.target.checked) { settings.notify = false; save(); return; }
    if (!('Notification' in window)) {
      e.target.checked = false;
      note.textContent = "this browser doesn't do pop-ups. the bell still works.";
      return;
    }
    let perm = Notification.permission;
    if (perm === 'default') { try { perm = await Notification.requestPermission(); } catch (err) { perm = 'denied'; } }
    settings.notify = perm === 'granted';
    e.target.checked = settings.notify;
    note.textContent = settings.notify ? "on. you'll get a pop-up at each switch."
      : 'your browser blocked pop-ups for this page. allow them in site settings to turn this on.';
    save();
  });

  el.start.addEventListener('click', start);
  el.pause.addEventListener('click', () => (state.status === 'paused' ? resume() : pause()));
  el.skip.addEventListener('click', skip);

  // stop needs two taps so a stray click doesn't end a session
  let armTimer = null;
  el.stop.addEventListener('click', () => {
    if (el.stop.classList.contains('armed')) {
      clearTimeout(armTimer);
      el.stop.classList.remove('armed');
      el.stop.textContent = 'stop';
      stop();
      return;
    }
    el.stop.classList.add('armed');
    el.stop.textContent = 'sure?';
    armTimer = setTimeout(() => { el.stop.classList.remove('armed'); el.stop.textContent = 'stop'; }, 3000);
  });

  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' || e.repeat) return;
    const tag = e.target.tagName;
    if (['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'LABEL'].includes(tag)) return;
    e.preventDefault();
    if (state.status === 'running') pause();
    else if (state.status === 'paused') resume();
    else start();
  });

  // keep the "until" math and preview fresh while idle
  setInterval(() => { if (state.status === 'idle' || state.status === 'done') { if (state.status === 'idle') buildStrip(); render(); } }, 30000);

  syncForm();
  buildStrip();
  render();
})();
