/**
 * ui/dev-preview.js — 开发者预览引擎（4 类独立预览）
 * 复用真实渲染(Render)、真实跳跃(Spawn._hopEnemy)、真实特效(FX) 画到预览画布：
 *   theme   — 主题色预览：选一套视觉主题，看角色/怪物/环境色调 + 鼠标样式
 *   battle  — 战斗预览：怪物涌来→玩家反击→阵亡→重置 的小规模战斗循环
 *   monster — 怪物预览：单只怪物动作循环 + 简介（类似植物大战僵尸，无角色）
 *   skill   — 技能预览：元气骑士式——角色在左放技能、怪在右移动受击，
 *                        真实伤害、死亡爆散、复活，循环演示技能真实效果
 * 切换预览会重置世界，避免残留。通过 window.ZS.UI.DevPreview 暴露（单例）。
 */
(function () {
  const ZS = window.ZS;
  const Render = ZS.Systems.Render;
  const SpawnCtor = ZS.Systems.Spawn;
  const Shooting = ZS.Systems.Shooting;
  const Summon = ZS.Systems.Summon;
  const Effects = ZS.Systems.Effects;

  // 最小战斗世界：足够渲染与特效跑起来
  function makeWorld(canvas) {
    return {
      canvas,
      width: canvas.width,
      height: canvas.height,
      phase: 'battle',
      elapsed: 0,
      player: null,
      enemies: [],
      bullets: [],
      orbs: [],
      blades: [],
      effects: [],
      sparks: [],
      particles: [],
      skills: {},
      style: null,
      shake: { t: 0, dur: 0, mag: 0 },
      freeze: 0,
      flash: 0,
      spawnParticles(x, y, opts) {
        const o = opts || {}; const n = o.count || 8;
        for (let i = 0; i < n && this.sparks.length < 220; i++) {
          const a = (o.angle === undefined ? Math.random() * Math.PI * 2 : o.angle) + (Math.random() - 0.5) * (o.angleVar || Math.PI);
          const spd = (o.speed || 90) + (Math.random() - 0.5) * (o.speedVar || 40);
          this.sparks.push({
            x, y,
            vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
            life: (o.life || 0.5) * (0.6 + Math.random() * 0.8),
            max: o.life || 0.5,
            size: (o.size || 3) * (0.6 + Math.random() * 0.8),
            color: (o.colors && o.colors.length) ? o.colors[(Math.random() * o.colors.length) | 0] : (o.color || '#fff'),
            glow: true, drag: o.drag === undefined ? 0.94 : o.drag, gravity: o.gravity || 0,
          });
        }
      },
      addFx(fx) { this.effects.push(fx); },
      addText(x, y, str, color) { this.effects.push({ type: 'text', x, y, str, color: color || '#fff', life: 0.8, max: 0.8 }); },
      spawnOrb(x, y, value) { this.orbs.push({ x, y, vx: 0, vy: 0, r: 7, value, life: 8 }); },
      // 真实射击系统需要的子弹工厂（与 world.js spawnBullet 一致）
      spawnBullet(x, y, ang, opts = {}) {
        const speed = opts.speed || ZS.Data.player.bulletSpeed;
        const skin = ZS.Data.resolveBulletStyle((this.player && this.player.bulletStyle) || 'gold');
        const isCrit = !!opts.isCrit;
        this.bullets.push({
          x, y,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          damage: opts.damage || 0,
          isCrit,
          radius: skin.radius,
          life: opts.life || 1.4,
          pierceLeft: opts.pierceLeft || 0,
          streak: opts.streak || 1,
          skin,
          color: isCrit ? (skin.critColor || '#ff7043') : skin.color,
          hitIds: new Set(),
        });
      },
    };
  }

  let world = null;
  let ctx2d = null;
  let raf = 0;
  let last = 0;
  let render = null;
  let spawn = null;
  let shooting = null;   // 真实射击系统（驱动局内特效）
  let summon = null;       // 真实召唤系统（飞刃/火环）
  let effects = null;      // 真实特效系统（让特效/粒子正常衰减消失）
  let mode = 'theme';
  let cur = null;        // 当前预览参数（怪物/技能/主题）

  function bulletStyle(id) { return ZS.Data.resolveBulletStyle(id || 'gold'); }

  // 需要真实射击系统驱动的技能（子弹/爆炸/闪电走 Shooting 局内逻辑）；纯被动不战斗
  const SHOOTING_SKILLS = ['rapidFire', 'pierce', 'explosive', 'multiShot', 'chainLightning', 'attackBoost', 'crit'];
  const PASSIVE_SKILLS = ['vitality', 'haste', 'armor', 'lifesteal'];

  // 清空世界
  function _clear() {
    world.enemies.length = 0; world.bullets.length = 0;
    world.effects.length = 0; world.sparks.length = 0; world.blades.length = 0;
    world.player = null; world.style = null;
  }

  const DevPreview = {
    init(canvas) {
      world = makeWorld(canvas);
      ctx2d = canvas.getContext('2d');
      render = new Render();
      spawn = new SpawnCtor();
      shooting = new Shooting();
      summon = new Summon();
      effects = new Effects();
      last = performance.now();
      const loop = (t) => {
        const dt = Math.min(0.05, (t - last) / 1000);
        last = t;
        world.elapsed += dt;
        this._tick(dt);
        // 真实特效系统：让爆炸/粒子/文字随寿命衰减并移除（避免残留叠加）
        effects.update(world, dt);
        this._tickOrbs(dt);   // 经验球被玩家吸收（不残留）
        render.draw(ctx2d, world);
        // 主题色预览：右下角绘制鼠标样式样例
        if (mode === 'theme') this._drawCursorSample(ctx2d);
        raf = requestAnimationFrame(loop);
      };
      this.stop();
      raf = requestAnimationFrame(loop);
    },

    stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } },

    // 经验球：飘向玩家并被吸收（不残留）
    _tickOrbs(dt) {
      const p = world.player;
      for (let i = world.orbs.length - 1; i >= 0; i--) {
        const o = world.orbs[i];
        o.life -= dt;
        if (p) {
          const dx = p.x - o.x, dy = p.y - o.y, d = Math.hypot(dx, dy) || 1;
          o.x += (dx / d) * 130 * dt;
          o.y += (dy / d) * 130 * dt;
          if (d < 26) { world.orbs.splice(i, 1); continue; }
        }
        if (o.life <= 0) world.orbs.splice(i, 1);
      }
    },

    _tick(dt) {
      if (mode === 'theme') this._tickIdle(dt);
      else if (mode === 'battle') this._tickBattle(dt);
      else if (mode === 'monster') this._tickMonster(dt);
      else if (mode === 'skill') this._tickSkill(dt);
    },

    // ---- 通用：静止物体轻微浮动（主题色预览） ----
    _tickIdle(dt) {
      for (const e of world.enemies) {
        if (e._baseY === undefined) e._baseY = e.y;
        e.y = e._baseY + Math.sin(world.elapsed * 2 + (e.x || 0)) * 2;
      }
    },

    // ==================== 主题色预览 ====================
    showTheme(styleId) {
      mode = 'theme';
      _clear();
      const theme = ZS.Data.styles[styleId] || ZS.Data.styles.default;
      world.style = theme;
      const p = new ZS.Entities.Player(theme.theme);
      p.x = world.width * 0.3; p.y = world.height * 0.5;
      world.player = p;
      const e = ZS.Entities.Monster.fromData('slime', theme.theme);
      e.x = world.width * 0.66; e.y = world.height * 0.52;
      world.enemies.push(e);
      const e2 = ZS.Entities.Monster.fromData('crawler', theme.theme);
      e2.x = world.width * 0.85; e2.y = world.height * 0.52;
      world.enemies.push(e2);
      cur = { styleId };
    },

    // 鼠标样式样例（十字准星 + 点）
    _drawCursorSample(ctx) {
      const cx = world.width - 46, cy = world.height - 40;
      const t = world.elapsed;
      const r = 10 + Math.sin(t * 5) * 1.2;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,213,79,0.9)';
      ctx.lineWidth = 1.6;
      ctx.shadowColor = 'rgba(255,152,0,0.9)'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      const L = 6;
      ctx.beginPath();
      ctx.moveTo(cx, cy - L); ctx.lineTo(cx, cy - 4);
      ctx.moveTo(cx, cy + 4); ctx.lineTo(cx, cy + L);
      ctx.moveTo(cx - L, cy); ctx.lineTo(cx - 4, cy);
      ctx.moveTo(cx + 4, cy); ctx.lineTo(cx + L, cy);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,213,79,1)';
      ctx.beginPath(); ctx.arc(cx, cy, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    },

    // ==================== 战斗预览 ====================
    showBattle() {
      mode = 'battle';
      _clear();
      this._setupBattle();
    },
    _setupBattle() {
      _clear();
      world.style = null;
      const p = new ZS.Entities.Player(null);
      p.x = world.width / 2; p.y = world.height / 2;
      world.player = p;
      cur = { respawnT: 0, fireT: 0.4, dead: false, deadT: 0 };
      for (let i = 0; i < 3; i++) this._battleSpawn();
    },
    _battleSpawn() {
      const pool = ['slime', 'crawler', 'slime', 'golem'];
      const id = pool[(Math.random() * pool.length) | 0];
      const def = ZS.Data.resolveMonster(id);
      const e = ZS.Entities.Monster.fromData(id, null);
      const side = (Math.random() * 4) | 0;
      const m = 40;
      if (side === 0) { e.x = Math.random() * world.width; e.y = -m; }
      else if (side === 1) { e.x = Math.random() * world.width; e.y = world.height + m; }
      else if (side === 2) { e.x = -m; e.y = Math.random() * world.height; }
      else { e.x = world.width + m; e.y = Math.random() * world.height; }
      e.hp = e.maxHp = def.stats.hp; e.damage = def.stats.damage; e.speed = def.stats.speed;
      world.enemies.push(e);
    },
    _tickBattle(dt) {
      const p = world.player;
      if (!p) return;
      const st = cur;
      if (st.dead) {
        st.deadT -= dt;
        if (st.deadT <= 0) this._setupBattle();
        return;
      }
      // 怪物移动 + 接触伤害
      for (let i = world.enemies.length - 1; i >= 0; i--) {
        const e = world.enemies[i];
        const dx = p.x - e.x, dy = p.y - e.y, dist = Math.hypot(dx, dy) || 0.001;
        if (e.features && e.features.includes('bouncy')) spawn._hopEnemy(world, e, p, dt, dx, dy, dist);
        else { const spd = e.speed; e.x += (dx / dist) * spd * dt; e.y += (dy / dist) * spd * dt; }
        if (dist < e.radius + p.radius && p.invulnTimer <= 0) {
          p.hp -= e.damage; p.invulnTimer = 1; p.hurtFlash = 0.2;
          world.spawnParticles(p.x, p.y, { count: 6, color: '#ff5252', speed: 80, size: 2, gravity: 120, life: 0.3 });
          if (p.hp <= 0) {
            p.hp = 0; st.dead = true; st.deadT = 1.4;
            world.spawnParticles(p.x, p.y, { count: 22, colors: ['#ff7043', '#ffd54f', '#fff'], speed: 160, size: 3, gravity: 200, life: 0.8 });
            world.addText(p.x, p.y - 30, '💀 阵亡', '#ff5252');
            world.enemies.length = 0; world.bullets.length = 0;
            return;
          }
        }
      }
      // 玩家自动反击
      st.fireT -= dt;
      let nearest = null, nd2 = 1e9;
      for (const e of world.enemies) { const dx = e.x - p.x, dy = e.y - p.y, d2 = dx * dx + dy * dy; if (d2 < nd2) { nd2 = d2; nearest = e; } }
      if (st.fireT <= 0 && nearest) {
        st.fireT = 0.45;
        const ang = Math.atan2(nearest.y - p.y, nearest.x - p.x);
        world.bullets.push({ x: p.x, y: p.y, vx: Math.cos(ang) * 300, vy: Math.sin(ang) * 300, damage: 12, radius: 4, life: 2, pierceLeft: 1, streak: 1.2, skin: bulletStyle('gold'), color: '#ffd54f', isCrit: false, hitIds: new Set() });
      }
      // 子弹移动 + 命中
      for (let i = world.bullets.length - 1; i >= 0; i--) {
        const b = world.bullets[i];
        b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        let hit = false;
        for (let j = world.enemies.length - 1; j >= 0; j--) {
          const e = world.enemies[j];
          const dx = e.x - b.x, dy = e.y - b.y;
          if (dx * dx + dy * dy < (e.radius + b.radius) * (e.radius + b.radius)) {
            e.hp -= b.damage; e.hitFlash = 0.08;
            world.spawnParticles(e.x, e.y, { count: 4, color: '#ffd54f', speed: 90, size: 2, gravity: 120, life: 0.3 });
            if (e.hp <= 0) { world.spawnParticles(e.x, e.y, { count: 10, color: e.appearance.color, speed: 120, size: 2.4, gravity: 180, life: 0.5 }); world.enemies.splice(j, 1); }
            b.pierceLeft--; hit = b.pierceLeft < 0;
            break;
          }
        }
        if (hit || b.life <= 0 || b.x < -40 || b.x > world.width + 40 || b.y < -40 || b.y > world.height + 40) world.bullets.splice(i, 1);
      }
      // 补充怪物
      st.respawnT -= dt;
      if (st.respawnT <= 0 && world.enemies.length < 4) { this._battleSpawn(); st.respawnT = 1.1; }
    },

    // ==================== 怪物预览（单怪动作循环 + 简介） ====================
    showMonster(typeId) {
      mode = 'monster';
      _clear();
      const e = ZS.Entities.Monster.fromData(typeId, null);
      e.x = world.width / 2; e.y = world.height / 2 + 10;
      e._baseY = e.y;
      world.enemies.push(e);
      // 占位玩家（屏幕外，仅让渲染器不提前 return）
      const dp = new ZS.Entities.Player(null);
      dp.x = -400; dp.y = -400;
      world.player = dp;
      cur = { typeId };
    },
    _tickMonster(dt) {
      const e = world.enemies[0];
      if (!e) return;
      if (e.features && e.features.includes('bouncy')) {
        spawn._hopEnemy(world, e, e, dt, 0, 0, 0.001);   // 原地跳跃循环
      } else if (e.type === 'crawler') {
        // 疾行虫：快速漂浮穿梭 + 粒子尾迹（体现"快"）
        e._dir = e._dir || 1;
        e.x += e._dir * 170 * dt;
        if (e.x > world.width - 44 || e.x < 44) e._dir *= -1;
        e.y = (e._baseY || e.y) + Math.sin(world.elapsed * 1.5) * 6;
        world.spawnParticles(e.x - e._dir * 14, e.y, { count: 1, color: 'rgba(239,83,80,0.5)', speed: 8, size: 1.5, gravity: 0, drag: 0.9, life: 0.4, glow: false });
      } else {
        e.y = e._baseY + Math.sin(world.elapsed * 2 + (e.x || 0)) * 3;
      }
    },

    // ==================== 技能预览（元气骑士式：左角色放技能 / 右怪移动受击→死亡→复活） ====================
    showSkill(skillId) {
      mode = 'skill';
      _clear();
      const skill = ZS.Data.SKILL_MAP[skillId];
      // 让该技能在迷你世界上生效（真实系统读取 world.skills）
      world.skills = {};
      world.skills[skillId] = 1;
      const p = new ZS.Entities.Player(null);
      p.x = world.width * 0.22; p.y = world.height * 0.5;
      world.player = p;
      world.fireTimer = 0.3;
      cur = {
        skill,
        respawnT: 0,
        auraT: 0,
        fight: !PASSIVE_SKILLS.includes(skillId),   // 纯被动不追怪
        shooting: SHOOTING_SKILLS.includes(skillId),
      };
      // 飞刃：准备 3 把环绕刃（真实 Summon 系统驱动）
      if (skill && skill.id === 'blade') {
        for (let k = 0; k < 3; k++) world.blades.push({ ang: (Math.PI * 2 * k) / 3, cd: 0, x: p.x, y: p.y });
      }
      this._skillSpawnMonster();
    },
    // 生成右怪（每次复活）
    _skillSpawnMonster() {
      const m = ZS.Entities.Monster.fromData('slime', null);
      m.x = world.width * 0.72; m.y = world.height * 0.55;
      m.hp = m.maxHp = 20;   // 让技能 2 发左右击杀，展示死亡
      world.enemies.push(m);
    },
    _tickSkill(dt) {
      const p = world.player, s = cur.skill;
      if (!p || !s) return;
      // 复活倒计时
      if (cur.respawnT > 0) {
        cur.respawnT -= dt;
        if (cur.respawnT <= 0) this._skillSpawnMonster();
        return;
      }
      const m = world.enemies[0];
      if (!m) return;
      // 怪物动作：战斗技能 → 贴地跳跃靠近；纯被动 → 原地浮动
      if (cur.fight) {
        const dx = p.x - m.x, dy = p.y - m.y, dist = Math.hypot(dx, dy) || 0.001;
        spawn._hopEnemy(world, m, p, dt, dx, dy, dist);
      } else {
        if (m._baseY === undefined) m._baseY = m.y;
        else m.y = m._baseY + Math.sin(world.elapsed * 2) * 2;
      }
      // 按技能类型驱动真实局内系统（特效/伤害/死亡 完全与局内一致）
      if (cur.shooting) {
        // 真实射击：发射 → 命中 → 爆裂弹 explodeAt / 雷电链 triggerLightning / 击杀 killEnemy
        shooting.update(world, dt);
      } else if (s.id === 'blade') {
        summon._updateBlades(world, dt);          // 真实追踪飞刃
      } else if (s.id === 'flameAura') {
        summon._updateAura(world, dt);            // 真实火焰光环灼烧
        world.spawnParticles(p.x, p.y, { count: 2, colors: ['#ff8a50', '#ffb300'], speed: 30, size: 2.4, gravity: -60, life: 0.6 });
      } else {
        // 纯被动：脉动光环（无战斗击杀）
        cur.auraT = (cur.auraT || 0) - dt;
        if (cur.auraT <= 0) {
          const col = (s.visual && s.visual.color) || '#8fd4ff';
          world.addFx({ type: 'ring', x: p.x, y: p.y, r: 54, color: col, life: 0.55, max: 0.55 });
          world.spawnParticles(p.x, p.y, { count: 8, colors: [col, '#ffffff'], speed: 40, size: 2.4, gravity: 0, drag: 0.9, life: 0.5 });
          world.addText(p.x, p.y - 42, s.icon || '✦', col);
          cur.auraT = 0.9;
        }
      }
      // 怪物被局内系统击杀（Combat.killEnemy 已移除并播死亡特效）→ 复活循环
      if (world.enemies.length === 0 && cur.respawnT <= 0) cur.respawnT = 0.9;
    },
  };

  window.ZS = window.ZS || {};
  window.ZS.UI = window.ZS.UI || {};
  window.ZS.UI.DevPreview = DevPreview;
})();