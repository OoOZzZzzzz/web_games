/**
 * ui/settings-store.js — 用户设置存取（localStorage）
 * 统一读写主菜单用户偏好：音量、音效开关、全屏、场景、模式。
 * 通过 window.ZS.UI.store 暴露。
 */
(function () {
  const KEY = 'zero_survival_settings';
  const DEFAULTS = {
    volume: 0.6,
    sfxOn: true,
    fullscreen: false,
    scene: 'random',
    mode: 'standard',
  };

  const store = {
    _data: null,

    // 读取（懒加载 + 合并默认）
    data() {
      if (this._data) return this._data;
      let saved = {};
      try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { saved = {}; }
      this._data = Object.assign({}, DEFAULTS, saved);
      return this._data;
    },

    get(key) { return this.data()[key]; },
    set(key, val) {
      this.data()[key] = val;
      try { localStorage.setItem(KEY, JSON.stringify(this._data)); } catch (e) { /* 隐私模式等忽略 */ }
      return this;
    },

    reset() {
      this._data = Object.assign({}, DEFAULTS);
      try { localStorage.setItem(KEY, JSON.stringify(this._data)); } catch (e) {}
    },
  };

  window.ZS = window.ZS || {};
  window.ZS.UI = window.ZS.UI || {};
  window.ZS.UI.store = store;
})();