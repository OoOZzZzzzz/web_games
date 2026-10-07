/**
 * audio.js — WebAudio 程序化音效
 * 零级求生：技能狂潮
 *
 * 不依赖任何音频文件，全部用振荡器合成，保证零资源自包含。
 * 浏览器要求：首次点击后才可播放音频，因此 AudioContext 懒创建。
 */

const Sfx = (() => {
  let ctx = null;      // AudioContext（懒加载）
  let master = null;   // 主音量节点
  let enabled = true;  // 音效开关

  // 创建音频上下文（必须在用户手势中调用）
  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.35; // 总音量
    master.connect(ctx.destination);
    return ctx;
  }

  // 播放一个基础音：振荡器 + 音量包络
  // type: 波形  freq0: 起始频率  freq1: 结束频率（扫频）  dur: 时长  vol: 峰值音量
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

  // ---------- 各场景音效 ----------

  // 拾取经验：叮（清脆短音）
  function pickup() {
    ensure();
    tone('sine', 1320, 1760, 0.08, 0.20);
  }

  // 击杀怪物：噗（低频短促音）
  function kill() {
    ensure();
    tone('triangle', 220, 90, 0.10, 0.22);
  }

  // 升级：叮咚！（双音上行）
  function levelUp() {
    ensure();
    tone('sine', 660, 880, 0.10, 0.25);
    setTimeout(() => tone('sine', 990, 1320, 0.16, 0.28), 90);
  }

  // 技能选择确认：唰（快速下滑音）
  function select() {
    ensure();
    tone('sawtooth', 1200, 500, 0.12, 0.15);
  }

  // 角色受伤：咚（沉闷低音）
  function hurt() {
    ensure();
    tone('square', 160, 70, 0.14, 0.22);
  }

  // BOSS 登场：轰鸣警告
  function boss() {
    ensure();
    tone('sawtooth', 90, 60, 0.6, 0.28);
    setTimeout(() => tone('sawtooth', 70, 45, 0.8, 0.30), 200);
  }

  // 对外 API
  return {
    ensure, pickup, kill, levelUp, select, hurt, boss,
    setEnabled(v) { enabled = !!v; },
  };
})();