import { describe, it, expect } from 'vitest';
import { emitTool } from '../src/emitter/ToolEmitter.js';
import type { DMMFModel, DMMFField } from '../src/parser/AnnotationParser.js';
import { parseAnnotations } from '../src/parser/AnnotationParser.js';

// ── Helpers ──────────────────────────────────────────────

function field(overrides: Partial<DMMFField> & { name: string }): DMMFField {
    return {
        kind: 'scalar',
        type: 'String',
        isList: false,
        isRequired: true,
        isId: false,
        hasDefaultValue: false,
        isUnique: false,
        ...overrides,
    };
}

function makeModel(): DMMFModel {
    return {
        name: 'Widget',
        fields: [
            field({ name: 'id', isId: true, hasDefaultValue: true }),
            field({ name: 'label' }),
        ],
    };
}

function makeTenantModel(): DMMFModel {
    return {
        name: 'Order',
        fields: [
            field({ name: 'id', isId: true, hasDefaultValue: true }),
            field({ name: 'total', type: 'Float' }),
            field({ name: 'tenantId', documentation: '@mcpfusion.tenantKey' }),
        ],
    };
}

// ── Tests ────────────────────────────────────────────────

describe('Bug #91 — findUnique instead of findUniqueOrThrow', () => {
    it('emits findUnique (not findUniqueOrThrow) for plain model', () => {
        const model = makeModel();
        const annotations = parseAnnotations(model);
        const { content: code } = emitTool(model, annotations);

        expect(code).not.toContain('findUniqueOrThrow');
        expect(code).toContain('findUnique');
    });

    it('emits NOT_FOUND error response when result is null', () => {
        const model = makeModel();
        const annotations = parseAnnotations(model);
        const { content: code } = emitTool(model, annotations);

        expect(code).toContain('if (!result)');
        expect(code).toContain('isError: true');
        expect(code).toContain('not found');
    });

    it('emits findUnique for tenant-isolated model', () => {
        const model = makeTenantModel();
        const annotations = parseAnnotations(model);
        const { content: code } = emitTool(model, annotations);

        expect(code).not.toContain('findUniqueOrThrow');
        expect(code).toContain('findUnique');
        expect(code).toContain('if (!result)');
        expect(code).toContain('isError: true');
    });

    it('stores result in const before returning', () => {
        const model = makeModel();
        const annotations = parseAnnotations(model);
        const { content: code } = emitTool(model, annotations);

        expect(code).toContain('const result = await ctx.prisma');
        expect(code).toContain('return result');
    });
});
