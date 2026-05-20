/**
 * Tests for autoDiscoverSkills — directory scanning.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SkillRegistry } from '../src/registry/SkillRegistry.js';
import { autoDiscoverSkills } from '../src/discovery/autoDiscoverSkills.js';

let testDir: string;

beforeEach(async () => {
    testDir = join(tmpdir(), `mcpfusion-skills-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
});

afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
});

async function writeSkill(name: string, content: string, files?: Record<string, string>): Promise<void> {
    const skillDir = join(testDir, name);
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(join(skillDir, 'SKILL.md'), content, 'utf-8');

    if (files) {
        for (const [path, body] of Object.entries(files)) {
            const fullPath = join(skillDir, path);
            await fs.mkdir(join(fullPath, '..'), { recursive: true });
            await fs.writeFile(fullPath, body, 'utf-8');
        }
    }
}

const VALID_SKILL = `---
name: test-skill
description: A test skill.
---
# Instructions
Step 1: Do something.`;

describe('autoDiscoverSkills', () => {
    it('discovers a single skill directory', async () => {
        await writeSkill('test-skill', VALID_SKILL);

        const registry = new SkillRegistry();
        const ids = await autoDiscoverSkills(registry, testDir);

        expect(ids).toEqual(['test-skill']);
        expect(registry.size).toBe(1);
    });

    it('discovers multiple skill directories', async () => {
        await writeSkill('skill-a', `---
name: skill-a
description: Skill A.
---
Instructions A.`);

        await writeSkill('skill-b', `---
name: skill-b
description: Skill B.
---
Instructions B.`);

        const registry = new SkillRegistry();
        const ids = await autoDiscoverSkills(registry, testDir);

        expect(ids.sort()).toEqual(['skill-a', 'skill-b']);
        expect(registry.size).toBe(2);
    });

    it('collects auxiliary files', async () => {
        await writeSkill('with-files', VALID_SKILL.replace('test-skill', 'with-files'), {
            'scripts/run.sh': '#!/bin/bash\necho hello',
            'references/guide.md': '# Guide',
        });

        const registry = new SkillRegistry();
        await autoDiscoverSkills(registry, testDir);

        const skill = registry.load('with-files');
        expect(skill).not.toBeNull();
        expect(skill!.files.sort()).toEqual(['references/guide.md', 'scripts/run.sh']);
    });

    it('skips invalid skills in non-strict mode', async () => {
        await writeSkill('valid', VALID_SKILL.replace('test-skill', 'valid'));

        // Invalid SKILL.md (no frontmatter)
        const invalidDir = join(testDir, 'invalid');
        await fs.mkdir(invalidDir, { recursive: true });
        await fs.writeFile(join(invalidDir, 'SKILL.md'), 'No frontmatter here', 'utf-8');

        const registry = new SkillRegistry();
        const ids = await autoDiscoverSkills(registry, testDir);

        expect(ids).toEqual(['valid']);
    });

    it('throws on invalid skills in strict mode', async () => {
        const invalidDir = join(testDir, 'invalid');
        await fs.mkdir(invalidDir, { recursive: true });
        await fs.writeFile(join(invalidDir, 'SKILL.md'), 'No frontmatter', 'utf-8');

        const registry = new SkillRegistry();
        await expect(autoDiscoverSkills(registry, testDir, { strict: true }))
            .rejects.toThrow();
    });

    it('returns empty array for directory with no skills', async () => {
        const registry = new SkillRegistry();
        const ids = await autoDiscoverSkills(registry, testDir);
        expect(ids).toEqual([]);
    });
});
