/**
 * Ambient type declaration for the optional inspector package.
 * This prevents TS2307 when `@mcpfusion/inspector`
 * is dynamically imported but not installed (e.g. CI builds).
 */
declare module '@mcpfusion/inspector' {
    export function runInspector(argv: string[]): Promise<void>;
    export function parseInspectorArgs(argv: string[]): {
        pid: number | undefined;
        path: string | undefined;
        out: 'tui' | 'stderr';
        demo: boolean;
        help: boolean;
    };
    export const INSPECTOR_HELP: string;
}
