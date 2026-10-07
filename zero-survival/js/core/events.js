/**
 * core/events.js — 事件总线（EventBus）
 * 解耦跨模块通信：系统不互相 import，通过事件广播 + 订阅协作。
 * 事件常量集中定义，新增事件只需在这里加一行。
 * 通过 window.ZS.Events 暴露。
 */
(function () {
  // ---- 事件常量 ----
  const EV = {
    GAME_START: 'game:start',     // 一局开始
    GAME_OVER: 'game:over',       // 一局结束（死亡）
    KILL: 'combat:kill',          // 击杀怪物（带被击杀怪物引用）
    HURT: 'combat:hurt',          // 玩家受伤（带伤害）
    XP_PICKUP: 'xp:pickup',       // 拾取经验球（带经验值）
    LEVEL_UP: 'level:up',         // 升级（带新等级）
    SKILL_PICK: 'skill:pick',     // 玩家选中技能（带技能id）
    BOSS: 'boss:spawn',           // BOSS 登场（带boss引用）
    UI_SHOW: 'ui:show',           // 显示某UI（带 {id, payload}）
    UI_HIDE: 'ui:hide',           // 隐藏某UI（带 {id}）
  };

  // ---- 事件总线 ----
  const handlers = new Map();

  const Events = {
    // 订阅：返回取消函数
    on(event, fn) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event).add(fn);
      return () => handlers.get(event) && handlers.get(event).delete(fn);
    },
    // 广播
    emit(event, payload) {
      const set = handlers.get(event);
      if (!set) return;
      for (const fn of set) {
        try { fn(payload); } catch (err) { console.error('[Events]', event, err); }
      }
    },
    // 清空（重开/重置时可选）
    clear() { handlers.clear(); },
  };

  window.ZS = window.ZS || {};
  window.ZS.Events = { EV, bus: Events };
})();