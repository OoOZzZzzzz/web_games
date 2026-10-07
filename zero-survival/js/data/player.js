/**
 * data/player.js — 玩家模型（纯数据）
 * 玩家 Lv0 基础数值 + 外观。改数值/外观只动这里。
 * 通过 window.ZS.Data.player 暴露。
 */
(function () {
  const player = {
    // ---- 基础属性 ----
    maxHp: 100,
    moveSpeed: 210,
    attackDamage: 10,
    fireRate: 1,
    bulletSpeed: 460,
    radius: 14,
    invulnTime: 0.6,

    // ---- 外观 ----
    color: '#4fc3f7',
    stroke: '#b3e5fc',
    highlight: 'rgba(255,255,255,0.18)',
    gunColor: '#ffd54f',

    // ---- 升级 ----
    startLevel: 0,
    startXp: 0,
  };

  window.ZS = window.ZS || {};
  window.ZS.Data = window.ZS.Data || {};
  window.ZS.Data.player = player;
})();