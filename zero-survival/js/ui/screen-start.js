/**
 * ui/screen-start.js — 主菜单（控制台式 dock）
 * 现代简约布局：左上角标题、底部面板 dock（模式/场景/设置/开发者）+ 右下角「开始游戏」主按钮。
 * 面板由 Panel 系统统一挂载到 #panel-host。开始按钮走 startFlow → 风格选择。
 * 通过 window.ZS.UI.manager 注册为 'start'。
 */
(function () {
  const ZS = window.ZS;
  const Panel = ZS.UI.Panel;
  const store = ZS.UI.store;

  // 应用已存设置（音量/音效/全屏）到系统
  function applyStored() {
    ZS.Sfx.setVolume(store.get('volume'));
    ZS.Sfx.setEnabled(store.get('sfxOn'));
    if (store.get('fullscreen')) {
      const d = document.documentElement;
      if (d.requestFullscreen) d.requestFullscreen().catch(() => {});
    }
  }

  const screen = {
    el: null,

    init() {
      this.el = document.getElementById('start-screen');
      const menu = ZS.Data.uiMenu.menu;

      // 底部 dock：动态生成面板项
      const dock = this.el.querySelector('.menu-dock');
      for (const item of menu) {
        const btn = document.createElement('button');
        btn.className = 'dock-pill';
        btn.innerHTML = `<span class="pill-ico">${item.icon}</span><span class="pill-label">${item.label}</span>`;
        btn.addEventListener('click', () => { ZS.Sfx.ensure(); ZS.Sfx.select(); Panel.open(item.id); });
        dock.appendChild(btn);
      }

      // 开始游戏（右下角）
      document.getElementById('btn-start').addEventListener('click', () => {
        ZS.Sfx.ensure();
        ZS.Sfx.select();
        ZS.Game.startFlow(true);
      });

      // 面板宿主：点背景遮罩关闭
      const host = this.el.querySelector('#panel-host');
      Panel.mount(host);
      host.addEventListener('click', (e) => { if (e.target === host) Panel.close(); });

      // 显示版本号 + 标语
      const ver = this.el.querySelector('.menu-version');
      if (ver) ver.textContent = ZS.Data.uiMenu.version;
      const tag = this.el.querySelector('#menu-tagline');
      if (tag) tag.textContent = ZS.Data.uiMenu.tagline;

      applyStored();
    },

    show() { if (this.el) { this.el.classList.remove('hidden'); Panel.close(); } },
    hide() { if (this.el) this.el.classList.add('hidden'); },
  };

  ZS.UI.manager.register('start', screen);
})();