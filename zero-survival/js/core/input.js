/**
 * core/input.js — 输入管理
 * 集中键盘/鼠标状态，供各系统读取（只读访问，系统不直接绑监听）。
 * 通过 window.ZS.Input 暴露。
 */
(function () {
  const keys = new Set();          // 当前按住的键（小写）
  const mouse = { x: 0, y: 0, active: false };

  const Input = {
    keys,
    mouse,
    // 是否按住某键
    down(k) { return keys.has(k); },
    // 移动轴（WASD/方向键）: {x, y} 归一化前的原始方向
    moveAxis() {
      let dx = 0, dy = 0;
      if (keys.has('w') || keys.has('arrowup')) dy -= 1;
      if (keys.has('s') || keys.has('arrowdown')) dy += 1;
      if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
      if (keys.has('d') || keys.has('arrowright')) dx += 1;
      return { dx, dy };
    },
    init() {
      const keyName = (e) => e.key.toLowerCase();
      window.addEventListener('keydown', (e) => {
        const k = keyName(e);
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
          e.preventDefault();
        }
        keys.add(k);
      });
      window.addEventListener('keyup', (e) => { keys.delete(keyName(e)); });
      window.addEventListener('blur', () => keys.clear());
      window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        mouse.active = true;
      });
    },
    reset() { keys.clear(); mouse.active = false; },
  };

  window.ZS = window.ZS || {};
  window.ZS.Input = Input;
})();