/**
 * systems/fx.js — 特效系统（FX）
 * 集中管理所有画布特效：注册表(renderers) + 工厂(add) + 统一绘制(draw)。
 * 新增特效类型 = FX.register(type, renderer)，无需改其它系统。
 * 通过 window.ZS.Systems.FX 暴露。
 */
(function () {
  const CONFIG = window.ZS.CONFIG;
  const Data = window.ZS.Data;

  // 十六进制 + alpha → rgba
  function hexA(hex, a) {
    const s = String(hex || '').replace('#', '');
    const full = s.length === 3 ? s[0] + s[0] + s[1] + s[1] + s[2] + s[2] : s;
    const n = parseInt(full, 16);
    if (isNaN(n)) return `rgba(255,255,255,${a})`;
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  const renderers = {};

  const FX = {
    hexA,
    register(type, renderer) { renderers[type] = renderer; return this; },
    // 创建特效（补默认 life/max）
    add(world, type, data) {
      const fx = Object.assign({ type }, data);
      if (fx.life === undefined) fx.life = 0.5;
      if (fx.max === undefined) fx.max = fx.life;
      world.addFx(fx);
      return fx;
    },
    // 统一绘制所有特效
    draw(ctx, world) {
      const t = world.elapsed;
      const w = world.width, h = world.height;
      for (const fx of world.effects) {
        // 兜底：max 未设时等于 life，避免 life/max = NaN
        if (fx.max == null) fx.max = fx.life || 0.5;
        const fn = renderers[fx.type];
        if (fn) fn(ctx, fx, world, t, w, h);
      }
    },
  };

  // ===================== 注册各特效渲染器 =====================

  // 浮动文字（暴击/技能名）
  FX.register('text', (ctx, fx) => {
    ctx.font = `bold ${fx.size || 15}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.shadowColor = fx.color; ctx.shadowBlur = 6;
    ctx.fillStyle = fx.color; ctx.globalAlpha = Math.min(1, fx.life * 1.2);
    ctx.fillText(fx.str, fx.x, fx.y);
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  });

  // 爆炸：白热核心 + 软辉光 + 冲击环 + 飞散余烬粒子（重力 + 减速 + 辉光）
  FX.register('explosion', (ctx, fx) => {
    const a = Math.max(0, fx.life / fx.max);          // 1 → 0
    const ease = 1 - Math.pow(1 - a, 3);              // ease-out 扩张
    const col = fx.color || '#ff9800';
    const glow = fx.glow || '#ff5722';
    const r = fx.r || 70;
    const baseAng = fx.baseAng || 0;

    // 1. 外圈软辉光（径向渐变）
    const grad = ctx.createRadialGradient(fx.x, fx.y, r * 0.2, fx.x, fx.y, r * (1.1 - ease * 0.3));
    grad.addColorStop(0, hexA(col, 0.5 * a));
    grad.addColorStop(1, hexA(col, 0));
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(fx.x, fx.y, r * (1.1 - ease * 0.3), 0, Math.PI * 2); ctx.fill();

    // 2. 白热核心（先亮后衰）
    const core = Math.max(0, a - 0.35) / 0.65;
    ctx.beginPath(); ctx.arc(fx.x, fx.y, r * 0.5 * (0.55 + ease * 0.35), 0, Math.PI * 2);
    ctx.fillStyle = hexA('#fff7e0', core);
    ctx.fill();

    // 3. 冲击环（扩张 + 淡出）
    ctx.beginPath(); ctx.arc(fx.x, fx.y, r * (0.2 + ease), 0, Math.PI * 2);
    ctx.strokeStyle = hexA(glow, 0.7 * a);
    ctx.lineWidth = 2 + (1 - a) * 3; ctx.stroke();

    // 4. 飞散余烬粒子（减速 + 重力 + 辉光）
    ctx.save();
    ctx.shadowColor = glow; ctx.shadowBlur = 10;
    const N = fx.count || 14;
    for (let i = 0; i < N; i++) {
      const ang = baseAng + (i / N) * Math.PI * 2;
      const spd = (26 + (i % 5) * 14) * ease;
      const px = fx.x + Math.cos(ang) * spd;
      const py = fx.y + Math.sin(ang) * spd + ease * ease * 46 * ((i % 3) - 1);
      ctx.beginPath(); ctx.arc(px, py, Math.max(0.5, 2.4 * (1 - ease * 0.55)), 0, Math.PI * 2);
      ctx.fillStyle = hexA(i % 2 ? col : '#ffe0b2', a);
      ctx.fill();
    }
    ctx.restore();
  });

  // 闪电：多段锯齿电弧 + 双层辉光 + 末端电火花
  FX.register('lightning', (ctx, fx) => {
    const a = Math.max(0, fx.life / fx.max);
    const dx = fx.x2 - fx.x1, dy = fx.y2 - fx.y1;
    const dist = Math.hypot(dx, dy) || 1;
    const seg = Math.max(4, Math.floor(dist / 26));
    // 锯齿电弧路径
    const bolt = (w, blur, color) => {
      ctx.lineWidth = w; ctx.lineCap = 'round';
      ctx.shadowColor = '#ffe082'; ctx.shadowBlur = blur;
      ctx.strokeStyle = color;
      ctx.beginPath(); ctx.moveTo(fx.x1, fx.y1);
      for (let i = 1; i < seg; i++) {
        const t = i / seg;
        ctx.lineTo(fx.x1 + dx * t + (Math.random() - 0.5) * 20, fx.y1 + dy * t + (Math.random() - 0.5) * 20);
      }
      ctx.lineTo(fx.x2, fx.y2);
      ctx.stroke();
    };
    bolt(5, 16, hexA('#fff', a * 0.4));          // 外层辉光
    bolt(2, 6, hexA('#fff8e0', a));              // 亮核
    ctx.shadowBlur = 0;
    // 末端电火花
    const base = Math.atan2(dy, dx);
    for (let i = 0; i < 4; i++) {
      const ang = base + (Math.random() - 0.5) * 1.8;
      ctx.beginPath(); ctx.arc(fx.x2 + Math.cos(ang) * 6, fx.y2 + Math.sin(ang) * 6, 1.7 * a + 0.5, 0, Math.PI * 2);
      ctx.fillStyle = hexA('#ffe082', a); ctx.fill();
    }
  });

  // 枪口闪光：亮核 + 沿枪口的十字光芒
  FX.register('muzzle', (ctx, fx) => {
    const a = Math.max(0, fx.life / fx.max);
    const ang = fx.ang || 0;
    ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.r * (1 - a * 0.6), 0, Math.PI * 2);
    ctx.fillStyle = hexA('#ffe082', a * 0.9); ctx.fill();
    ctx.save();
    ctx.translate(fx.x, fx.y); ctx.rotate(ang);
    ctx.strokeStyle = hexA('#fff', a * 0.8); ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-fx.r * 1.6, 0); ctx.lineTo(fx.r * 1.6, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -fx.r * 0.6); ctx.lineTo(0, fx.r * 0.6); ctx.stroke();
    ctx.restore();
  });

  // 粒子爆散：减速 + 辉光 + 曳尾（死亡/暴击/出生/回血）
  FX.register('burst', (ctx, fx) => {
    const a = Math.max(0, fx.life / fx.max);
    const ease = 1 - Math.pow(1 - a, 2.4);   // ease-out 减速
    const N = fx.count || 12;
    const rot = fx.rot || 0;
    ctx.save();
    ctx.shadowColor = fx.color; ctx.shadowBlur = 8;
    for (let i = 0; i < N; i++) {
      const seg = i / N;
      const ang = (fx.baseAng || 0) + seg * Math.PI * 2 + rot;
      const dist = seg * fx.speed * ease;
      const px = fx.x + Math.cos(ang) * dist;
      const py = fx.y + Math.sin(ang) * dist;
      ctx.beginPath(); ctx.arc(px - Math.cos(ang) * 4, py - Math.sin(ang) * 4, 1.2 * a, 0, Math.PI * 2);
      ctx.fillStyle = hexA(fx.color, a * 0.4); ctx.fill();
      ctx.beginPath(); ctx.arc(px, py, (2.6 + seg * 1.4) * a + 0.5, 0, Math.PI * 2);
      ctx.fillStyle = hexA(fx.color, a); ctx.fill();
    }
    ctx.restore();
  });

  // BOSS 登场冲击波
  FX.register('shockwave', (ctx, fx, world, t, w, h) => {
    const a = Math.max(0, fx.life / fx.max);
    ctx.beginPath(); ctx.arc(w / 2, h / 2, (1 - a) * fx.r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,87,34,${a})`;
    ctx.lineWidth = 3 + (1 - a) * 6; ctx.stroke();
    ctx.beginPath(); ctx.arc(w / 2, h / 2, (1 - a) * fx.r * 0.7, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,180,60,${a * 0.7})`; ctx.lineWidth = 2; ctx.stroke();
  });

  // BOSS 警告横幅
  FX.register('warning', (ctx, fx, world, t, w, h) => {
    const a = Math.min(1, fx.life);
    const boss = Data.bosses[Object.keys(Data.bosses)[0]];
    ctx.textAlign = 'center';
    ctx.font = 'bold 60px sans-serif';
    ctx.shadowColor = '#ff5722'; ctx.shadowBlur = 20;
    ctx.fillStyle = `rgba(255,87,34,${a * 0.6})`;
    ctx.fillText('⚠', w / 2, h / 2 - 60);
    ctx.font = 'bold 34px sans-serif';
    ctx.fillStyle = `rgba(255,50,40,${a})`;
    ctx.fillText(boss.warnText || '⚠ BOSS 降临！', w / 2, h / 2);
    ctx.shadowBlur = 0;
  });

  // 粒子流（汲取回血）：辉光粒子 + 头尾拖影，源→目标流动
  FX.register('stream', (ctx, fx) => {
    const a = Math.max(0, fx.life / fx.max);
    const flow = fx.flow || 0;
    const N = fx.count || 10;
    ctx.save();
    ctx.shadowColor = fx.color; ctx.shadowBlur = 8;
    for (let i = 0; i < N; i++) {
      const t = ((i / N) + flow) % 1;
      const px = fx.x1 + (fx.x2 - fx.x1) * t;
      const py = fx.y1 + (fx.y2 - fx.y1) * t;
      // 头尾拖影
      ctx.beginPath(); ctx.arc(px - 5, py - 5, 1.4 * a, 0, Math.PI * 2);
      ctx.fillStyle = hexA(fx.color, a * 0.4); ctx.fill();
      ctx.beginPath(); ctx.arc(px, py, 2.4 * a + 0.7, 0, Math.PI * 2);
      ctx.fillStyle = hexA(fx.color, a); ctx.fill();
    }
    ctx.restore();
  });

  // 火花爆散：减速 + 辉光（暴击/多重弹/雷电）
  FX.register('spark', (ctx, fx) => {
    const a = Math.max(0, fx.life / fx.max);
    const ease = 1 - Math.pow(1 - a, 2);
    const N = fx.count || 8;
    ctx.save();
    ctx.shadowColor = fx.color; ctx.shadowBlur = 6;
    for (let i = 0; i < N; i++) {
      const ang = (fx.baseAng || 0) + (i / N) * Math.PI * 2 + (i % 2) * 0.5;
      const dist = (1 - ease) * fx.speed;
      const px = fx.x + Math.cos(ang) * dist;
      const py = fx.y + Math.sin(ang) * dist;
      ctx.beginPath(); ctx.arc(px, py, 2.3 * a + 0.5, 0, Math.PI * 2);
      ctx.fillStyle = hexA(fx.color, a); ctx.fill();
    }
    ctx.restore();
  });

  // 脉动扩散环（选技/回血）
  FX.register('ring', (ctx, fx) => {
    const a = Math.max(0, fx.life / fx.max);
    ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.r * (1 - a) + 4, 0, Math.PI * 2);
    ctx.strokeStyle = hexA(fx.color, a); ctx.globalAlpha = a;
    ctx.lineWidth = 2 + (1 - a) * 3; ctx.stroke();
    ctx.globalAlpha = 1;
  });

  // 直线光迹（穿透余像）
  FX.register('streak', (ctx, fx) => {
    const a = Math.max(0, fx.life / fx.max);
    ctx.beginPath(); ctx.moveTo(fx.x1, fx.y1); ctx.lineTo(fx.x2, fx.y2);
    ctx.strokeStyle = hexA(fx.color, a); ctx.globalAlpha = a;
    ctx.lineWidth = 2; ctx.stroke();
    ctx.globalAlpha = 1;
  });

  window.ZS = window.ZS || {};
  window.ZS.Systems = window.ZS.Systems || {};
  window.ZS.Systems.FX = FX;
})();