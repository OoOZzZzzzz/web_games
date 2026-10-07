/**
 * core/rng.js — 随机工具
 * 支持种子化（mulberry32），为「随机开局 / 可复现」预留。
 * 通过 window.ZS.RNG 暴露。
 */
(function () {
  let current = Math.random;

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const RNG = {
    // 切换到种子随机源（seed 为整数）
    seed(s) { current = mulberry32(s); },
    // 切回系统随机
    unseed() { current = Math.random; },
    // [0,1)
    next() { return current(); },
    // [0, n) 整数
    int(n) { return Math.floor(current() * n); },
    // [min, max]
    range(min, max) { return min + current() * (max - min); },
    // 从数组随机取一个
    pick(arr) { return arr[Math.floor(current() * arr.length)]; },
    // 概率判定
    chance(p) { return current() < p; },
    // Fisher-Yates 洗牌
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(current() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
  };

  window.ZS = window.ZS || {};
  window.ZS.RNG = RNG;
})();