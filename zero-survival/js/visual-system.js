/**
 * visual-system.js — 技能视觉调度系统
 * 策略：每个已拥有技能 → 人物周围一个「不同颜色的环绕光点」（清晰提示拿了哪些技能）；
 *       有意义的状态技能（如减伤）→ 额外给人物专属变化（护盾），而非叠加杂乱光环。
 * 通过 window.ZS.Systems.VisualSystem 暴露。
 */
(function () {
  const SKILL_MAP = window.ZS.Data.SKILL_MAP;
  const hexA = window.ZS.Systems.FX.hexA;

  const VisualSystem = {
    // 技能光点颜色（data visual 优先，兜底金黄）
    colorFor(id) {
      const sk = SKILL_MAP[id];
      return (sk && sk.visual && sk.visual.color) || '#ffd54f';
    },

    draw(ctx, world) {
      const p = world.player;
      if (!p) return;
      const t = world.elapsed;
      const x = p.x, y = p.y, radius = p.radius;
      const owned = [];
      for (const id in world.skills) if (world.skills[id] > 0) owned.push(id);
      const n = owned.length;
      if (n === 0) return;

      // 1. 每个技能一个不同颜色的环绕光点
      const R = radius + 16;
      for (let i = 0; i < n; i++) {
        const id = owned[i];
        const col = this.colorFor(id);
        const ang = t * 0.7 + (i / n) * Math.PI * 2;
        const px = x + Math.cos(ang) * R;
        const py = y + Math.sin(ang) * R;
        const breathe = 0.8 + 0.2 * Math.sin(t * 4 + i * 2);
        // 光点（辉光）
        ctx.beginPath(); ctx.arc(px, py, 3.2 * breathe, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.shadowColor = col; ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
        // 小尾迹
        ctx.beginPath(); ctx.arc(px - Math.cos(ang) * 5, py - Math.sin(ang) * 5, 1.4, 0, Math.PI * 2);
        ctx.fillStyle = hexA(col, 0.4); ctx.fill();
      }

      // 2. 减伤护甲 → 人物六边形护盾（有意义的变装感）
      if (world.skills.armor > 0) this._shield(ctx, x, y, radius, t);
    },

    // 六边形护盾：缓慢旋转 + 呼吸
    _shield(ctx, x, y, radius, t) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * 0.5);
      const r = radius + 6 + 1.5 * Math.sin(t * 2);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const px = Math.cos(a) * r, py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(176,196,220,0.9)';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#b0bec5'; ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.fillStyle = 'rgba(120,150,180,0.12)';
      ctx.fill();
      ctx.restore();
    },
  };

  window.ZS = window.ZS || {};
  window.ZS.Systems = window.ZS.Systems || {};
  window.ZS.Systems.VisualSystem = VisualSystem;
})();