/**
 * systems/combat.js — 伤害结算 + 击杀 + 玩家受击
 * damageEnemy：对怪物造成伤害（含暴击提示），血尽调用 killEnemy。
 * killEnemy：击杀数+1、掉经验球、生命汲取回血、播音、发 KILL 事件。
 * hurtPlayer：玩家受击（减伤/无敌/击退/红闪/音效），血尽触发死亡。
 * 通过 window.ZS.Systems.Combat 暴露。
 */
(function () {
  const CONFIG = window.ZS.CONFIG;
  const Sfx = window.ZS.Sfx;
  const bus = window.ZS.Events.bus;
  const EV = window.ZS.Events.EV;
  const skillCalc = window.ZS.Systems.skillCalc;

  const Combat = {
    // 对怪物造成伤害
    damageEnemy(world, e, dmg, isCrit = false) {
      e.hp -= dmg;
      e.hitFlash = 0.08;
      if (isCrit) {
        // 暴击：彩字 + 火花爆
        world.addText(e.x, e.y, '暴击', '#ff7043');
        world.addFx({ type: 'spark', x: e.x, y: e.y, color: '#ff7043', count: 10, speed: 90, life: 0.3, max: 0.3, baseAng: Math.random() * Math.PI * 2 });
      }
      if (e.hp <= 0) this.killEnemy(world, e);
    },

    // 击杀怪物
    killEnemy(world, e) {
      const idx = world.enemies.indexOf(e);
      if (idx < 0) return;
      world.enemies.splice(idx, 1);
      world.kills++;
      Sfx.kill();
      world.spawnOrb(e.x, e.y, e.xp);
      // 死亡视觉：粒子爆散（用怪物外观色）
      world.addFx({
        type: 'burst', x: e.x, y: e.y,
        color: (e.appearance && e.appearance.color) || '#ffffff',
        count: e.tier === 'boss' ? 26 : 12, speed: e.tier === 'boss' ? 200 : 130,
        life: 0.4, max: 0.4, baseAng: Math.random() * Math.PI * 2,
      });
      // 生命汲取：击杀回血
      const ls = skillCalc.val(world, 'lifesteal');
      if (ls) {
        const p = world.player;
        p.hp = Math.min(p.maxHp, p.hp + ls);
        // 汲取回血：红色粒子流 敌人→玩家
        world.addFx({ type: 'stream', x1: e.x, y1: e.y, x2: p.x, y2: p.y, color: '#ef5350', count: 12, life: 0.45, max: 0.45 });
      }
      bus.emit(EV.KILL, e);
    },

    // 玩家受击（减伤护甲 → 扣血 → 无敌/击退/红闪）
    hurtPlayer(world, amount, dx, dy, dist) {
      const p = world.player;
      const dmg = amount * skillCalc.armorMult(world);
      p.hp -= dmg;
      p.invulnTimer = CONFIG.player.invulnTime;
      p.hurtFlash = CONFIG.hit.flashTime;
      Sfx.hurt();
      bus.emit(EV.HURT, dmg);
      // 击退
      const kb = CONFIG.hit.knockback;
      p.x += (dx / dist) * kb;
      p.y += (dy / dist) * kb;
      const m = p.radius;
      p.x = Math.max(m, Math.min(world.width - m, p.x));
      p.y = Math.max(m, Math.min(world.height - m, p.y));
      if (p.hp <= 0) {
        p.hp = 0;
        window.ZS.Systems.Death.onDeath(world);
      }
    },
  };

  window.ZS = window.ZS || {};
  window.ZS.Systems = window.ZS.Systems || {};
  window.ZS.Systems.Combat = Combat;
})();