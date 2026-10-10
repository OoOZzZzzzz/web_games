/**
 * visuals/aura.js — 光环类特效渲染器
 * 玩家周围的优雅附着视觉：多层呼吸辉光 + 旋转弧段 + 内圈粒子。
 * 由属性 attributes 驱动：{ color, glow, rings, rotation, pulse, particles, arcs }
 * 通过 window.ZS.Visuals.aura 暴露。
 */
(function () {
  const hexA = window.ZS.Systems.FX.hexA;

  // 优雅光环渲染
  function aura(ctx, x, y, radius, t, attr) {
    const a = attr || {};
    const col = a.color || '#ffd54f';
    const glow = a.glow || col;
    const rings = a.rings || 1;
    const rotation = a.rotation || 0.8;
    const pulse = a.pulse || 1;
    const arcs = a.arcs || 0;
    const particles = a.particles || 0;
    const scale = a.scale || 1;

    ctx.save();
    ctx.translate(x, y);

    // 1. 多层辉光（软径向渐变）
    for (let r = 0; r < rings; r++) {
      const rr = (radius + 8 + r * 6) * scale;
      const alpha = 0.35 - r * 0.1 + 0.15 * Math.sin(t * (2 + r) + r);
      ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2);
      ctx.strokeStyle = hexA(col, Math.max(0, alpha));
      ctx.lineWidth = 1.5 + (1 - r * 0.3);
      ctx.stroke();
    }

    // 2. 旋转弧段（辉光）
    if (arcs > 0) {
      ctx.shadowColor = glow; ctx.shadowBlur = 10;
      ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.strokeStyle = hexA(col, 0.85);
      for (let i = 0; i < arcs; i++) {
        const a0 = t * rotation + (i * Math.PI * 2) / arcs;
        ctx.beginPath(); ctx.arc(0, 0, (radius + 9) * scale, a0, a0 + 0.9 + 0.3 * Math.sin(t * 3 + i)); ctx.stroke();
      }
      ctx.shadowBlur = 0;
    }

    // 3. 内圈漂浮粒子（优雅浮动）
    if (particles > 0) {
      for (let i = 0; i < particles; i++) {
        const ang = t * (rotation * 0.6) + (i / particles) * Math.PI * 2;
        const rr = radius * (0.5 + 0.4 * Math.sin(t * 1.5 + i * 1.7));
        const px = Math.cos(ang) * rr;
        const py = Math.sin(ang) * rr;
        const ps = 2 + Math.sin(t * 4 + i * 2) * 0.8;
        ctx.beginPath(); ctx.arc(px, py, Math.max(0.5, ps), 0, Math.PI * 2);
        ctx.fillStyle = hexA(col, 0.5 + 0.3 * Math.sin(t * 4 + i));
        ctx.fill();
      }
    }

    ctx.restore();
  }

  window.ZS = window.ZS || {};
  window.ZS.Visuals = window.ZS.Visuals || {};
  window.ZS.Visuals.aura = aura;
})();