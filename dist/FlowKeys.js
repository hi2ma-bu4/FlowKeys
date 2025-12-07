// src/FlowKeys.ts
var FlowKeys = class _FlowKeys {
  root = { children: /* @__PURE__ */ new Map() };
  buffer = [];
  maxSequenceLength = 0;
  pressedKeys = /* @__PURE__ */ new Set();
  aliasMap = /* @__PURE__ */ new Map();
  target;
  keyPushTimeout = 30;
  keyPushTimer = null;
  // 標準化マップ（OS/ブラウザ差異の吸収）
  static STANDARD_KEY_MAP = {
    Esc: "Escape",
    Del: "Delete",
    Return: "Enter",
    Left: "ArrowLeft",
    Right: "ArrowRight",
    Up: "ArrowUp",
    Down: "ArrowDown",
    " ": "Space",
    Ctrl: "Control",
    Cmd: "Meta",
    Windows: "Meta"
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
    const now = performance.now();
    this.pressedKeys.add(key);
    if (this.keyPushTimer !== null) clearTimeout(this.keyPushTimer);
    this.keyPushTimer = window.setTimeout(() => {
      this.updateBuffer();
      this.keyPushTimer = null;
    }, this.keyPushTimeout);
  }
  handleKeyUp(event) {
    const key = (_FlowKeys.STANDARD_KEY_MAP[event.key] ?? event.key).toLowerCase();
    this.pressedKeys.delete(key);
  }
  updateBuffer() {
    const comboKey = this.normalizeCombo(this.pressedKeys);
    this.buffer.push(comboKey);
    if (this.buffer.length > this.maxSequenceLength) this.buffer.shift();
    this.checkBuffer();
  }
  checkBuffer() {
    if (!this.buffer.length) return;
    console.log(this.buffer);
    let node = this.root;
    for (let i = this.buffer.length - this.maxSequenceLength; i < this.buffer.length; i++) {
      if (i < 0) continue;
      node = this.root;
      let match = true;
      for (let j = i; j < this.buffer.length; j++) {
        const keyStr = _FlowKeys.setToKey(this.buffer[j]);
        if (!node.children.has(keyStr)) {
          match = false;
          break;
        }
        node = node.children.get(keyStr);
      }
      if (match && node.callback) {
        node.callback();
      }
    }
  }
  destroy() {
    this.target.removeEventListener("keydown", this.handleKeyDown, true);
    this.target.removeEventListener("keyup", this.handleKeyUp, true);
    if (this.keyPushTimer !== null) clearTimeout(this.keyPushTimer);
    this.buffer = [];
    this.root = { children: /* @__PURE__ */ new Map() };
    this.pressedKeys.clear();
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
