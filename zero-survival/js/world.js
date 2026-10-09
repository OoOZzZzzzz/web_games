/**
 * world.js — 世界容器（ECS 世界）
 * 持有全部实体集合（player/enemies/bullets/orbs/blades/effects）+ 一局运行时状态，
 * 并提供实体工厂。系统通过 world 读写数据；跨模块用 EventBus 通知。
 * 通过 window.ZS.World 暴露。
 */
(function () {
  const CONFIG = window.ZS.CONFIG;
  const Data = window.ZS.Data;
  const C = window.ZS.Components;

  const World = {
    // ---- 实体集合 ----
    enemies: [],
    bullets: [],
    orbs: [],
    blades: [],
    effects: [],
    player: null,

    // ---- 一局状态 ----
    phase: 'menu',          // 'menu' | 'battle'
    style: null,            // 本局视觉主题（风格）对象
    level: 0,
    xp: 0,
    kills: 0,
    maxLevel: 0,
    elapsed: 0,
    skills: {},             // { skillId: level }
    spawnTimer: 0,
    fireTimer: 0,
    nextBossLv: 0,

    // ---- 依赖注入（由 game.js 设置） ----
    canvas: null,
    ui: null,

    // 画布尺寸
    get width() { return this.canvas ? this.canvas.width : 0; },
    get height() { return this.canvas ? this.canvas.height : 0; },

    // ============ 一局生命周期 ============
    reset() {
      this.enemies.length = 0;
      this.bullets.length = 0;
      this.orbs.length = 0;
      this.blades.length = 0;
      this.effects.length = 0;
      this.player = null;
      this.phase = 'battle';
      this.level = 0;
      this.xp = 0;
      this.kills = 0;
      this.maxLevel = 0;
      this.elapsed = 0;
      this.skills = {};
      this.spawnTimer = 0;
      this.fireTimer = 0;
      this.nextBossLv = Data.scaling.bossEveryLv;
      this.spawnPlayer();
    },
    toMenu() {
      this.enemies.length = 0; this.bullets.length = 0; this.orbs.length = 0;
      this.blades.length = 0; this.effects.length = 0;
      this.phase = 'menu';
      this.player = null;
    },

    // ============ 实体工厂 ============

    // 玩家外观 = 基础外观 + 当前风格主题
    _playerAppearance() {
      const base = Data.player.appearance;
      const theme = (this.style && this.style.theme && this.style.theme.player) || null;
      if (!theme) return Object.assign({}, base);
      return Object.assign({}, base, theme);   // 主题覆盖 color/stroke/highlight/gunColor/glow/core
    },

    spawnPlayer() {
      const d = Data.player;
      const p = {
        x: this.width / 2,
        y: this.height / 2,
        radius: d.radius,
        hp: d.maxHp,
        maxHp: d.maxHp,
        // 基础属性（技能加成由系统动态计算）
        baseMoveSpeed: d.moveSpeed,
        baseFireRate: d.fireRate,
        baseDamage: d.attackDamage,
        moveSpeed: d.moveSpeed,
        attackDamage: d.attackDamage,
        fireRate: d.fireRate,
        invulnTimer: 0,
        hurtFlash: 0,
        aim: { x: 1, y: 0 },
        skills: this.skills,   // 引用世界技能表，系统共享读写
        appearance: this._playerAppearance(),
      };
      this.player = p;
      return p;
    },

    // 生成怪物：typeId 外观来自 data(继承解析)，scaled 为已按等级缩放后的数值
    spawnEnemy(typeId, scaled) {
      const m = Data.resolveMonster(typeId);
      const p = this.player;
      const margin = Data.scaling.spawn.spawnMargin;
      let x = 0, y = 0;
      for (let i = 0; i < 24; i++) {
        const side = (Math.random() * 4) | 0;
        if (side === 0) { x = Math.random() * this.width; y = -margin; }
        else if (side === 1) { x = Math.random() * this.width; y = this.height + margin; }
        else if (side === 2) { x = -margin; y = Math.random() * this.height; }
        else { x = this.width + margin; y = Math.random() * this.height; }
        if (Math.hypot(x - p.x, y - p.y) >= Data.scaling.spawn.minSpawnDist) break;
      }
      const e = {
        type: typeId,
        tier: m.tier,
        shape: m.shape,
        radius: m.radius,
        appearance: this._enemyAppearance(m),
        features: m.features || [],
        abilities: m.abilities || [],
        onDeath: m.onDeath || null,
        x, y,
        hp: scaled.hp,
        maxHp: scaled.hp,
        damage: scaled.damage,
        speed: scaled.speed,
        xp: m.stats.xp,
        slowTimer: 0,
        hitFlash: 0,
      };
      this.enemies.push(e);
      return e;
    },

    // 怪物外观 = 基类外观 + 当前风格主题(enemy 色调)
    _enemyAppearance(m) {
      const a = m.appearance;
      const theme = (this.style && this.style.theme && this.style.theme.enemy) || null;
      if (!theme) return Object.assign({}, a);
      const out = Object.assign({}, a);
      out.stroke = theme.tint;       // 描边用主题色
      if (theme.glow) out.glow = theme.glow;
      if (theme.eye) out.eyeColor = theme.eye;
      return out;
    },

    // 生成 BOSS：bossId 外观来自 data.bosses(继承解析)，scaled 为缩放数值
    spawnBoss(bossId, scaled) {
      const b = Data.resolveBoss(bossId);
      const margin = Data.scaling.spawn.spawnMargin;
      const side = (Math.random() * 4) | 0;
      let x = 0, y = 0;
      if (side === 0) { x = Math.random() * this.width; y = -margin; }
      else if (side === 1) { x = Math.random() * this.width; y = this.height + margin; }
      else if (side === 2) { x = -margin; y = Math.random() * this.height; }
      else { x = this.width + margin; y = Math.random() * this.height; }
      const e = {
        type: 'boss', bossId,
        tier: 'boss',
        shape: b.shape,
        radius: b.radius,
        appearance: this._bossAppearance(b),
        features: b.features || [],
        abilities: b.abilities || [],
        onDeath: b.onDeath || null,
        skills: b.skills || [],
        x, y,
        hp: scaled.hp,
        maxHp: scaled.hp,
        damage: scaled.damage,
        speed: b.stats.speed,
        xp: b.stats.xp,
        slowTimer: 0,
        hitFlash: 0,
      };
      this.enemies.push(e);
      return e;
    },

    // BOSS 外观 = 基类外观 + 当前风格主题(boss 色调)
    _bossAppearance(b) {
      const a = b.appearance;
      const theme = (this.style && this.style.theme && this.style.theme.boss) || null;
      if (!theme) return Object.assign({}, a);
      return Object.assign({}, a, theme);   // 主题覆盖 color/stroke/glow
    },

    // 生成子弹
    spawnBullet(x, y, ang, opts = {}) {
      if (this.bullets.length >= CONFIG.attack.maxBullets) return;
      const speed = opts.speed || CONFIG.player.bulletSpeed;
      this.bullets.push({
        x, y,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        damage: opts.damage || 0,
        isCrit: !!opts.isCrit,
        radius: CONFIG.attack.bulletRadius,
        life: CONFIG.attack.bulletLife,
        pierceLeft: opts.pierceLeft || 0,
        color: opts.isCrit ? '#ff7043' : CONFIG.attack.bulletColor,
        hitIds: new Set(),
      });
    },

    // 掉落经验球
    spawnOrb(x, y, value) {
      this.orbs.push({
        x, y,
        vx: (Math.random() - 0.5) * 70,
        vy: (Math.random() - 0.5) * 70,
        r: CONFIG.orb.radius,
        value,
        life: 12,
      });
    },

    // 生成一把追踪飞刃
    spawnBlade(ang) {
      this.blades.push({ ang, cd: 0.3, x: 0, y: 0 });
    },

    // 添加画布特效
    addFx(fx) { this.effects.push(fx); },
    addText(x, y, str, color) {
      this.effects.push({ type: 'text', x, y, str, color, life: 0.9, vy: -55 });
    },

    // 按组件字段过滤
    query(list, ...comps) { return window.ZS.Core.query(list, ...comps); },

    // ============ 技能值辅助（供各系统复用） ============
    skillLv(id) { return this.skills[id] || 0; },
    skillVal(id) {
      const lv = this.skills[id];
      if (!lv) return undefined;
      return Data.SKILL_MAP[id].values[lv - 1];
    },
  };

  window.ZS = window.ZS || {};
  window.ZS.World = World;
})();