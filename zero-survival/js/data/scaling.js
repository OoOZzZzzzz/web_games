/**
 * data/scaling.js — 难度曲线数值（纯数据）
 * 集中「运行编排」所需的所有数值公式参数，改难度只动这里。
 * 由 systems/scaling.js 与 systems/spawn.js 读取。
 * 通过 window.ZS.Data.scaling 暴露。
 */
(function () {
  const scaling = {
    // ---- 怪物刷新节奏 ----
    spawn: {
      baseInterval: 1.5,      // Lv0 基础刷新间隔（秒/只）
      minInterval: 0.18,      // 间隔下限
      intervalPerLv: 0.055,   // 每级缩短量
      baseMaxEnemies: 18,     // 同屏上限（Lv0）
      maxEnemiesPerLv: 7,     // 每级上限增量
      eliteChanceBase: 0.06,  // 精英概率（Lv6 起）
      spawnMargin: 30,        // 边缘出生外延
      minSpawnDist: 160,      // 与玩家最小出生距离
    },

    // ---- 玩家每提升 5 级，全怪物加强 ----
    per5Lv: {
      hp: 0.15,   // 怪物血量 +15%
      dmg: 0.10,  // 怪物伤害 +10%
    },

    // ---- 怪物移速随等级微量提升 ----
    speedPerLv: 0.012,

    // ---- BOSS 登场 ----
    bossEveryLv: 10,          // 每 10 级刷新一只 BOSS
  };

  window.ZS = window.ZS || {};
  window.ZS.Data = window.ZS.Data || {};
  window.ZS.Data.scaling = scaling;
})();