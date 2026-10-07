/**
 * ui/screen-death.js — 死亡结算界面
 * show(stats) 渲染本局统计（最高等级/击杀/存活时长/技能列表），点击重开调用 Game.restart。
 * 通过 window.ZS.UI.manager 注册为 'death'。
 */
(function () {
  const ZS = window.ZS;
  const screen = {
    el: null,
    statsEl: null,

    init() {
      this.el = document.getElementById('death-screen');
      this.statsEl = document.getElementById('death-stats');
      document.getElementById('btn-restart').addEventListener('click', () => {
        ZS.Sfx.ensure();
        ZS.Sfx.select();
        ZS.Game.restart();
      });
    },

    show(stats) {
      if (!this.statsEl) return;
      this.statsEl.innerHTML = '';
      for (const [label, value] of stats) {
        const row = document.createElement('div');
        row.style.whiteSpace = 'pre-line';
        row.innerHTML = `<b>${label}</b>　${value}`;
        this.statsEl.appendChild(row);
      }
      if (this.el) this.el.classList.remove('hidden');
    },

    hide() { if (this.el) this.el.classList.add('hidden'); },
  };

  ZS.UI.manager.register('death', screen);
})();