/**
 * ui/screen-style.js — 风格选择界面（每局随机三选一）
 * show(styles) 渲染三张风格卡（图标+名称+描述+主题色色板），点击设为本局风格。
 * 通过 window.ZS.UI.manager 注册为 'style'。
 */
(function () {
  const ZS = window.ZS;
  const screen = {
    el: null,
    container: null,

    init() {
      this.el = document.getElementById('style-screen');
      this.container = document.getElementById('style-choices');
    },

    show(styles) {
      if (!this.container) return;
      this.container.innerHTML = '';
      for (const s of styles) {
        const th = s.theme;
        const card = document.createElement('div');
        card.className = 'style-card';
        card.innerHTML = `
          <div class="style-card-head">
            <span class="style-icon" style="background:radial-gradient(circle at 35% 30%, ${th.player.glow}, #141c30 72%);border-color:${th.player.color}">${s.icon}</span>
            <div class="style-info">
              <div class="style-name">${s.name}</div>
              <div class="style-desc">${s.desc}</div>
            </div>
            <div class="style-swatch">
              <span style="background:${th.player.color}"></span>
              <span style="background:${th.enemy.tint}"></span>
              <span style="background:${th.boss.color}"></span>
            </div>
          </div>`;
        card.addEventListener('click', () => ZS.Game.chooseStyle(s.id));
        this.container.appendChild(card);
      }
      if (this.el) this.el.classList.remove('hidden');
    },

    hide() { if (this.el) this.el.classList.add('hidden'); },
  };

  ZS.UI.manager.register('style', screen);
})();