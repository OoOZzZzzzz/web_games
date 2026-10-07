/**
 * game.js — 游戏主逻辑（Game 类）
 * 零级求生：技能狂潮
 *
 * 职责：玩家状态、输入处理、主循环（update + draw）、画布渲染、技能系统、死亡结算。
 * 里程碑3：完整 13 技能系统（三选一升级、全部效果生效）、BOSS 刷新、特效。
 * 里程碑4：死亡判定 → 结算界面 → 重新开局清零。
 */
class Game {
  constructor() {
    Game.instance = this;               // 供 UI/main 访问
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');

    // 运行状态
    this.running = false;               // false = 菜单氛围画面（粒子背景）
    this.paused = false;                // true = 升级三选一弹窗打开时冻结世界
    this.rafId = null;

    // BOSS 刷新追踪
    this.nextBossLv = 10;               // 到达该等级时刷新一只 BOSS，随后 +10
    this.lastTime = performance.now();
    this.elapsed = 0;                   // 本局已存活时间（秒）
    this.particles = null;              // 漂浮粒子（懒初始化）

    // 输入
    this.keys = new Set();              // 当前按住的键（小写）
    this.aim = { x: 1, y: 0 };          // 当前朝向（自动瞄准最近敌人时会更新）
    this.mouse = null;                  // 当前鼠标位置（跟随移动用）

    // 局内实体集合
    this.enemies = [];                  // 怪物
    this.bullets = [];                  // 子弹
    this.orbs = [];                     // 经验球
    this.blades = [];                   // 追踪飞刃
    this.effects = [];                  // 特效（爆炸/闪电/文字/警告）

    // 统计
    this.kills = 0;                     // 本局击杀数
    this.maxLevel = 0;                  // 本局最高等级（结算用）

    // 怪物刷新计时 / 普攻冷却计时
    this.spawnTimer = 0;
    this.fireTimer = 0;

    // 玩家
    this.player = null;

    this._bindInput();
    this._startLoop();   // 主循环常驻：菜单播粒子氛围，战斗跑游戏逻辑
  }

  // ================= 生命周期 =================

  // 启动渲染循环（仅调用一次）
  _startLoop() {
    const loop = (t) => {
      let dt = (t - this.lastTime) / 1000;
      dt = Math.min(dt, CONFIG.time.maxDt); // 防止切后台大跳帧
      this.lastTime = t;

      if (this.running) {
        if (!this.paused) this.update(dt);
        this.draw();
      } else {
        this._drawAmbient(dt); // 菜单氛围背景（粒子 + 网格）
      }

      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  // 开始一局（首次进入 / 重开共用）
  begin() {
    this.reset();
    this.running = true;
    UI.updateKills(0);
  }

  // 重新开局：死亡结算界面点击「重新开局」
  restart() {
    this.begin();
  }

  // 重置一局的所有状态（死亡即清零，重开从0开始）
  reset() {
    this.enemies.length = 0;
    this.bullets.length = 0;
    this.orbs.length = 0;
    this.blades.length = 0;
    this.effects.length = 0;

    this.elapsed = 0;
    this.kills = 0;
    this.maxLevel = 0;
    this.spawnTimer = 0;
    this.fireTimer = 0;
    this.paused = false;            // 重开清除暂停
    this.nextBossLv = 10;           // 重开 BOSS 重新从 Lv10 计

    const c = CONFIG.player;
    this.player = {
      x: this.canvas.width / 2,
      y: this.canvas.height / 2,
      radius: c.radius,
      hp: c.maxHp,
      maxHp: c.maxHp,
      level: 0,          // 初始 Lv0
      xp: 0,             // 当前经验
      // 基础属性（技能加成在需要时动态计算）
      baseMoveSpeed: c.moveSpeed,
      baseFireRate: c.fireRate,
      baseDamage: c.attackDamage,
      moveSpeed: c.moveSpeed,
      attackDamage: c.attackDamage,
      fireRate: c.fireRate,
      invulnTimer: 0,    // 受击无敌剩余时间
      hurtFlash: 0,      // 受伤红闪计时
      skills: {},        // 技能等级：{ skillId: level }
    };
  }

  // ================= 输入 =================

  _bindInput() {
    const keyName = (e) => e.key.toLowerCase();

    window.addEventListener('keydown', (e) => {
      const k = keyName(e);
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
        e.preventDefault(); // 防止方向键滚动页面
      }
      this.keys.add(k);
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(keyName(e));
    });

    window.addEventListener('blur', () => this.keys.clear()); // 失焦清空按键

    // 记录鼠标位置（画布全屏，clientX/Y 即画布坐标）
    window.addEventListener('mousemove', (e) => {
      this.mouse = { x: e.clientX, y: e.clientY };
    });
  }

  // ================= 技能效果辅助 =================

  // 当前技能等级
  _skillLv(id) {
    return this.player.skills[id] || 0;
  }

  // 当前技能对应的数值（values[lv-1]），未拥有返回 undefined
  _skillVal(id) {
    const lv = this._skillLv(id);
    if (lv === 0) return undefined;
    return SKILL_MAP[id].values[lv - 1];
  }

  // 有效攻击速度（含急速射击）
  _effFireRate() {
    const v = this._skillVal('rapidFire');
    return this.player.baseFireRate * (1 + (v || 0));
  }

  // 有效移动速度（含迅捷）
  _effMoveSpeed() {
    const v = this._skillVal('haste');
    return this.player.baseMoveSpeed * (1 + (v || 0));
  }

  // 减伤系数（1 = 无减伤，越小受伤越少）
  _armorMult() {
    const v = this._skillVal('armor');
    return 1 - (v || 0);
  }

  // 所有攻击伤害倍率（含攻击强化）
  _dmgMult() {
    const v = this._skillVal('attackBoost');
    return 1 + (v || 0);
  }

  // 暴击判定：返回 [是否暴击, 倍率]
  _rollCrit() {
    const v = this._skillVal('crit');
    if (!v) return [false, 1];
    const [chance, critDmg] = v;
    const isCrit = Math.random() < chance;
    return [isCrit, isCrit ? 1 + critDmg : 1];
  }

  // 子弹单发伤害（含攻击强化 + 暴击）
  _bulletDamage() {
    const base = this.player.baseDamage;
    const [isCrit, mult] = this._rollCrit();
    return { amount: base * this._dmgMult() * mult, isCrit };
  }

  // 追踪飞刃单次伤害
  _bladeDamage() {
    const v = this._skillVal('blade');
    const base = SKILL_MAP.blade.baseDamage * (1 + (v ? v[1] : 0));
    return base * this._dmgMult();
  }

  // 生命强化：重算最大生命并补足差值（相当于同时回血）
  _applyVitality() {
    const p = this.player;
    const v = this._skillVal('vitality') || 0;
    const newMax = CONFIG.player.maxHp + v;
    if (newMax > p.maxHp) p.hp += (newMax - p.maxHp);
    p.maxHp = newMax;
  }

  // 重排追踪飞刃（根据当前 blade 等级调整数量）
  _rebuildBlades() {
    const v = this._skillVal('blade');
    const count = v ? v[0] : 0;
    this.blades.length = 0;
    for (let i = 0; i < count; i++) {
      this.blades.push({
        ang: (Math.PI * 2 * i) / Math.max(1, count),
        cd: 0.3,
        x: 0, y: 0,
      });
    }
  }

  // 生成三选一技能（跳过已满级技能）
  _rollSkillChoices() {
    const pool = [];
    for (const sk of SKILLS) {
      if (this._skillLv(sk.id) < sk.levels.length) pool.push(sk);
    }
    // Fisher-Yates 洗牌
    for (let i = pool.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 3).map(sk => {
      const lv = this._skillLv(sk.id); // 当前等级
      const next = lv + 1;
      return {
        id: sk.id,
        icon: sk.icon,
        name: sk.name,
        category: sk.category,
        level: next,
        isNew: lv === 0,
        maxLevel: sk.levels.length,
        desc: sk.levels[next - 1],
      };
    });
  }

  // 应用一次技能升级（选中后即时生效的特效）
  _applySkillPick(skillId) {
    const p = this.player;
    p.skills[skillId] = (p.skills[skillId] || 0) + 1;
    if (skillId === 'vitality') this._applyVitality();
    else if (skillId === 'blade') this._rebuildBlades();
  }

  // 选中技能后：应用 → 关弹窗 → 恢复世界 → 处理连升
  _chooseSkill(skillId) {
    this._applySkillPick(skillId);
    UI.hideLevelUp();
    this.paused = false;
    Sfx.select();
    // 若升级经验条仍溢出（多级连升），继续弹出下一次选择
    const p = this.player;
    const need = DATA.xpNeeded(p.level);
    if (need > 0 && p.xp >= need) this._onLevelUp();
  }

  // ================= 主循环：更新 =================

  update(dt) {
    this.elapsed += dt;

    // 玩家移动（WASD / 方向键）
    this._updatePlayer(dt);

    // 更新玩家状态计时
    const p = this.player;
    if (p.invulnTimer > 0) p.invulnTimer -= dt;
    if (p.hurtFlash > 0) p.hurtFlash -= dt;

    // 漂浮粒子（战场氛围，同屏特效之一）
    this._updateParticles(dt);

    // 怪物刷新 → 子弹发射与命中 → 怪物移动与接触伤害 → 召唤物 → 经验球
    this._updateSpawn(dt);
    this._updateBullets(dt);
    this._updateEnemies(dt);
    this._updateBlades(dt);
    this._updateAura(dt);
    this._updateOrbs(dt);
    this._updateEffects(dt);

    // HUD 每帧刷新
    UI.updateHUD(p);
  }

  // ================= 粒子系统（氛围） =================

  // 初始化漂浮粒子（按屏幕面积自适应数量）
  _initParticles() {
    const area = Math.max(200, this.canvas.width * this.canvas.height);
    const count = Math.min(110, Math.floor(area / 16000));
    const list = [];
    for (let i = 0; i < count; i++) {
      list.push(this._makeParticle());
    }
    return list;
  }

  // 生成一个粒子：颜色取自暖金/冷蓝/紫调，缓慢上浮 + 左右摇曳
  _makeParticle() {
    const colors = ['#ffd54f', '#ff9800', '#4fc3f7', '#b39ddb', '#ff7043', '#ffeb3b'];
    // 少量大颗粒"余烬"，多数为细腻小光点，增加层次
    const big = Math.random() < 0.12;
    return {
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      r: big ? 2.2 + Math.random() * 2.4 : 1 + Math.random() * 1.9,
      speed: big ? 8 + Math.random() * 16 : 10 + Math.random() * 26,
      sway: 0.6 + Math.random() * 1.4,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.10 + Math.random() * 0.35,
      color: colors[(Math.random() * colors.length) | 0],
      glow: Math.random() < 0.5, // 半数粒子带辉光
    };
  }

  // 更新粒子：上浮、摇曳、出界后回到底部重生
  _updateParticles(dt) {
    if (!this.particles) this.particles = this._initParticles();
    const w = this.canvas.width;
    const h = this.canvas.height;
    for (const p of this.particles) {
      p.y -= p.speed * dt;
      p.phase += dt * 1.7;
      p.x += Math.sin(p.phase) * p.sway * dt * 16;
      if (p.y < -8) { p.y = h + 8; p.x = Math.random() * w; }
      if (p.x < -8) p.x = w + 8;
      if (p.x > w + 8) p.x = -8;
    }
  }

  // 绘制粒子（alphaMul 用于战场时压低存在感）
  _drawParticles(ctx, alphaMul = 1) {
    const ps = this.particles;
    if (!ps) return;
    const t = this.elapsed;
    for (const p of ps) {
      // 闪烁：透明度随时间脉动
      const twinkle = 0.55 + 0.45 * Math.sin(p.phase * 3 + t * 2);
      const alpha = p.alpha * alphaMul * twinkle;
      if (alpha <= 0.015) continue;
      if (p.glow) { ctx.shadowColor = p.color; ctx.shadowBlur = 8; }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  // 菜单氛围画面：背景 + 网格 + 上浮粒子
  _drawAmbient(dt) {
    this._updateParticles(dt);
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    this._drawBackground(ctx, w, h);
    this._drawGrid(ctx, w, h);
    this._drawParticles(ctx, 1);
  }

  // 背景：中心略亮偏冷蓝 → 四周深蓝黑 的径向渐变，营造纵深与氛围
  _drawBackground(ctx, w, h) {
    const c = w / 2, cy = h / 2;
    const grad = ctx.createRadialGradient(c, cy, 0, c, cy, Math.max(w, h) * 0.72);
    grad.addColorStop(0, '#182033');
    grad.addColorStop(0.55, '#121828');
    grad.addColorStop(1, '#0a0e16');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  // 玩家移动：归一化向量 × 有效速度 × dt，并限制在画布内
  _updatePlayer(dt) {
    const p = this.player;
    const keys = this.keys;
    let dx = 0, dy = 0;

    if (keys.has('w') || keys.has('arrowup')) dy -= 1;
    if (keys.has('s') || keys.has('arrowdown')) dy += 1;
    if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
    if (keys.has('d') || keys.has('arrowright')) dx += 1;

    if (dx !== 0 || dy !== 0) {
      // 键盘优先：WASD / 方向键
      const len = Math.hypot(dx, dy);
      dx /= len; dy /= len;      // 归一化，斜向不加速
      const speed = this._effMoveSpeed(); // 含迅捷加成
      p.x += dx * speed * dt;
      p.y += dy * speed * dt;

      this.aim.x = dx;
      this.aim.y = dy;
    } else if (this.mouse) {
      // 鼠标跟随：角色朝光标位置移动（死区防抖动）
      const mx = this.mouse.x - p.x;
      const my = this.mouse.y - p.y;
      const dist = Math.hypot(mx, my);
      const dead = 14;           // 光标距角色足够近时停住
      if (dist > dead) {
        const nx = mx / dist;
        const ny = my / dist;
        const speed = this._effMoveSpeed();
        p.x += nx * speed * dt;
        p.y += ny * speed * dt;
        this.aim.x = nx;
        this.aim.y = ny;
      }
    }

    // 边界限制：玩家不能离开画布
    const m = p.radius;
    p.x = Math.max(m, Math.min(this.canvas.width - m, p.x));
    p.y = Math.max(m, Math.min(this.canvas.height - m, p.y));
  }

  // ================= 自动瞄准普攻 =================

  // 找普攻索敌范围内的最近敌人；无敌人返回 null
  _findNearestEnemy() {
    const p = this.player;
    const range = CONFIG.attack.reticleRange;
    const range2 = range * range;
    let best = null;
    let bestD2 = range2;
    for (const e of this.enemies) {
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) { bestD2 = d2; best = e; }
    }
    return best;
  }

  // 普攻冷却计时器：到点自动朝最近敌人开火（含多重弹扇形）
  _tryFire(dt) {
    this.fireTimer -= dt;
    if (this.fireTimer > 0) return;

    const p = this.player;
    const target = this._findNearestEnemy();
    let ang;
    if (target) {
      ang = Math.atan2(target.y - p.y, target.x - p.x);
      this.aim.x = Math.cos(ang);
      this.aim.y = Math.sin(ang);
    } else {
      ang = Math.atan2(this.aim.y, this.aim.x);
    }

    this._spawnBullet(p, ang); // 主弹

    // 多重弹：额外子弹沿主方向小幅扇形散开
    const extra = this._skillVal('multiShot') || 0;
    const spread = 0.06;
    for (let i = 0; i < extra; i++) {
      const off = (i % 2 === 0 ? 1 : -1) * (Math.ceil((i + 1) / 2) * spread);
      this._spawnBullet(p, ang + off);
    }

    this.fireTimer = 1 / this._effFireRate(); // 含急速射击
  }

  // 生成一发子弹（含穿透、暴击上色）
  _spawnBullet(p, ang) {
    if (this.bullets.length >= CONFIG.attack.maxBullets) return; // 性能保护
    const speed = CONFIG.player.bulletSpeed;
    const { amount, isCrit } = this._bulletDamage();
    const pierce = this._skillVal('pierce') || 0;
    this.bullets.push({
      x: p.x,
      y: p.y,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      damage: amount,
      isCrit,
      radius: CONFIG.attack.bulletRadius,
      life: CONFIG.attack.bulletLife,
      pierceLeft: pierce === Infinity ? Infinity : pierce,
      color: isCrit ? '#ff7043' : CONFIG.attack.bulletColor,
      hitIds: new Set(),             // 已命中敌人（防同一发多次伤害）
    });
  }

  // ================= 怪物刷新 =================

  // 刷新节奏：间隔随玩家等级缩短，同屏上限随等级提升
  _updateSpawn(dt) {
    const lv = this.player.level;
    const cfg = CONFIG.spawn;
    const interval = Math.max(cfg.minInterval, cfg.baseInterval - lv * cfg.intervalPerLv);
    const maxEnemies = cfg.baseMaxEnemies + lv * cfg.maxEnemiesPerLv;

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = interval;
      if (this.enemies.length < maxEnemies) this._spawnEnemy();
    }
  }

  // 在屏幕四边缘随机位置生成一只怪物
  _spawnEnemy() {
    const lv = this.player.level;
    const typeId = this._pickEnemyType();
    const t = MONSTER_TYPES[typeId];
    const p = this.player;

    const m = CONFIG.spawn.spawnMargin;
    let x = 0, y = 0;
    for (let i = 0; i < 24; i++) {
      const side = (Math.random() * 4) | 0;
      if (side === 0) { x = Math.random() * this.canvas.width; y = -m; }
      else if (side === 1) { x = Math.random() * this.canvas.width; y = this.canvas.height + m; }
      else if (side === 2) { x = -m; y = Math.random() * this.canvas.height; }
      else { x = this.canvas.width + m; y = Math.random() * this.canvas.height; }
      if (Math.hypot(x - p.x, y - p.y) >= CONFIG.spawn.minSpawnDist) break;
    }

    // 属性随玩家等级缩放：每 5 级血量 +15%、伤害 +10%
    const lv5 = Math.floor(lv / 5);
    const hp = Math.round(t.hp * (1 + lv5 * CONFIG.scaling.hpPer5Lv));
    const dmg = Math.round(t.damage * (1 + lv5 * CONFIG.scaling.dmgPer5Lv));

    const e = {
      type: typeId,
      x, y, hp, maxHp: hp,
      speed: t.speed * (1 + lv * 0.012),
      damage: dmg,
      xp: t.xp,
      radius: t.radius,
      color: t.color,
      tier: t.tier,
      slowTimer: 0,
      hitFlash: 0,
    };
    this.enemies.push(e);
  }

  // 挑选怪物类型：低级怪权重更高，精英 Lv6 起小概率出现
  _pickEnemyType() {
    const lv = this.player.level;
    const normalIds = [];
    for (const id in MONSTER_TYPES) {
      const t = MONSTER_TYPES[id];
      if (t.tier === 'normal' && t.unlockLv <= lv) normalIds.push(id);
    }
    if (normalIds.length === 0) normalIds.push('slime');

    // 加权随机：权重 = 1 / (解锁等级 + 1)，史莱姆最容易刷
    const weights = normalIds.map(id => 1 / (MONSTER_TYPES[id].unlockLv + 1));
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    let picked = normalIds[normalIds.length - 1];
    for (let i = 0; i < normalIds.length; i++) {
      r -= weights[i];
      if (r <= 0) { picked = normalIds[i]; break; }
    }

    // 精英怪：玩家达到 Lv6 后，按基础概率刷新
    if (lv >= MONSTER_TYPES.elite.unlockLv && Math.random() < CONFIG.spawn.eliteChanceBase) {
      return 'elite';
    }
    return picked;
  }

  // 到达 Lv10/20/30… 时刷新一只 BOSS（属性随等级缩放）
  _spawnBoss() {
    const lv = this.player.level;
    const t = MONSTER_TYPES.boss;
    const p = this.player;
    const m = CONFIG.spawn.spawnMargin;
    const side = (Math.random() * 4) | 0;
    let x = 0, y = 0;
    if (side === 0) { x = Math.random() * this.canvas.width; y = -m; }
    else if (side === 1) { x = Math.random() * this.canvas.width; y = this.canvas.height + m; }
    else if (side === 2) { x = -m; y = Math.random() * this.canvas.height; }
    else { x = this.canvas.width + m; y = Math.random() * this.canvas.height; }

    const lv5 = Math.floor(lv / 5);
    const hp = Math.round(t.hp * (1 + lv5 * CONFIG.scaling.hpPer5Lv));
    const dmg = Math.round(t.damage * (1 + lv5 * CONFIG.scaling.dmgPer5Lv));

    this.enemies.push({
      type: 'boss', x, y, hp, maxHp: hp,
      speed: t.speed, damage: dmg, xp: t.xp,
      radius: t.radius, color: t.color, tier: 'boss',
      slowTimer: 0, hitFlash: 0,
    });
    Sfx.boss();
    this._addFx({ type: 'warning', life: 2.2 });
    this.nextBossLv += 10;
  }

  // ================= 怪物更新 =================

  // 怪物：向玩家移动 + 接触伤害
  _updateEnemies(dt) {
    const p = this.player;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.slowTimer > 0) e.slowTimer -= dt;
      if (e.hitFlash > 0) e.hitFlash -= dt;

      // 向玩家靠拢
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const dist = Math.hypot(dx, dy) || 0.001;
      const spd = e.slowTimer > 0 ? e.speed * 0.5 : e.speed;
      e.x += (dx / dist) * spd * dt;
      e.y += (dy / dist) * spd * dt;

      // 接触伤害（玩家不在无敌期才结算）
      if (dist < e.radius + p.radius && p.invulnTimer <= 0) {
        this._hurtPlayer(e.damage, dx, dy, dist);
      }
    }
  }

  // 玩家受伤：减伤 → 扣血 + 无敌 + 击退 + 红闪 + 音效
  _hurtPlayer(amount, dx, dy, dist) {
    const p = this.player;
    const dmg = amount * this._armorMult(); // 减伤护甲
    p.hp -= dmg;
    p.invulnTimer = CONFIG.player.invulnTime;
    p.hurtFlash = CONFIG.hit.flashTime;
    Sfx.hurt();

    // 击退（方向 = 怪物指向玩家的方向）
    const kb = CONFIG.hit.knockback;
    p.x += (dx / dist) * kb;
    p.y += (dy / dist) * kb;
    const m = p.radius;
    p.x = Math.max(m, Math.min(this.canvas.width - m, p.x));
    p.y = Math.max(m, Math.min(this.canvas.height - m, p.y));

    if (p.hp <= 0) {
      p.hp = 0;
      this._onDeath();
    }
  }

  // ================= 子弹 =================

  // 子弹：飞行 + 命中伤害；命中触发爆裂/雷电链；先清理死亡敌人再处理接触
  _updateBullets(dt) {
    this._tryFire(dt);

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.life -= dt;
      if (b.life <= 0) { this.bullets.splice(i, 1); continue; }

      b.x += b.vx * dt;
      b.y += b.vy * dt;
      const m = 24;
      if (b.x < -m || b.x > this.canvas.width + m || b.y < -m || b.y > this.canvas.height + m) {
        this.bullets.splice(i, 1);
        continue;
      }

      // 命中检测（倒序遍历，splice 安全）
      let consumed = false;
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (b.hitIds.has(e)) continue;
        const dx = e.x - b.x;
        const dy = e.y - b.y;
        const rr = e.radius + b.radius;
        if (dx * dx + dy * dy < rr * rr) {
          this._damageEnemy(e, b.damage, b.isCrit);
          this._explodeAt(b.x, b.y);       // 爆裂弹
          this._triggerLightning(b.x, b.y, e); // 雷电链
          b.hitIds.add(e);
          if (b.pierceLeft > 0) b.pierceLeft--;
          else { consumed = true; break; }
        }
      }
      if (consumed) this.bullets.splice(i, 1);
    }
  }

  // 对敌人造成伤害，击杀则掉落经验球并计数；isCrit 时显示暴击数字
  _damageEnemy(e, dmg, isCrit = false) {
    e.hp -= dmg;
    e.hitFlash = 0.08;
    if (isCrit) this._addText(e.x, e.y, '暴击', '#ff7043');
    if (e.hp <= 0) this._killEnemyByRef(e);
  }

  // 按引用移除怪物：击杀数 +1，掉落经验球，生命汲取回血，播放音效
  _killEnemyByRef(e) {
    const idx = this.enemies.indexOf(e);
    if (idx < 0) return;
    this.enemies.splice(idx, 1);
    this.kills++;
    UI.updateKills(this.kills);
    Sfx.kill();
    this._dropOrb(e);
    // 生命汲取：击杀回血
    const ls = this._skillVal('lifesteal');
    if (ls) {
      const p = this.player;
      p.hp = Math.min(p.maxHp, p.hp + ls);
    }
  }

  // ================= 召唤附加类 =================

  // 追踪飞刃：绕玩家旋转，自动攻击刃附近的敌人
  _updateBlades(dt) {
    if (this.blades.length === 0) return;
    const p = this.player;
    const orbitR = 52;
    for (let i = this.blades.length - 1; i >= 0; i--) {
      const b = this.blades[i];
      b.ang += dt * 4.0;                      // 绕玩家旋转
      const bx = p.x + Math.cos(b.ang) * orbitR;
      const by = p.y + Math.sin(b.ang) * orbitR;
      b.x = bx; b.y = by;
      b.cd -= dt;
      if (b.cd > 0) continue;

      // 寻找刃攻击范围内的最近敌人
      const range = 46;
      const range2 = range * range;
      let best = null, bestD2 = range2;
      for (const e of this.enemies) {
        const dx = e.x - bx, dy = e.y - by, d2 = dx * dx + dy * dy;
        if (d2 < bestD2) { bestD2 = d2; best = e; }
      }
      if (best) {
        this._damageEnemy(best, this._bladeDamage());
        b.cd = 0.55;
        this._addText(bx, by, '✦', '#ffd54f');
      }
    }
  }

  // 火焰光环：持续灼烧光环内的敌人
  _updateAura(dt) {
    const v = this._skillVal('flameAura');
    if (!v) return;
    const [dps, radius] = v;
    const p = this.player;
    const rr = radius * radius;
    for (const e of this.enemies) {
      const dx = e.x - p.x, dy = e.y - p.y;
      if (dx * dx + dy * dy < rr) this._damageEnemy(e, dps * dt);
    }
  }

  // 爆裂弹：命中点产生范围爆炸（额外伤害 + 减速）
  _explodeAt(x, y) {
    const v = this._skillVal('explosive');
    if (!v) return;
    const [bonus, radiusMul, slow] = v;
    const radius = 70 * radiusMul;
    const rr = radius * radius;
    const dmg = this.player.baseDamage * this._dmgMult() * bonus;
    for (const e of this.enemies) {
      const dx = e.x - x, dy = e.y - y;
      if (dx * dx + dy * dy < rr) {
        this._damageEnemy(e, dmg);
        if (slow > 0) e.slowTimer = Math.max(e.slowTimer, slow);
      }
    }
    this._addFx({ type: 'explosion', x, y, r: radius, life: 0.35 });
  }

  // 雷电链：普攻命中概率触发连锁闪电
  _triggerLightning(fromX, fromY, hitEnemy) {
    const v = this._skillVal('chainLightning');
    if (!v) return;
    const [chance, chainCount, dmgBonus, stun] = v;
    if (Math.random() >= chance) return;

    const base = SKILL_MAP.chainLightning.baseDamage * (1 + dmgBonus) * this._dmgMult();
    // 从被命中敌人起，链到最近的其他敌人（含命中者，共 chainCount+1 个目标）
    const targets = [hitEnemy];
    let prev = hitEnemy;
    for (let k = 0; k < chainCount; k++) {
      let best = null, bestD2 = 130 * 130;
      for (const e of this.enemies) {
        if (targets.includes(e)) continue;
        const dx = e.x - prev.x, dy = e.y - prev.y, d2 = dx * dx + dy * dy;
        if (d2 < bestD2) { bestD2 = d2; best = e; }
      }
      if (!best) break;
      targets.push(best);
      prev = best;
    }

    // 绘制链段（从命中点依次连到每个目标）
    let px = fromX, py = fromY;
    for (const e of targets) {
      this._addFx({ type: 'lightning', x1: px, y1: py, x2: e.x, y2: e.y, life: 0.22 });
      px = e.x; py = e.y;
    }

    // 从第二个目标起造成闪电伤害（第一个由子弹打中）
    for (let k = 1; k < targets.length; k++) {
      const e = targets[k];
      const dmg = base * Math.max(0.4, 1 - (k - 1) * 0.2);
      this._damageEnemy(e, dmg);
      if (stun > 0) e.slowTimer = Math.max(e.slowTimer, stun);
    }
  }

  // ================= 经验球 =================

  // 击杀掉落经验球（带初速 + 存活时限）
  _dropOrb(e) {
    this.orbs.push({
      x: e.x, y: e.y,
      vx: (Math.random() - 0.5) * 70,
      vy: (Math.random() - 0.5) * 70,
      r: CONFIG.orb.radius,
      value: e.xp,
      life: 12,   // 12 秒后消失
    });
  }

  // 经验球：初速衰减 → 磁吸 → 触碰拾取
  _updateOrbs(dt) {
    const p = this.player;
    const mag = CONFIG.orb.magnetRadius;
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const o = this.orbs[i];
      o.life -= dt;
      if (o.life <= 0) { this.orbs.splice(i, 1); continue; }

      const dx = p.x - o.x;
      const dy = p.y - o.y;
      const dist = Math.hypot(dx, dy) || 0.001;

      // 磁吸：靠近后飞向玩家
      if (dist < mag && dist > 3) {
        o.x += (dx / dist) * CONFIG.orb.magnetSpeed * dt;
        o.y += (dy / dist) * CONFIG.orb.magnetSpeed * dt;
      } else if (o.vx || o.vy) {
        o.x += o.vx * dt;
        o.y += o.vy * dt;
        o.vx *= 0.9;
        o.vy *= 0.9;
      }

      // 拾取
      if (dist < o.r + p.radius) {
        this.orbs.splice(i, 1);
        this._addXp(o.value);
        Sfx.pickup();
      }
    }
  }

  // 增加经验，可能一次连续升多级
  _addXp(amount) {
    const p = this.player;
    p.xp += amount;
    let need = DATA.xpNeeded(p.level);
    while (need > 0 && p.xp >= need) {
      p.xp -= need;
      p.level++;
      if (p.level > this.maxLevel) this.maxLevel = p.level;
      this._onLevelUp();
      if (this.paused) break;   // 弹窗已打开，剩余升级待选择后继续
      need = DATA.xpNeeded(p.level);
    }
  }

  // 升级事件：播放音效 + 检查 BOSS + 弹出技能三选一
  _onLevelUp() {
    Sfx.levelUp();
    if (this.paused) return;
    if (this.player.level >= this.nextBossLv) this._spawnBoss();
    const choices = this._rollSkillChoices();
    if (choices.length === 0) return;   // 所有技能已满级，无需弹窗
    this.paused = true;
    UI.showLevelUp(choices);
  }

  // 技能选中入口（UI 回调）
  static onSkillChosen(skillId) {
    if (!Game.instance) return;
    Game.instance._chooseSkill(skillId);
  }

  // ================= 死亡结算 =================

  _onDeath() {
    this.running = false;
    this.paused = false;
    const p = this.player;

    // 组装本局技能列表
    const skillNames = Object.keys(p.skills)
      .filter(id => p.skills[id] > 0)
      .map(id => `${SKILL_MAP[id].icon} ${SKILL_MAP[id].name} Lv.${p.skills[id]}`);
    const skillsStr = skillNames.length ? skillNames.join('\n') : '（未获取任何技能）';

    const mm = Math.floor(this.elapsed / 60);
    const ss = Math.floor(this.elapsed % 60);
    const stats = [
      ['最高等级', 'Lv.' + this.maxLevel],
      ['击杀怪物总数', String(this.kills)],
      ['存活时长', `${mm}分${String(ss).padStart(2, '0')}秒`],
      ['获得技能', skillsStr],
    ];
    UI.showDeath(stats);
  }

  // ================= 特效 =================

  _addFx(fx) { this.effects.push(fx); }

  // 浮动文字（暴击/飞刃提示）
  _addText(x, y, str, color) {
    this._addFx({ type: 'text', x, y, str, color, life: 0.9, vy: -55 });
  }

  _updateEffects(dt) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const fx = this.effects[i];
      fx.life -= dt;
      if (fx.type === 'text') fx.y += fx.vy * dt;
      if (fx.life <= 0) this.effects.splice(i, 1);
    }
  }

  _drawEffects(ctx) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    for (const fx of this.effects) {
      if (fx.type === 'explosion') {
        const alpha = Math.max(0, fx.life / 0.35);
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, fx.r * (1.3 - alpha * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 152, 0, ${alpha * 0.45})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 87, 34, ${alpha})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      } else if (fx.type === 'lightning') {
        ctx.beginPath();
        ctx.moveTo(fx.x1, fx.y1);
        const mx = (fx.x1 + fx.x2) / 2 + (Math.random() - 0.5) * 22;
        const my = (fx.y1 + fx.y2) / 2 + (Math.random() - 0.5) * 22;
        ctx.lineTo(mx, my);
        ctx.lineTo(fx.x2, fx.y2);
        ctx.strokeStyle = `rgba(255, 255, 120, ${Math.max(0, fx.life / 0.22)})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      } else if (fx.type === 'text') {
        ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = fx.color;
        ctx.globalAlpha = Math.min(1, fx.life);
        ctx.fillText(fx.str, fx.x, fx.y);
        ctx.globalAlpha = 1;
      } else if (fx.type === 'warning') {
        const a = Math.min(1, fx.life);
        ctx.textAlign = 'center';
        ctx.font = 'bold 60px sans-serif';
        ctx.fillStyle = `rgba(255, 87, 34, ${a * 0.5})`;
        ctx.fillText('⚠', w / 2, h / 2 - 60);
        ctx.font = 'bold 34px sans-serif';
        ctx.fillStyle = `rgba(255, 50, 40, ${a})`;
        ctx.fillText('⚠ BOSS 深渊领主降临！', w / 2, h / 2);
      }
    }
  }

  // ================= 主循环：渲染 =================

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 背景（中心暖辉光 → 四周深色的径向渐变）
    this._drawBackground(ctx, w, h);

    // 网格（增加战场纵深感）
    this._drawGrid(ctx, w, h);

    // 漂浮粒子（战场氛围，压低存在感）
    this._drawParticles(ctx, 0.35);

    // 经验球 → 怪物 → 子弹 → 特效 → 玩家（按层级绘制）
    this._drawOrbs(ctx);
    this._drawAura(ctx);     // 光环在怪物下层
    this._drawEnemies(ctx);
    this._drawBullets(ctx);
    this._drawBlades(ctx);
    this._drawEffects(ctx);

    // 玩家
    this._drawPlayer(ctx);

    // 自定义金色准星光标（置于最上层）
    if (this.running && !this.paused && this.mouse) this._drawCursor(ctx);
  }

  // 绘制自定义准星光标：金色辉光十字 + 圆环 + 中心点（简约、贴合霓虹主题）
  _drawCursor(ctx) {
    const { x, y } = this.mouse;
    const pulse = 1 + Math.sin(this.elapsed * 5) * 0.06;
    const r = 11 * pulse;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 213, 79, 0.9)';
    ctx.lineWidth = 1.6;
    ctx.shadowColor = 'rgba(255, 152, 0, 0.9)';
    ctx.shadowBlur = 8;

    // 外圈（轻微脉动）
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();

    // 十字准线
    const L = 5;
    ctx.beginPath();
    ctx.moveTo(x, y - L); ctx.lineTo(x, y - 3);
    ctx.moveTo(x, y + 3); ctx.lineTo(x, y + L);
    ctx.moveTo(x - L, y); ctx.lineTo(x - 3, y);
    ctx.moveTo(x + 3, y); ctx.lineTo(x + L, y);
    ctx.stroke();

    // 中心点
    ctx.fillStyle = 'rgba(255, 213, 79, 1)';
    ctx.beginPath();
    ctx.arc(x, y, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  _drawGrid(ctx, w, h) {
    const g = CONFIG.canvas.gridSize;
    const off = CONFIG.canvas.gridOffset;

    // 网格线（低透明度，纵深层次）
    ctx.strokeStyle = CONFIG.canvas.gridColor;
    ctx.lineWidth = 1;
    for (let x = off; x < w; x += g) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = off; y < h; y += g) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // 辉光交点：每隔 2 格画一个金色光点，营造科技网格感
    ctx.fillStyle = 'rgba(255, 170, 60, 0.15)';
    ctx.shadowColor = 'rgba(255, 152, 0, 0.8)';
    ctx.shadowBlur = 6;
    const step = 2;
    for (let x = off; x < w; x += g * step) {
      for (let y = off; y < h; y += g * step) {
        ctx.beginPath();
        ctx.arc(x, y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.shadowBlur = 0;
  }

  // 绘制玩家：蓝色战士圆球 + 朝向指示器 + 受击红闪
  _drawPlayer(ctx) {
    const p = this.player;
    if (!p) return;

    const { x, y, radius } = p;
    ctx.save();

    // 受伤红闪：玩家整体泛红
    if (p.hurtFlash > 0) {
      ctx.globalAlpha = 0.6;
    }

    // 身体
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#4fc3f7';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#b3e5fc';
    ctx.stroke();

    // 内圈高光
    ctx.beginPath();
    ctx.arc(x - radius * 0.2, y - radius * 0.25, radius * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fill();

    // 朝向指示：向瞄准方向伸出小炮管
    const ang = Math.atan2(this.aim.y, this.aim.x);
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(ang) * radius * 0.4, y + Math.sin(ang) * radius * 0.4);
    ctx.lineTo(x + Math.cos(ang) * (radius + 8), y + Math.sin(ang) * (radius + 8));
    ctx.stroke();

    ctx.restore();

    // 无敌闪烁：受击后短暂呼吸闪烁提示
    if (p.invulnTimer > 0) {
      ctx.beginPath();
      ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,255,255,${0.4 + 0.4 * Math.sin(this.elapsed * 30)})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // 绘制火焰光环
  _drawAura(ctx) {
    const v = this._skillVal('flameAura');
    if (!v) return;
    const [, radius] = v;
    const p = this.player;
    const pulse = 1 + Math.sin(this.elapsed * 5) * 0.03;
    const grad = ctx.createRadialGradient(p.x, p.y, radius * 0.3, p.x, p.y, radius * pulse);
    grad.addColorStop(0, 'rgba(255, 87, 34, 0.16)');
    grad.addColorStop(1, 'rgba(255, 87, 34, 0)');
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius * pulse, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 120, 40, 0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // 绘制怪物：按类型画形状 + 眼睛朝向玩家 + 精英/BOSS 血条
  _drawEnemies(ctx) {
    const p = this.player;
    if (!p) return;

    for (const e of this.enemies) {
      // 受击闪白
      if (e.hitFlash > 0) ctx.globalAlpha = 0.65;

      if (e.tier === 'boss' || e.type === 'golem') {
        // 方块体型：重甲傀儡 / 深渊领主
        ctx.fillStyle = e.color;
        ctx.fillRect(e.x - e.radius, e.y - e.radius, e.radius * 2, e.radius * 2);
        ctx.strokeStyle = e.tier === 'boss' ? '#ff5722' : 'rgba(0,0,0,0.45)';
        ctx.lineWidth = e.tier === 'boss' ? 3 : 2;
        ctx.strokeRect(e.x - e.radius, e.y - e.radius, e.radius * 2, e.radius * 2);
      } else if (e.type === 'crawler') {
        // 疾行虫：横向椭圆
        ctx.beginPath();
        ctx.ellipse(e.x, e.y, e.radius * 1.4, e.radius, 0, 0, Math.PI * 2);
        ctx.fillStyle = e.color;
        ctx.fill();
      } else {
        // 圆球：史莱姆 / 暗影巨兽
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fillStyle = e.color;
        ctx.fill();
        // 高光
        ctx.beginPath();
        ctx.arc(e.x - e.radius * 0.25, e.y - e.radius * 0.3, e.radius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.16)';
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // 眼睛（看向玩家）
      if (e.radius >= 8) {
        const ang = Math.atan2(p.y - e.y, p.x - e.x);
        const ex = Math.cos(ang) * e.radius * 0.3;
        const ey = Math.sin(ang) * e.radius * 0.3;
        const er = Math.max(1.5, e.radius * 0.13);
        const pr = Math.max(0.8, er * 0.5);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(e.x + ex - er * 1.2, e.y + ey - er * 0.8, er, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(e.x + ex + er * 1.2, e.y + ey - er * 0.8, er, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1a1a24';
        ctx.beginPath(); ctx.arc(e.x + ex - er * 1.2 + Math.cos(ang) * pr, e.y + ey - er * 0.8 + Math.sin(ang) * pr, pr, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(e.x + ex + er * 1.2 + Math.cos(ang) * pr, e.y + ey - er * 0.8 + Math.sin(ang) * pr, pr, 0, Math.PI * 2); ctx.fill();
      }

      // 精英 / BOSS 血条
      if (e.tier === 'elite' || e.tier === 'boss') {
        const bw = e.radius * 2;
        const pct = Math.max(0, e.hp / e.maxHp);
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(e.x - bw / 2, e.y - e.radius - 10, bw, 5);
        ctx.fillStyle = e.tier === 'boss' ? '#ff5722' : '#ab47bc';
        ctx.fillRect(e.x - bw / 2, e.y - e.radius - 10, bw * pct, 5);
      }
    }
  }

  // 绘制子弹：发光弹头 + 拖尾高光
  _drawBullets(ctx) {
    for (const b of this.bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.fill();
      // 拖尾
      ctx.beginPath();
      ctx.arc(b.x - b.vx * 0.014, b.y - b.vy * 0.014, b.radius * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.fill();
    }
  }

  // 绘制追踪飞刃
  _drawBlades(ctx) {
    for (const b of this.blades) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.ang);
      ctx.beginPath();
      ctx.moveTo(11, 0); ctx.lineTo(-6, -6); ctx.lineTo(-2, 0); ctx.lineTo(-6, 6); ctx.closePath();
      ctx.fillStyle = '#e8edf4';
      ctx.fill();
      ctx.strokeStyle = '#ffd54f';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
  }

  // 绘制经验球：脉冲金球 + 高光
  _drawOrbs(ctx) {
    const t = this.elapsed;
    for (const o of this.orbs) {
      const pulse = 1 + Math.sin(t * 6 + o.x * 0.1) * 0.12;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.r * pulse, 0, Math.PI * 2);
      ctx.fillStyle = CONFIG.orb.color;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(o.x - o.r * 0.2, o.y - o.r * 0.25, o.r * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = CONFIG.orb.colorInner;
      ctx.fill();
    }
  }

  // 画布尺寸变化回调（UI 调用）
  onResize() {
    // 重建粒子（数量随屏幕面积变化）
    this.particles = this._initParticles();
    // 若玩家已存在且越界，拉回画面内
    const p = this.player;
    if (p) {
      p.x = Math.max(p.radius, Math.min(this.canvas.width - p.radius, p.x));
      p.y = Math.max(p.radius, Math.min(this.canvas.height - p.radius, p.y));
    }
  }
}