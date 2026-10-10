/**
 * systems/skill-visuals.js — 技能视觉系统
 * 集中管理「每个技能在玩家身上的被动视觉」。注册表(passives)：新增技能视觉=注册一个渲染器。
 * 每个已拥有技能都会显示：① 专属被动视觉(如护甲弧段/力量光环) ② 一个环绕光点。
 * 通过 window.ZS.Systems.SkillVisuals 暴露。
 */
(function () {
  const SKILL_MAP = window.ZS.Data.SKILL_MAP;
  const passives = {};

  // 注册某技能的玩家被动视觉渲染器
  function define(id, renderer) { passives[id] = renderer; }

  const SkillVisuals = {
    draw(ctx, world) {
      const p = world.player;
      if (!p) return;
      const t = world.elapsed;
      const x = p.x, y = p.y, radius = p.radius;

      // 1. 各已拥有技能的专属被动视觉
      for (const id in world.skills) {
        if (world.skills[id] > 0 && passives[id]) {
          passives[id](ctx, world, x, y, radius, t);
        }
      }

      // 2. 每个技能的环绕光点（明显提示）
      const owned = Object.keys(world.skills);
      if (owned.length) {
        const r = radius + 16;
        owned.forEach((id, i) => {
          const sk = SKILL_MAP[id];
          const col = (sk && sk.visual && sk.visual.color) || '#ffd54f';
          const ang = t * 0.7 + (i / owned.length) * Math.PI * 2;
          ctx.beginPath(); ctx.arc(x + Math.cos(ang) * r, y + Math.sin(ang) * r, 3, 0, Math.PI * 2);
          ctx.fillStyle = col; ctx.globalAlpha = 0.9; ctx.fill();
          ctx.globalAlpha = 1;
        });
      }
    },
  };

  // ===================== 各技能专属被动视觉 =====================

  // 减伤护甲：旋转护盾弧段
  define('armor', (ctx, world, x, y, radius, t) => {
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = 'rgba(180,205,220,0.95)';
    ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.shadowColor = '#b0bec5'; ctx.shadowBlur = 6;
    for (let i = 0; i < 3; i++) {
      const a0 = t * 0.9 + (i * Math.PI * 2) / 3;
      ctx.beginPath(); ctx.arc(0, 0, radius + 9, a0, a0 + 0.9); ctx.stroke();
    }
    ctx.shadowBlur = 0; ctx.restore();
  });

  // 攻击强化：力量红光环
  define('attackBoost', (ctx, world, x, y, radius, t) => {
    const a = 0.3 + 0.2 * Math.sin(t * 4);
    ctx.save(); ctx.shadowColor = '#ff5722'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(x, y, radius + 12, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,80,40,${a})`; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
  });

  // 迅捷：常驻环绕速度线
  define('haste', (ctx, world, x, y, radius, t) => {
    ctx.save(); ctx.strokeStyle = 'rgba(79,195,247,0.75)';
    ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const ang = t * 1.2 + (i * Math.PI * 2) / 3;
      const bx = x + Math.cos(ang) * (radius + 13);
      const by = y + Math.sin(ang) * (radius + 13);
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - Math.cos(ang) * 10, by - Math.sin(ang) * 10); ctx.stroke();
    }
    ctx.restore();
  });

  // 暴击增幅：核心金色闪烁
  define('crit', (ctx, world, x, y, radius, t) => {
    ctx.beginPath(); ctx.arc(x, y, radius * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,213,79,${0.5 + 0.4 * Math.sin(t * 8)})`; ctx.fill();
  });

  // 生命强化：绿色回血环
  define('vitality', (ctx, world, x, y, radius, t) => {
    ctx.beginPath(); ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(129,199,132,${0.5 + 0.3 * Math.sin(t * 3)})`; ctx.lineWidth = 2; ctx.stroke();
  });

  // 生命汲取：红色微光环
  define('lifesteal', (ctx, world, x, y, radius, t) => {
    ctx.beginPath(); ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(239,83,80,${0.4 + 0.3 * Math.sin(t * 3 + 1)})`; ctx.lineWidth = 1.5; ctx.stroke();
  });

  // 急速射击：泛白闪光环
  define('rapidFire', (ctx, world, x, y, radius, t) => {
    ctx.beginPath(); ctx.arc(x, y, radius + 6, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${0.3 + 0.25 * Math.sin(t * 10)})`; ctx.lineWidth = 2; ctx.stroke();
  });

  // 穿透弹：淡黄余光环
  define('pierce', (ctx, world, x, y, radius, t) => {
    ctx.beginPath(); ctx.arc(x, y, radius + 7, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,213,79,${0.25 + 0.2 * Math.sin(t * 4 + 2)})`; ctx.lineWidth = 1.5; ctx.stroke();
  });

  // 多重弹：橙散射点
  define('multiShot', (ctx, world, x, y, radius, t) => {
    for (let i = 0; i < 3; i++) {
      const ang = t * 2 + (i - 1) * 0.6;
      const px = x + Math.cos(ang) * (radius + 6);
      const py = y + Math.sin(ang) * (radius + 6);
      ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,179,0,0.7)'; ctx.fill();
    }
  });

  // 爆裂弹：橙色脉冲环
  define('explosive', (ctx, world, x, y, radius, t) => {
    ctx.beginPath(); ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,152,0,${0.35 + 0.3 * Math.sin(t * 5)})`; ctx.lineWidth = 2; ctx.stroke();
  });

  // 追踪飞刃：金色光环
  define('blade', (ctx, world, x, y, radius, t) => {
    ctx.beginPath(); ctx.arc(x, y, radius + 15, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,213,79,${0.25 + 0.15 * Math.sin(t * 7)})`; ctx.lineWidth = 1; ctx.stroke();
  });

  // 火焰光环：橙色热浪外环
  define('flameAura', (ctx, world, x, y, radius, t) => {
    ctx.beginPath(); ctx.arc(x, y, radius + 13, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,87,34,${0.3 + 0.2 * Math.sin(t * 5)})`; ctx.lineWidth = 2; ctx.stroke();
  });

  // 雷电链：金色微电弧环
  define('chainLightning', (ctx, world, x, y, radius, t) => {
    ctx.beginPath(); ctx.arc(x, y, radius + 10, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,224,130,${0.3 + 0.25 * Math.sin(t * 6 + 3)})`; ctx.lineWidth = 1.5; ctx.stroke();
  });

  window.ZS = window.ZS || {};
  window.ZS.Systems = window.ZS.Systems || {};
  window.ZS.Systems.SkillVisuals = SkillVisuals;
})();