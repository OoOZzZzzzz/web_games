/**
 * ui/screen-tutorial.js — 新手弹窗
 * 点击「确认，开始战斗」→ 开始一局。
 * 通过 window.ZS.UI.manager 注册为 'tutorial'。
 */
(function () {
  const ZS = window.ZS;
  const screen = {
    el: null,
    init() {
      this.el = document.getElementById('tutorial-modal');
      document.getElementById('btn-confirm-start').addEventListener('click', () => {
        ZS.Sfx.ensure();
        ZS.Sfx.select();
        ZS.Game.begin();
      });
    },
    show() { if (this.el) this.el.classList.remove('hidden'); },
    hide() { if (this.el) this.el.classList.add('hidden'); },
  };

  ZS.UI.manager.register('tutorial', screen);
})();