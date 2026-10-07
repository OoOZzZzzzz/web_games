/**
 * core/audio.js — WebAudio 程序化音效
 * 不依赖音频文件，全部振荡器合成，零资源自包含。
 * 浏览器要求首次点击后才可播放，AudioContext 懒创建。
 * 通过 window.ZS.Sfx 暴露。
 */
(function () {
  let ctx = null;
  let master = null;
  let enabled = true;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
    return ctx;
  }

  function tone(type, freq0, freq1, dur, vol = 0.3) {
    if (!enabled || !ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq0, t);
    if (freq1 !== freq0) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freq1), t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  const Sfx = {
    ensure,
    pickup() { ensure(); tone('sine', 1320, 1760, 0.08, 0.20); },
    kill() { ensure(); tone('triangle', 220, 90, 0.10, 0.22); },
    levelUp() { ensure(); tone('sine', 660, 880, 0.10, 0.25); setTimeout(() => tone('sine', 990, 1320, 0.16, 0.28), 90); },
    select() { ensure(); tone('sawtooth', 1200, 500, 0.12, 0.15); },
    hurt() { ensure(); tone('square', 160, 70, 0.14, 0.22); },
    boss() { ensure(); tone('sawtooth', 90, 60, 0.6, 0.28); setTimeout(() => tone('sawtooth', 70, 45, 0.8, 0.30), 200); },
    setEnabled(v) { enabled = !!v; },
  };

  window.ZS = window.ZS || {};
  window.ZS.Sfx = Sfx;
})();