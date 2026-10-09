/**
 * ui/screen-start.js — 开始界面
 * 点击「开始游戏」→ 显示新手弹窗。
 * 通过 window.ZS.UI.manager 注册为 'start'。
 */
(function () {
  const ZS = window.ZS;
  const screen = {
    el: null,
    init() {
      this.el = document.getElementById('start-screen');
      document.getElementById('btn-start').addEventListener('click', () => {
        ZS.Sfx.ensure();
        ZS.Sfx.select();
        ZS.Game.startFlow(true);
      });
    },
    show() { if (this.el) this.el.classList.remove('hidden'); },
    hide() { if (this.el) this.el.classList.add('hidden'); },
  };

  ZS.UI.manager.register('start', screen);
})();