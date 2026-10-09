/**
 * data/player.js — 玩家模型（纯数据）
 * 基础数值 + 结构化外观(appearance)。基础外观与当前风格主题合成最终实体外观。
 * 数值属性用户后续提供；此处仅外观结构化 + 现有基础数值。
 * 通过 window.ZS.Data.player 暴露。
 */
(function () {
  const player = {
    // ---- 基础数值（不变，用户后续扩展） ----
    maxHp: 100,
    moveSpeed: 210,
    attackDamage: 10,
    fireRate: 1,
    bulletSpeed: 460,
    radius: 14,
    invulnTime: 0.6,

    // ---- 升级 ----
    startLevel: 0,
    startXp: 0,

    // ---- 外观结构（结构化；与风格主题合成实际外观） ----
    appearance: {
      color: '#4fc3f7',
      stroke: '#b3e5fc',
      highlight: 'rgba(255,255,255,0.18)',
      gunColor: '#ffd54f',
      glow: '#4fc3f7',        // 外辉光色
      core: '#e1f5fe',        // 内部核心色
      eyes: true,
    },
  };

  window.ZS = window.ZS || {};
  window.ZS.Data = window.ZS.Data || {};
  window.ZS.Data.player = player;
})();