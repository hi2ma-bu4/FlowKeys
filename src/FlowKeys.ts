type Key = KeyboardEvent["key"];
type CommandCallback = () => void;
type KeyCombo = Set<Key>;

interface TrieNode {
	children: Map<string, TrieNode>;
	callback?: CommandCallback;
}

export class FlowKeys {
	private root: TrieNode = { children: new Map() };
	private buffer: KeyCombo[] = [];
	private maxSequenceLength = 0;
	private pressedKeys: Set<Key> = new Set();
	private aliasMap: Map<Key, Key[]> = new Map();
	private target: HTMLElement | Document | Window;
	private keyPushTimeout = 30;
	private keyPushTimer: number | null = null;

	// 標準化マップ（OS/ブラウザ差異の吸収）
	private static STANDARD_KEY_MAP: Record<Key, Key> = {
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
		Windows: "Meta",
	};

	constructor(target?: HTMLElement | Document | Window) {
		this.target = (target ?? window) as Window;
		this.handleKeyDown = this.handleKeyDown.bind(this);
		this.handleKeyUp = this.handleKeyUp.bind(this);
		this.target.addEventListener("keydown", this.handleKeyDown, true);
		this.target.addEventListener("keyup", this.handleKeyUp, true);
	}

	// 代替キー登録
	public addAlias(key: Key, aliases: Key[]) {
		this.aliasMap.set(
			key.toLowerCase(),
			aliases.map((k) => k.toLowerCase())
		);
	}

	// シーケンス登録
	public register(sequence: (Key | Key[])[], callback: CommandCallback) {
		if (!sequence.length) return;
		this.maxSequenceLength = Math.max(this.maxSequenceLength, sequence.length);

		let node = this.root;
		for (const item of sequence) {
			const combo = new Set(Array.isArray(item) ? item : [item]);
			const key = FlowKeys.setToKey(this.normalizeCombo(combo));
			if (!node.children.has(key)) node.children.set(key, { children: new Map() });
			node = node.children.get(key)!;
		}
		node.callback = callback;
	}

	private normalizeCombo(combo: KeyCombo): KeyCombo {
		const normalized = new Set<Key>();
		for (let k of combo) {
			// 標準化キーに変換
			k = (FlowKeys.STANDARD_KEY_MAP[k] ?? k).toLowerCase();

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

	private static setToKey(combo: KeyCombo) {
		return Array.from(combo).sort().join("+");
	}

	private handleKeyDown(event: KeyboardEvent) {
		const key = (FlowKeys.STANDARD_KEY_MAP[event.key] ?? event.key).toLowerCase();
		const now = performance.now();

		this.pressedKeys.add(key);

		if (this.keyPushTimer !== null) clearTimeout(this.keyPushTimer);
		this.keyPushTimer = window.setTimeout(() => {
			this.updateBuffer();
			this.keyPushTimer = null;
		}, this.keyPushTimeout);
	}

	private handleKeyUp(event: KeyboardEvent) {
		const key = (FlowKeys.STANDARD_KEY_MAP[event.key] ?? event.key).toLowerCase();
		this.pressedKeys.delete(key);
	}

	private updateBuffer() {
		const comboKey = this.normalizeCombo(this.pressedKeys);
		this.buffer.push(comboKey);
		if (this.buffer.length > this.maxSequenceLength) this.buffer.shift();
		this.checkBuffer();
	}

	private checkBuffer() {
		if (!this.buffer.length) return;
		console.log(this.buffer);
		let node = this.root;
		// 最新入力から先頭まで順にたどる
		for (let i = this.buffer.length - this.maxSequenceLength; i < this.buffer.length; i++) {
			if (i < 0) continue;
			node = this.root;
			let match = true;
			for (let j = i; j < this.buffer.length; j++) {
				const keyStr = FlowKeys.setToKey(this.buffer[j]);
				if (!node.children.has(keyStr)) {
					match = false;
					break;
				}
				node = node.children.get(keyStr)!;
			}
			if (match && node.callback) {
				node.callback();
			}
		}
	}

	public destroy() {
		(this.target as Window).removeEventListener("keydown", this.handleKeyDown, true);
		(this.target as Window).removeEventListener("keyup", this.handleKeyUp, true);
		if (this.keyPushTimer !== null) clearTimeout(this.keyPushTimer);
		this.buffer = [];
		this.root = { children: new Map() };
		this.pressedKeys.clear();
		this.aliasMap.clear();
		this.maxSequenceLength = 0;
	}
}

if (typeof window !== "undefined") {
	(window as any).FlowKeys = FlowKeys;
}
