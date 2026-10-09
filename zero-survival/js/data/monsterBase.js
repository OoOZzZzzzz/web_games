/**
 * data/monsterBase.js — 怪物/BOSS 基类（继承体系）
 * 定义所有怪物的公共字段与外观结构，怪物/BOSS 继承并覆盖。
 * 支持 features(特色行为) 与 abilities(能力) 钩子，便于扩展新怪物。
 * 通过 window.ZS.Data.monsterBase 暴露。
 */
(function () {
  const monsterBase = {
    // ---- 通用战斗 ----
    tier: 'normal',        // normal | elite | boss
    shape: 'circle',       // circle | ellipse | square
    unlockLv: 0,
    radius: 14,            // 碰撞/绘制半径（怪物可覆盖）

    // ---- 基础数值（被 stats 覆盖） ----
    stats: {
      hp: 30,
      speed: 58,
      damage: 8,
      xp: 8,
    },

    // ---- 外观结构（结构化，渲染读取） ----
    appearance: {
      color: '#ffffff',
      stroke: 'rgba(0,0,0,0.45)',   // 描边
      glow: null,                   // 外辉光色（null=无）
      highlight: null,              // 高光（rgba）
      eyes: true,                   // 是否绘制眼睛
      eyeColor: '#1a1a24',          // 瞳孔色
      core: '#ffffff',              // 内部核心色
    },

    // ---- 特色/能力钩子（为后续扩展预留） ----
    features: [],        // 特色行为 id：如 'bouncy' 'heavy' 'fast' 'zigzag' 'regenerate'
    abilities: [],       // 能力 id：如 'explodeOnDeath' 'lifesteal' 'summonMinions'
    onSpawn: null,       // 出生特效钩子（world/spawn 调用）
    onDeath: null,       // 死亡特效钩子（combat 调用）
    onHit: null,         // 受击特效钩子（combat 调用）
  };

  window.ZS = window.ZS || {};
  window.ZS.Data = window.ZS.Data || {};
  window.ZS.Data.monsterBase = monsterBase;
})();