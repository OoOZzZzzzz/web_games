/**
 * visuals/orbital.js — 环绕光点类特效渲染器
 * 围绕玩家漂浮旋转的光点/小能量团，属性驱动：{ color, count, radius, speed, size, glow }
 * 通过 window.ZS.Visuals.orbital 暴露。
 */
(function () {
  const hexA = window.ZS.Systems.FX.hexA;

  function orbital(ctx, x, y, radius, t, attr, offset) {
    const a = attr || {};
    const col = a.color || '#ffd54f';
    const count = a.count || 3;
    const rad = a.radius || (radius + 15);
    const speed = a.speed || 0.8;
    const size = a.size || 3;
    const glow = a.glow || col;

    for (let i = 0; i < count; i++) {
      const ang = t * speed + ((offset || 0) + i / count) * Math.PI * 2;
      const px = x + Math.cos(ang) * rad;
      const py = y + Math.sin(ang) * rad;
      const breathe = 0.7 + 0.3 * Math.sin(t * 4 + i * 2);
      ctx.beginPath(); ctx.arc(px, py, size * breathe, 0, Math.PI * 2);
      ctx.fillStyle = hexA(col, 0.9);
      ctx.shadowColor = glow; ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
      // 小尾迹
      ctx.beginPath(); ctx.arc(px - Math.cos(ang) * 4, py - Math.sin(ang) * 4, size * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = hexA(col, 0.4);
      ctx.fill();
    }
  }

  window.ZS = window.ZS || {};
  window.ZS.Visuals = window.ZS.Visuals || {};
  window.ZS.Visuals.orbital = orbital;
})();