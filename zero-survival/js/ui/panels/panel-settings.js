/**
 * ui/panels/panel-settings.js — 设置面板
 * 音量、音效开关、全屏、恢复默认。持久化到 localStorage，即时生效。
 * 通过 window.ZS.UI.Panel.register 注册为 'settings'。
 */
(function () {
  const Panel = window.ZS.UI.Panel;
  // 渲染一行带滑杆的设置项
  function row(label, desc, controlEl) {
    const r = document.createElement('div');
    r.className = 'set-row';
    const l = document.createElement('div');
    l.className = 'set-info';
    l.innerHTML = `<span class="set-label">${label}</span>${desc ? `<span class="set-desc">${desc}</span>` : ''}`;
    const c = document.createElement('div');
    c.className = 'set-ctl';
    c.appendChild(controlEl);
    r.appendChild(l); r.appendChild(c);
    return r;
  }

  function build(host, ctx) {
    const store = ctx.store;
    const Sfx = window.ZS.Sfx;

    // 1) 主音量
    const volSlider = document.createElement('input');
    volSlider.type = 'range'; volSlider.min = 0; volSlider.max = 1; volSlider.step = 0.01;
    volSlider.value = store.get('volume');
    volSlider.className = 'range';
    const volVal = document.createElement('span');
    volVal.className = 'range-val'; volVal.textContent = Math.round(store.get('volume') * 100) + '%';
    const volCtl = document.createElement('div');
    volCtl.className = 'range-wrap';
    volCtl.appendChild(volSlider); volCtl.appendChild(volVal);
    volSlider.addEventListener('input', () => {
      const v = parseFloat(volSlider.value);
      store.set('volume', v);
      Sfx.setVolume(v);
      volVal.textContent = Math.round(v * 100) + '%';
    });

    // 2) 音效开关
    const sfxBtn = document.createElement('button');
    sfxBtn.className = 'toggle';
    sfxBtn.textContent = store.get('sfxOn') ? '开启' : '关闭';
    sfxBtn.addEventListener('click', () => {
      const v = !store.get('sfxOn');
      store.set('sfxOn', v);
      Sfx.setEnabled(v);
      sfxBtn.textContent = v ? '开启' : '关闭';
      sfxBtn.classList.toggle('on', v);
      if (v) Sfx.select();
    });
    sfxBtn.classList.toggle('on', store.get('sfxOn'));

    // 3) 全屏
    const fsBtn = document.createElement('button');
    fsBtn.className = 'toggle';
    fsBtn.textContent = store.get('fullscreen') ? '开' : '关';
    fsBtn.addEventListener('click', () => {
      const v = !store.get('fullscreen');
      store.set('fullscreen', v);
      toggleFullscreen(v);
      fsBtn.textContent = v ? '开' : '关';
      fsBtn.classList.toggle('on', v);
    });
    fsBtn.classList.toggle('on', store.get('fullscreen'));

    host.appendChild(row('主音量', '整体音量', volCtl));
    host.appendChild(row('音效', '程序化合成音效', sfxBtn));
    host.appendChild(row('全屏', '浏览器全屏显示', fsBtn));

    // 恢复默认
    const reset = document.createElement('button');
    reset.className = 'btn btn-ghost btn-block';
    reset.textContent = '恢复默认设置';
    reset.addEventListener('click', () => {
      store.reset();
      window.location.reload();
    });
    host.appendChild(reset);
  }

  function toggleFullscreen(on) {
    const d = document.documentElement;
    if (on) {
      if (d.requestFullscreen) d.requestFullscreen().catch(() => {});
    } else if (document.fullscreenElement) {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  }

  Panel.register({
    id: 'settings',
    title: '设置',
    icon: '⚙️',
    build,
  });
})();