/**
 * core/config.js — 全局常量与基础配置
 * 零级求生：技能狂潮（ECS 重构）
 * 只存放「数字、颜色、开关」等静态配置；玩家局内动态属性由 World 管理。
 * 通过 window.ZS.CONFIG 暴露。
 */
(function () {
  const CONFIG = {

    // ---- 画布 / 场景 ----
    canvas: {
      bg: '#0b0e14',          // 背景色（渲染系统径向渐变外围色）
      gridColor: '#131a26',   // 网格线颜色
      gridSize: 48,           // 网格间距（像素）
      gridOffset: 24,         // 网格起始偏移
    },

    // ---- 玩家 Lv0 初始基础属性 ----
    player: {
      maxHp: 100,
      moveSpeed: 210,
      attackDamage: 10,
      fireRate: 1,
      bulletSpeed: 460,
      radius: 14,
      color: '#4fc3f7',
      invulnTime: 0.6,
    },

    // ---- 经验球 ----
    orb: {
      radius: 7,
      color: '#ffd54f',
      colorInner: '#fff3c4',
      magnetRadius: 70,
      magnetSpeed: 420,
    },

    // ---- 自动瞄准普攻 ----
    attack: {
      bulletRadius: 4,
      bulletColor: '#ffd54f',
      bulletLife: 1.4,
      maxBullets: 500,
      reticleRange: 380,
    },

    // ---- 怪物刷新（基础值，随等级动态缩放） ----
    spawn: {
      baseInterval: 1.5,
      minInterval: 0.18,
      intervalPerLv: 0.055,
      baseMaxEnemies: 18,
      maxEnemiesPerLv: 7,
      eliteChanceBase: 0.06,
      spawnMargin: 30,
      minSpawnDist: 160,
    },

    // ---- 怪物数值缩放（玩家每提升5级，全怪物加强） ----
    scaling: {
      hpPer5Lv: 0.15,
      dmgPer5Lv: 0.10,
    },

    // ---- 受击保护 ----
    hit: {
      knockback: 60,
      flashTime: 0.15,
    },

    // ---- 时间 ----
    time: {
      maxDt: 0.05,
    },
  };

  window.ZS = window.ZS || {};
  window.ZS.CONFIG = CONFIG;
})();