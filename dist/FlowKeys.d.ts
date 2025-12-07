type Key = KeyboardEvent["key"];
type CommandCallback = () => void;
export declare class FlowKeys {
    private root;
    private buffer;
    private maxSequenceLength;
    private pressedKeys;
    private isLastKeyDown;
    private aliasMap;
    private target;
    private static STANDARD_KEY_MAP;
    constructor(target?: HTMLElement | Document | Window);
    addAlias(key: Key, aliases: Key[]): void;
    register(sequence: (Key | Key[])[], callback: CommandCallback): void;
    private normalizeCombo;
    private static setToKey;
    private handleKeyDown;
    private handleKeyUp;
    private checkBuffer;
    destroy(): void;
}
export {};
//# sourceMappingURL=FlowKeys.d.ts.map