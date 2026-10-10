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
        // 暴击：彩字 + 局部物理火花（全屏闪/顿帧/震动已注释，避免闪屏）
        world.addText(e.x, e.y, '暴击', '#ff7043');
        // FX.freeze(world, 0.04);
        // FX.flash(world, 0.22);
        // FX.shake(world, 0.12, 3);
        world.spawnParticles(e.x, e.y, {
          count: 10, colors: ['#ffd54f', '#fff3c4', '#ff7043'],
          speed: 140, speedVar: 60, size: 2, gravity: 200, drag: 0.95, life: 0.35,
        });
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
      // 死亡视觉：物理爆散粒子（怪物色，随体积缩放，四散 + 重力）+ 轻震
      const ecol = (e.appearance && e.appearance.color) || '#ffffff';
      const rad = e.radius || 14;
      const s = rad / 14;   // 相对默认大小的缩放系数（越大怪越丰富）
      world.spawnParticles(e.x, e.y, {
        count: Math.round(10 + s * 10),            // 数量随体积
        color: ecol, colors: [ecol, '#ffffff'],
        speed: 90 + s * 60, speedVar: 40 + s * 30, // 速度随体积
        size: 1.8 + s * 1.2,                       // 粒子大小随体积
        gravity: 220, drag: 0.95, life: 0.45 + s * 0.2, // 寿命随体积
      });
      if (e.tier === 'boss') window.ZS.Systems.FX.shake(world, 0.18, 6);
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