/**
 * data/xp.js — 经验等级表（纯数据 + 需求函数）
 * xpToLevel[level] = 从 level 级升到 level+1 级所需经验。
 * 10 级之后每级所需经验 = 上一级 * 1.25，无限递增。
 * 通过 window.ZS.Data.XP 暴露。
 */
(function () {
  // 0->1 … 9->10 的升级所需经验
  const XP_TABLE = [20, 35, 55, 80, 110, 150, 200, 260, 330, 410];

  // 从 level 升到 level+1 所需经验
  function xpNeeded(level) {
    if (level < XP_TABLE.length) return XP_TABLE[level];
    let prev = XP_TABLE[XP_TABLE.length - 1];
    for (let i = XP_TABLE.length; i < level; i++) prev = Math.round(prev * 1.25);
    return Math.round(prev * 1.25);
  }

  window.ZS = window.ZS || {};
  window.ZS.Data = window.ZS.Data || {};
  window.ZS.Data.XP = { XP_TABLE, xpNeeded };
})();