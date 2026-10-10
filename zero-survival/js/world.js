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

    // ============ 实体工厂（OOP 实体类实例化） ============

    // 本局风格主题
    _styleTheme() {
      return (this.style && this.style.theme) || null;
    },

    spawnPlayer() {
      const p = new window.ZS.Entities.Player(this._styleTheme());
      p.x = this.width / 2;
      p.y = this.height / 2;
      p.skills = this.skills;   // 引用世界技能表，系统共享读写
      this.player = p;
      return p;
    },

    // 生成怪物：typeId 外观来自 data(继承解析)，scaled 为已按等级缩放后的数值
    spawnEnemy(typeId, scaled) {
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
      const e = window.ZS.Entities.Monster.fromData(typeId, this._styleTheme());
      e.x = x; e.y = y;
      e.hp = scaled.hp;
      e.maxHp = scaled.hp;
      e.damage = scaled.damage;
      e.speed = scaled.speed;
      this.enemies.push(e);
      return e;
    },

    // 生成 BOSS：bossId 外观来自 data.bosses(继承解析)，scaled 为缩放数值
    spawnBoss(bossId, scaled) {
      const margin = Data.scaling.spawn.spawnMargin;
      const side = (Math.random() * 4) | 0;
      let x = 0, y = 0;
      if (side === 0) { x = Math.random() * this.width; y = -margin; }
      else if (side === 1) { x = Math.random() * this.width; y = this.height + margin; }
      else if (side === 2) { x = -margin; y = Math.random() * this.height; }
      else { x = this.width + margin; y = Math.random() * this.height; }
      const e = window.ZS.Entities.Boss.fromData(bossId, this._styleTheme());
      e.x = x; e.y = y;
      e.hp = scaled.hp;
      e.maxHp = scaled.hp;
      e.damage = scaled.damage;
      e.speed = scaled.speed;
      this.enemies.push(e);
      return e;
    },

    // 生成子弹（带子弹皮肤 style）
    spawnBullet(x, y, ang, opts = {}) {
      if (this.bullets.length >= CONFIG.attack.maxBullets) return;
      const speed = opts.speed || CONFIG.player.bulletSpeed;
      // 玩家子弹皮肤（默认 gold，预留可选）
      const skin = Data.resolveBulletStyle((this.player && this.player.bulletStyle) || 'gold');
      const isCrit = !!opts.isCrit;
      this.bullets.push({
        x, y,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        damage: opts.damage || 0,
        isCrit,
        radius: skin.radius,
        life: CONFIG.attack.bulletLife,
        pierceLeft: opts.pierceLeft || 0,
        streak: opts.streak || 1,   // 彗星尾长度（急速/穿透增强）
        skin,
        color: isCrit ? (skin.critColor || '#ff7043') : skin.color,
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