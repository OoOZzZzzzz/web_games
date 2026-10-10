/**
 * systems/xp.js — 经验系统
 * 经验球磁吸/拾取、经验累积、升级（暂停+弹三选一）、选中技能应用。
 * 通过 window.ZS.Systems.XPSystem 暴露（实例 chooseSkill 由 game/UI 调用）。
 */
(function () {
  const CONFIG = window.ZS.CONFIG;
  const Data = window.ZS.Data;
  const Sfx = window.ZS.Sfx;
  const RNG = window.ZS.RNG;
  const bus = window.ZS.Events.bus;
  const EV = window.ZS.Events.EV;
  const System = window.ZS.Core.System;
  const skillCalc = window.ZS.Systems.skillCalc;

  class XPSystem extends System {
    constructor() {
      super({ name: 'XP' });
    }
    update(world, dt) {
      if (!world.player || world.phase !== 'battle') return;
      this._updateOrbs(world, dt);
    }

    // 经验球：初速衰减 → 磁吸 → 触碰拾取
    _updateOrbs(world, dt) {
      const p = world.player;
      const mag = CONFIG.orb.magnetRadius;
      for (let i = world.orbs.length - 1; i >= 0; i--) {
        const o = world.orbs[i];
        o.life -= dt;
        if (o.life <= 0) { world.orbs.splice(i, 1); continue; }
        const dx = p.x - o.x;
        const dy = p.y - o.y;
        const dist = Math.hypot(dx, dy) || 0.001;
        if (dist < mag && dist > 3) {
          o.x += (dx / dist) * CONFIG.orb.magnetSpeed * dt;
          o.y += (dy / dist) * CONFIG.orb.magnetSpeed * dt;
        } else if (o.vx || o.vy) {
          o.x += o.vx * dt;
          o.y += o.vy * dt;
          o.vx *= 0.9;
          o.vy *= 0.9;
        }
        if (dist < o.r + p.radius) {
          world.orbs.splice(i, 1);
          this.addXp(world, o.value);
          Sfx.pickup();
          bus.emit(EV.XP_PICKUP, o.value);
        }
      }
    }

    // 增加经验，可能一次连续升多级
    addXp(world, amount) {
      world.xp += amount;
      let need = Data.XP.xpNeeded(world.level);
      while (need > 0 && world.xp >= need) {
        world.xp -= need;
        world.level++;
        if (world.level > world.maxLevel) world.maxLevel = world.level;
        this._onLevelUp(world);
        if (world.engine && world.engine.paused) break; // 弹窗打开，剩余升级待选择后继续
        need = Data.XP.xpNeeded(world.level);
      }
    }

    // 升级：暂停 + 弹三选一
    _onLevelUp(world) {
      Sfx.levelUp();
      if (world.engine && world.engine.paused) return;
      const choices = this._rollChoices(world);
      if (choices.length === 0) return; // 全部满级，无需弹窗
      if (world.engine) world.engine.pause();
      bus.emit(EV.LEVEL_UP, { level: world.level, choices });
      window.ZS.UI.manager.show('levelup', choices);
    }

    // 三选一（跳过满级技能）
    _rollChoices(world) {
      const pool = [];
      for (const sk of Data.SKILLS) {
        if (skillCalc.lv(world, sk.id) < sk.levels.length) pool.push(sk);
      }
      const shuffled = RNG.shuffle(pool.slice());
      return shuffled.slice(0, 3).map((sk) => {
        const lv = skillCalc.lv(world, sk.id);
        const next = lv + 1;
        return {
          id: sk.id, icon: sk.icon, name: sk.name, category: sk.category,
          level: next, isNew: lv === 0, maxLevel: sk.levels.length,
          desc: sk.levels[next - 1],
        };
      });
    }

    // 选中技能：应用 + 恢复 + 处理连升（由 game/UI 调用）
    chooseSkill(world, skillId) {
      world.skills[skillId] = (world.skills[skillId] || 0) + 1;
      if (skillId === 'vitality') skillCalc.applyVitality(world);
      else if (skillId === 'blade') skillCalc.rebuildBlades(world);
      Sfx.select();
      bus.emit(EV.SKILL_PICK, skillId);
      // 选中技能视觉：主题色脉动环 + 漂浮图标
      const sk = Data.SKILL_MAP[skillId];
      const p = world.player;
      const vcolor = (sk.visual && sk.visual.color) || '#ffd54f';
      if (p) {
        world.addFx({ type: 'ring', x: p.x, y: p.y, color: vcolor, r: 42, life: 0.5, max: 0.5 });
        if (sk.id === 'vitality') {
          world.addFx({ type: 'burst', x: p.x, y: p.y, color: '#81c784', count: 10, speed: 90, life: 0.5, max: 0.5, baseAng: 0 });
        }
        world.addText(p.x, p.y - p.radius - 14, sk.icon + ' ' + sk.name, vcolor);
      }
      if (world.engine) world.engine.resume();
      const need = Data.XP.xpNeeded(world.level);
      if (need > 0 && world.xp >= need) this._onLevelUp(world);
    }
  }

  window.ZS = window.ZS || {};
  window.ZS.Systems = window.ZS.Systems || {};
  window.ZS.Systems.XPSystem = XPSystem;
})();