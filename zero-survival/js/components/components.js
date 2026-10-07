/**
 * components/components.js — 组件定义与构建器
 * 实体 = 纯对象，组件 = 其数据字段。这里集中定义各类组件的数据形状与默认值，
 * 保证实体结构一致、便于 query 过滤与序列化。
 * 通过 window.ZS.Components 暴露。
 */
(function () {
  // 位置
  const position = (x = 0, y = 0) => ({ x, y });
  // 速度（像素/秒）
  const velocity = (vx = 0, vy = 0) => ({ vx, vy });
  // 生命
  const health = (hp = 1, maxHp = hp) => ({ hp, maxHp });
  // 外观渲染参数
  const render = (opts = {}) => ({
    shape: opts.shape || 'circle',  // circle | ellipse | square
    color: opts.color || '#fff',
    radius: opts.radius || 8,
    stroke: opts.stroke || null,
    glow: opts.glow || null,
  });
  // 移动行为
  const mover = (opts = {}) => ({
    speed: opts.speed || 0,
    slowTimer: opts.slowTimer || 0,
    knockable: !!opts.knockable,
  });
  // 怪物战斗
  const monster = (opts = {}) => ({
    type: opts.type || 'slime',
    damage: opts.damage || 1,
    xp: opts.xp || 0,
    tier: opts.tier || 'normal',
    hitFlash: 0,
  });
  // 子弹
  const bullet = (opts = {}) => ({
    damage: opts.damage || 0,
    isCrit: !!opts.isCrit,
    pierceLeft: opts.pierceLeft || 0,
    life: opts.life || 1,
    hitIds: opts.hitIds || new Set(),
  });
  // 经验球
  const orb = (opts = {}) => ({
    value: opts.value || 0,
    r: opts.r || 7,
    life: opts.life || 12,
  });
  // 追踪飞刃
  const blade = (opts = {}) => ({
    ang: opts.ang || 0,
    cd: opts.cd || 0.3,
  });
  // 画布特效
  const effect = (opts = {}) => ({
    type: opts.type || 'text',   // explosion | lightning | text | warning
    life: opts.life || 0.5,
    vy: opts.vy || 0,
  });

  window.ZS = window.ZS || {};
  window.ZS.Components = { position, velocity, health, render, mover, monster, bullet, orb, blade, effect };
})();