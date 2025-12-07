// src/FlowKeys.ts
var FlowKeys = class _FlowKeys {
  root = { children: /* @__PURE__ */ new Map() };
  buffer = [];
  maxSequenceLength = 0;
  pressedKeys = /* @__PURE__ */ new Set();
  isLastKeyDown = false;
  aliasMap = /* @__PURE__ */ new Map();
  target;
  // 標準化マップ（OS/ブラウザ差異の吸収）
  static STANDARD_KEY_MAP = {
    esc: "escape",
    del: "delete",
    return: "enter",
    left: "arrowleft",
    right: "arrowright",
    up: "arrowup",
    down: "arrowdown",
    " ": "space",
    ctrl: "control",
    cmd: "meta",
    windows: "meta"
  };
  constructor(target) {
    this.target = target ?? window;
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.target.addEventListener("keydown", this.handleKeyDown, true);
    this.target.addEventListener("keyup", this.handleKeyUp, true);
  }
  // 代替キー登録
  addAlias(key, aliases) {
    this.aliasMap.set(
      key.toLowerCase(),
      aliases.map((k) => k.toLowerCase())
    );
  }
  // シーケンス登録
  register(sequence, callback) {
    if (!sequence.length) return;
    this.maxSequenceLength = Math.max(this.maxSequenceLength, sequence.length);
    let node = this.root;
    for (const item of sequence) {
      const combo = new Set(Array.isArray(item) ? item : [item]);
      const key = _FlowKeys.setToKey(this.normalizeCombo(combo));
      if (!node.children.has(key)) node.children.set(key, { children: /* @__PURE__ */ new Map() });
      node = node.children.get(key);
    }
    node.callback = callback;
  }
  normalizeCombo(combo) {
    const normalized = /* @__PURE__ */ new Set();
    for (let k of combo) {
      k = (_FlowKeys.STANDARD_KEY_MAP[k] ?? k).toLowerCase();
      let mapped = false;
      for (const [key, aliases] of this.aliasMap) {
        if (aliases.includes(k)) {
          normalized.add(key);
          mapped = true;
          break;
        }
      }
      if (!mapped) normalized.add(k);
    }
    return normalized;
  }
  static setToKey(combo) {
    return Array.from(combo).sort().join("+");
  }
  handleKeyDown(event) {
    const key = (_FlowKeys.STANDARD_KEY_MAP[event.key] ?? event.key).toLowerCase();
    if (this.pressedKeys.has(key)) return;
    this.pressedKeys.add(key);
    this.isLastKeyDown = true;
  }
  handleKeyUp(event) {
    const key = (_FlowKeys.STANDARD_KEY_MAP[event.key] ?? event.key).toLowerCase();
    if (this.pressedKeys.has(key) && this.isLastKeyDown) {
      this.isLastKeyDown = false;
      const comboCopy = new Set(this.pressedKeys);
      this.buffer.push(this.normalizeCombo(comboCopy));
      if (this.buffer.length > this.maxSequenceLength) this.buffer.shift();
      this.checkBuffer();
    }
    this.pressedKeys.delete(key);
  }
  checkBuffer() {
    if (!this.buffer.length) return;
    for (let start = 0; start < this.buffer.length; start++) {
      let node = this.root;
      let matched = true;
      for (let i = start; i < this.buffer.length; i++) {
        const keyStr = _FlowKeys.setToKey(this.buffer[i]);
        if (!node.children.has(keyStr)) {
          matched = false;
          break;
        }
        node = node.children.get(keyStr);
      }
      if (matched && node.callback) node.callback();
    }
  }
  destroy() {
    this.target.removeEventListener("keydown", this.handleKeyDown, true);
    this.target.removeEventListener("keyup", this.handleKeyUp, true);
    this.buffer = [];
    this.root = { children: /* @__PURE__ */ new Map() };
    this.pressedKeys.clear();
    this.isLastKeyDown = false;
    this.aliasMap.clear();
    this.maxSequenceLength = 0;
  }
};
if (typeof window !== "undefined") {
  window.FlowKeys = FlowKeys;
}
export {
  FlowKeys
};
//# sourceMappingURL=FlowKeys.js.map
