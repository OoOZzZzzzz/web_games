/**
 * ui/screen-hud.js — 游戏运行 HUD（常驻显示）
 * 显示等级/HP条/经验条/击杀数。订阅事件自动刷新，读取全局 ZS.World。
 * 通过 window.ZS.UI.manager 注册为 'hud'。
 */
(function () {
  const ZS = window.ZS;
  const bus = ZS.Events.bus;
  const EV = ZS.Events.EV;

  function clamp(v, min, max) { return v < min ? min : (v > max ? max : v); }

  const screen = {
    el: null,
    level: null, hpFill: null, hpText: null, xpFill: null, xpText: null, kills: null,

    init() {
      this.el = document.getElementById('hud');
      this.level = document.getElementById('hud-level');
      this.hpFill = document.getElementById('hud-hp-fill');
      this.hpText = document.getElementById('hud-hp-text');
      this.xpFill = document.getElementById('hud-xp-fill');
      this.xpText = document.getElementById('hud-xp-text');
      this.kills = document.getElementById('hud-kills');
      // 事件驱动刷新
      const refresh = () => this.refresh();
      bus.on(EV.KILL, refresh);
      bus.on(EV.XP_PICKUP, refresh);
      bus.on(EV.LEVEL_UP, refresh);
      bus.on(EV.SKILL_PICK, refresh);
      bus.on(EV.HURT, refresh);
    },

    // 从世界读取并刷新
    refresh() {
      const w = ZS.World;
      const p = w.player;
      if (!p) return;
      this.level.textContent = 'Lv.' + w.level;
      const hpPct = p.maxHp > 0 ? (p.hp / p.maxHp) * 100 : 0;
      this.hpFill.style.width = clamp(hpPct, 0, 100) + '%';
      this.hpText.textContent = `HP：${Math.max(0, Math.ceil(p.hp))} / ${p.maxHp}`;
      const need = ZS.Data.XP.xpNeeded(w.level);
      const xpPct = need > 0 ? (w.xp / need) * 100 : 0;
      this.xpFill.style.width = clamp(xpPct, 0, 100) + '%';
      this.xpText.textContent = `经验：${w.xp} / ${need}`;
      this.kills.textContent = '击杀数：' + w.kills;
    },

    show() { if (this.el) this.el.classList.remove('hidden'); },
    hide() { if (this.el) this.el.classList.add('hidden'); },
  };

  ZS.UI.manager.register('hud', screen);
})();