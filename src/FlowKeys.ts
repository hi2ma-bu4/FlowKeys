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
	private isLastKeyDown: boolean = false;
	private aliasMap: Map<Key, Key[]> = new Map();
	private target: HTMLElement | Document | Window;

	// 標準化マップ（OS/ブラウザ差異の吸収）
	private static STANDARD_KEY_MAP: Record<Key, Key> = {
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
		windows: "meta",
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
		if (this.pressedKeys.has(key)) return;
		this.pressedKeys.add(key);
		this.isLastKeyDown = true;
	}

	private handleKeyUp(event: KeyboardEvent) {
		const key = (FlowKeys.STANDARD_KEY_MAP[event.key] ?? event.key).toLowerCase();
		if (this.pressedKeys.has(key) && this.isLastKeyDown) {
			this.isLastKeyDown = false;

			const comboCopy = new Set(this.pressedKeys);
			this.buffer.push(this.normalizeCombo(comboCopy));
			if (this.buffer.length > this.maxSequenceLength) this.buffer.shift();

			this.checkBuffer();
		}

		this.pressedKeys.delete(key);
	}

	private checkBuffer() {
		if (!this.buffer.length) return;
		for (let start = 0; start < this.buffer.length; start++) {
			let node: TrieNode = this.root;
			let matched = true;
			for (let i = start; i < this.buffer.length; i++) {
				const keyStr = FlowKeys.setToKey(this.buffer[i]);
				if (!node.children.has(keyStr)) {
					matched = false;
					break;
				}
				node = node.children.get(keyStr)!;
			}
			if (matched && node.callback) node.callback();
		}
	}

	public destroy() {
		(this.target as Window).removeEventListener("keydown", this.handleKeyDown, true);
		(this.target as Window).removeEventListener("keyup", this.handleKeyUp, true);
		this.buffer = [];
		this.root = { children: new Map() };
		this.pressedKeys.clear();
		this.isLastKeyDown = false;
		this.aliasMap.clear();
		this.maxSequenceLength = 0;
	}
}

if (typeof window !== "undefined") {
	(window as any).FlowKeys = FlowKeys;
}
