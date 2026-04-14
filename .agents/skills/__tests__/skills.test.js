import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import yaml from "js-yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, "..");

const SKILL_NAMES = [
  "convex-create-component",
  "convex-migration-helper",
  "convex-performance-audit",
  "convex-quickstart",
  "convex-setup-auth",
];

const EXPECTED_CONFIGS = {
  "convex-create-component": {
    display_name: "Convex Create Component",
    brand_color: "#14B8A6",
  },
  "convex-migration-helper": {
    display_name: "Convex Migration Helper",
    brand_color: "#8B5CF6",
  },
  "convex-performance-audit": {
    display_name: "Convex Performance Audit",
    brand_color: "#EF4444",
  },
  "convex-quickstart": {
    display_name: "Convex Quickstart",
    brand_color: "#F97316",
  },
  "convex-setup-auth": {
    display_name: "Convex Setup Auth",
    brand_color: "#2563EB",
  },
};

const EXPECTED_REFERENCES = {
  "convex-create-component": [
    "advanced-patterns.md",
    "hybrid-components.md",
    "local-components.md",
    "packaged-components.md",
  ],
  "convex-migration-helper": [
    "migration-patterns.md",
    "migrations-component.md",
  ],
  "convex-performance-audit": [
    "function-budget.md",
    "hot-path-rules.md",
    "occ-conflicts.md",
    "subscription-cost.md",
  ],
  "convex-quickstart": [],
  "convex-setup-auth": [],
};

function readSkillFile(skillName, ...pathParts) {
  return readFileSync(join(SKILLS_DIR, skillName, ...pathParts), "utf8");
}

function skillFileExists(skillName, ...pathParts) {
  return existsSync(join(SKILLS_DIR, skillName, ...pathParts));
}

function parseSkillFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  return yaml.load(match[1]);
}

// ─── openai.yaml tests ───────────────────────────────────────────────────────

describe("openai.yaml structure", () => {
  for (const skillName of SKILL_NAMES) {
    describe(skillName, () => {
      let config;

      it("file exists", () => {
        expect(skillFileExists(skillName, "agents", "openai.yaml")).toBe(true);
      });

      it("parses as valid YAML", () => {
        const raw = readSkillFile(skillName, "agents", "openai.yaml");
        expect(() => { config = yaml.load(raw); }).not.toThrow();
      });

      it("has interface section", () => {
        const raw = readSkillFile(skillName, "agents", "openai.yaml");
        config = yaml.load(raw);
        expect(config).toHaveProperty("interface");
        expect(typeof config.interface).toBe("object");
      });

      it("has non-empty display_name", () => {
        const raw = readSkillFile(skillName, "agents", "openai.yaml");
        config = yaml.load(raw);
        expect(typeof config.interface.display_name).toBe("string");
        expect(config.interface.display_name.trim().length).toBeGreaterThan(0);
      });

      it("has correct display_name", () => {
        const raw = readSkillFile(skillName, "agents", "openai.yaml");
        config = yaml.load(raw);
        expect(config.interface.display_name).toBe(
          EXPECTED_CONFIGS[skillName].display_name
        );
      });

      it("has non-empty short_description", () => {
        const raw = readSkillFile(skillName, "agents", "openai.yaml");
        config = yaml.load(raw);
        expect(typeof config.interface.short_description).toBe("string");
        expect(config.interface.short_description.trim().length).toBeGreaterThan(0);
      });

      it("short_description is under 100 characters", () => {
        const raw = readSkillFile(skillName, "agents", "openai.yaml");
        config = yaml.load(raw);
        expect(config.interface.short_description.length).toBeLessThanOrEqual(100);
      });

      it("icon_small references ./assets/icon.svg", () => {
        const raw = readSkillFile(skillName, "agents", "openai.yaml");
        config = yaml.load(raw);
        expect(config.interface.icon_small).toBe("./assets/icon.svg");
      });

      it("icon_large references ./assets/icon.svg", () => {
        const raw = readSkillFile(skillName, "agents", "openai.yaml");
        config = yaml.load(raw);
        expect(config.interface.icon_large).toBe("./assets/icon.svg");
      });

      it("icon_small and icon_large point to the same file", () => {
        const raw = readSkillFile(skillName, "agents", "openai.yaml");
        config = yaml.load(raw);
        expect(config.interface.icon_small).toBe(config.interface.icon_large);
      });

      it("brand_color is a valid hex color string", () => {
        const raw = readSkillFile(skillName, "agents", "openai.yaml");
        config = yaml.load(raw);
        expect(config.interface.brand_color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });

      it("has correct brand_color", () => {
        const raw = readSkillFile(skillName, "agents", "openai.yaml");
        config = yaml.load(raw);
        expect(config.interface.brand_color).toBe(
          EXPECTED_CONFIGS[skillName].brand_color
        );
      });

      it("has non-empty default_prompt", () => {
        const raw = readSkillFile(skillName, "agents", "openai.yaml");
        config = yaml.load(raw);
        expect(typeof config.interface.default_prompt).toBe("string");
        expect(config.interface.default_prompt.trim().length).toBeGreaterThan(0);
      });

      it("has policy section with allow_implicit_invocation", () => {
        const raw = readSkillFile(skillName, "agents", "openai.yaml");
        config = yaml.load(raw);
        expect(config).toHaveProperty("policy");
        expect(config.policy).toHaveProperty("allow_implicit_invocation");
      });

      it("allow_implicit_invocation is a boolean", () => {
        const raw = readSkillFile(skillName, "agents", "openai.yaml");
        config = yaml.load(raw);
        expect(typeof config.policy.allow_implicit_invocation).toBe("boolean");
      });

      it("allow_implicit_invocation is true", () => {
        const raw = readSkillFile(skillName, "agents", "openai.yaml");
        config = yaml.load(raw);
        expect(config.policy.allow_implicit_invocation).toBe(true);
      });
    });
  }
});

describe("openai.yaml uniqueness", () => {
  it("all skills have unique display_names", () => {
    const displayNames = SKILL_NAMES.map((name) => {
      const raw = readSkillFile(name, "agents", "openai.yaml");
      const config = yaml.load(raw);
      return config.interface.display_name;
    });
    const unique = new Set(displayNames);
    expect(unique.size).toBe(SKILL_NAMES.length);
  });

  it("all skills have unique brand_colors", () => {
    const colors = SKILL_NAMES.map((name) => {
      const raw = readSkillFile(name, "agents", "openai.yaml");
      const config = yaml.load(raw);
      return config.interface.brand_color;
    });
    const unique = new Set(colors);
    expect(unique.size).toBe(SKILL_NAMES.length);
  });

  it("all skills have unique short_descriptions", () => {
    const descriptions = SKILL_NAMES.map((name) => {
      const raw = readSkillFile(name, "agents", "openai.yaml");
      const config = yaml.load(raw);
      return config.interface.short_description;
    });
    const unique = new Set(descriptions);
    expect(unique.size).toBe(SKILL_NAMES.length);
  });
});

// ─── SKILL.md frontmatter tests ──────────────────────────────────────────────

describe("SKILL.md frontmatter", () => {
  for (const skillName of SKILL_NAMES) {
    describe(skillName, () => {
      it("SKILL.md file exists", () => {
        expect(skillFileExists(skillName, "SKILL.md")).toBe(true);
      });

      it("starts with YAML frontmatter delimiter", () => {
        const content = readSkillFile(skillName, "SKILL.md");
        expect(content.startsWith("---")).toBe(true);
      });

      it("has closing frontmatter delimiter", () => {
        const content = readSkillFile(skillName, "SKILL.md");
        const lines = content.split("\n");
        const closingDelimiterIndex = lines.slice(1).findIndex(
          (l) => l.trim() === "---"
        );
        expect(closingDelimiterIndex).toBeGreaterThan(-1);
      });

      it("frontmatter parses as valid YAML", () => {
        const content = readSkillFile(skillName, "SKILL.md");
        expect(() => parseSkillFrontmatter(content)).not.toThrow();
        expect(parseSkillFrontmatter(content)).not.toBeNull();
      });

      it("frontmatter has name field", () => {
        const content = readSkillFile(skillName, "SKILL.md");
        const fm = parseSkillFrontmatter(content);
        expect(fm).toHaveProperty("name");
        expect(typeof fm.name).toBe("string");
        expect(fm.name.trim().length).toBeGreaterThan(0);
      });

      it("frontmatter name matches directory name", () => {
        const content = readSkillFile(skillName, "SKILL.md");
        const fm = parseSkillFrontmatter(content);
        expect(fm.name).toBe(skillName);
      });

      it("frontmatter has description field", () => {
        const content = readSkillFile(skillName, "SKILL.md");
        const fm = parseSkillFrontmatter(content);
        expect(fm).toHaveProperty("description");
        expect(typeof fm.description).toBe("string");
        expect(fm.description.trim().length).toBeGreaterThan(0);
      });

      it("description is non-trivially long (at least 50 chars)", () => {
        const content = readSkillFile(skillName, "SKILL.md");
        const fm = parseSkillFrontmatter(content);
        expect(fm.description.length).toBeGreaterThan(50);
      });

      it("has 'When to Use' section", () => {
        const content = readSkillFile(skillName, "SKILL.md");
        expect(content).toMatch(/## When to Use/);
      });

      it("has 'When Not to Use' section", () => {
        const content = readSkillFile(skillName, "SKILL.md");
        expect(content).toMatch(/## When Not to Use/);
      });

      it("has a Checklist section (## Checklist or ## Migration Checklist)", () => {
        const content = readSkillFile(skillName, "SKILL.md");
        expect(content).toMatch(/## (?:Migration )?Checklist/);
      });

      it("Checklist contains at least one unchecked item", () => {
        const content = readSkillFile(skillName, "SKILL.md");
        expect(content).toMatch(/- \[ \]/);
      });
    });
  }
});

// ─── SKILL.md / openai.yaml consistency ──────────────────────────────────────

describe("SKILL.md and openai.yaml consistency", () => {
  it("frontmatter name in SKILL.md matches directory name for all skills", () => {
    for (const skillName of SKILL_NAMES) {
      const content = readSkillFile(skillName, "SKILL.md");
      const fm = parseSkillFrontmatter(content);
      expect(fm.name).toBe(skillName);
    }
  });

  it("all 5 skills are present and accounted for", () => {
    expect(SKILL_NAMES).toHaveLength(5);
    for (const skillName of SKILL_NAMES) {
      expect(skillFileExists(skillName)).toBe(true);
    }
  });

  it("SKILL.md description contains skill name reference or relevant keywords", () => {
    for (const skillName of SKILL_NAMES) {
      const content = readSkillFile(skillName, "SKILL.md");
      const fm = parseSkillFrontmatter(content);
      // description should mention 'Convex' (all are Convex skills)
      expect(fm.description.toLowerCase()).toContain("convex");
    }
  });
});

// ─── SVG icon tests ───────────────────────────────────────────────────────────

describe("assets/icon.svg", () => {
  for (const skillName of SKILL_NAMES) {
    describe(skillName, () => {
      it("icon.svg file exists", () => {
        expect(skillFileExists(skillName, "assets", "icon.svg")).toBe(true);
      });

      it("is non-empty", () => {
        const content = readSkillFile(skillName, "assets", "icon.svg");
        expect(content.trim().length).toBeGreaterThan(0);
      });

      it("has SVG root element", () => {
        const content = readSkillFile(skillName, "assets", "icon.svg");
        expect(content).toMatch(/<svg/);
        expect(content).toMatch(/<\/svg>/);
      });

      it("has xmlns attribute pointing to W3C SVG namespace", () => {
        const content = readSkillFile(skillName, "assets", "icon.svg");
        expect(content).toContain('xmlns="http://www.w3.org/2000/svg"');
      });

      it("has viewBox set to '0 0 24 24'", () => {
        const content = readSkillFile(skillName, "assets", "icon.svg");
        expect(content).toContain('viewBox="0 0 24 24"');
      });

      it("uses standard Heroicons stroke style (stroke-width 1.5)", () => {
        const content = readSkillFile(skillName, "assets", "icon.svg");
        expect(content).toContain('stroke-width="1.5"');
      });

      it("has at least one path element", () => {
        const content = readSkillFile(skillName, "assets", "icon.svg");
        expect(content).toMatch(/<path/);
      });

      it("has aria-hidden attribute for accessibility", () => {
        const content = readSkillFile(skillName, "assets", "icon.svg");
        expect(content).toContain('aria-hidden="true"');
      });

      it("has fill='none' (outline icon style)", () => {
        const content = readSkillFile(skillName, "assets", "icon.svg");
        expect(content).toContain('fill="none"');
      });

      it("uses currentColor for stroke", () => {
        const content = readSkillFile(skillName, "assets", "icon.svg");
        expect(content).toContain('stroke="currentColor"');
      });
    });
  }

  it("all skill icons have different path data (unique icons)", () => {
    const pathData = SKILL_NAMES.map((skillName) => {
      const content = readSkillFile(skillName, "assets", "icon.svg");
      const match = content.match(/d="([^"]+)"/);
      return match ? match[1] : null;
    });
    const nonNullPaths = pathData.filter(Boolean);
    const unique = new Set(nonNullPaths);
    expect(unique.size).toBe(nonNullPaths.length);
  });
});

// ─── references/ directory tests ─────────────────────────────────────────────

describe("references/ directory", () => {
  const skillsWithReferences = Object.entries(EXPECTED_REFERENCES).filter(
    ([, refs]) => refs.length > 0
  );

  for (const [skillName, refs] of skillsWithReferences) {
    describe(skillName, () => {
      it("references/ directory exists", () => {
        expect(skillFileExists(skillName, "references")).toBe(true);
      });

      for (const refFile of refs) {
        it(`references/${refFile} exists`, () => {
          expect(skillFileExists(skillName, "references", refFile)).toBe(true);
        });

        it(`references/${refFile} is non-empty`, () => {
          const content = readSkillFile(skillName, "references", refFile);
          expect(content.trim().length).toBeGreaterThan(0);
        });

        it(`references/${refFile} starts with a markdown heading`, () => {
          const content = readSkillFile(skillName, "references", refFile);
          expect(content.trimStart()).toMatch(/^#+ /);
        });

        it(`references/${refFile} contains at least one code snippet or inline code`, () => {
          const content = readSkillFile(skillName, "references", refFile);
          // Guidance-only files (hybrid-components.md) legitimately have no code.
          // Accept fenced blocks (```) or inline code (`...`) or a checklist marker.
          const hasFencedBlock = content.includes("```");
          const hasInlineCode = /`[^`]+`/.test(content);
          const hasChecklist = content.includes("- [ ]");
          expect(hasFencedBlock || hasInlineCode || hasChecklist).toBe(true);
        });
      }
    });
  }

  describe("convex-create-component references", () => {
    it("local-components.md mentions defineComponent", () => {
      const content = readSkillFile(
        "convex-create-component",
        "references",
        "local-components.md"
      );
      expect(content).toContain("defineComponent");
    });

    it("local-components.md mentions app.use", () => {
      const content = readSkillFile(
        "convex-create-component",
        "references",
        "local-components.md"
      );
      expect(content).toContain("app.use");
    });

    it("packaged-components.md mentions npm or package", () => {
      const content = readSkillFile(
        "convex-create-component",
        "references",
        "packaged-components.md"
      );
      expect(content.toLowerCase()).toMatch(/npm|package/);
    });

    it("hybrid-components.md has Checklist section", () => {
      const content = readSkillFile(
        "convex-create-component",
        "references",
        "hybrid-components.md"
      );
      expect(content).toMatch(/## Checklist/);
    });

    it("advanced-patterns.md mentions function handles", () => {
      const content = readSkillFile(
        "convex-create-component",
        "references",
        "advanced-patterns.md"
      );
      expect(content.toLowerCase()).toContain("function handle");
    });
  });

  describe("convex-migration-helper references", () => {
    it("migrations-component.md mentions @convex-dev/migrations", () => {
      const content = readSkillFile(
        "convex-migration-helper",
        "references",
        "migrations-component.md"
      );
      expect(content).toContain("@convex-dev/migrations");
    });

    it("migrations-component.md has Installation section", () => {
      const content = readSkillFile(
        "convex-migration-helper",
        "references",
        "migrations-component.md"
      );
      expect(content).toMatch(/## Installation/);
    });

    it("migration-patterns.md covers required field pattern", () => {
      const content = readSkillFile(
        "convex-migration-helper",
        "references",
        "migration-patterns.md"
      );
      expect(content.toLowerCase()).toContain("required field");
    });

    it("migration-patterns.md covers zero-downtime strategies", () => {
      const content = readSkillFile(
        "convex-migration-helper",
        "references",
        "migration-patterns.md"
      );
      expect(content.toLowerCase()).toContain("zero-downtime");
    });
  });

  describe("convex-performance-audit references", () => {
    it("hot-path-rules.md mentions indexes", () => {
      const content = readSkillFile(
        "convex-performance-audit",
        "references",
        "hot-path-rules.md"
      );
      expect(content.toLowerCase()).toContain("index");
    });

    it("occ-conflicts.md mentions optimistic concurrency", () => {
      const content = readSkillFile(
        "convex-performance-audit",
        "references",
        "occ-conflicts.md"
      );
      expect(content.toLowerCase()).toContain("optimistic concurrency");
    });

    it("subscription-cost.md mentions useQuery", () => {
      const content = readSkillFile(
        "convex-performance-audit",
        "references",
        "subscription-cost.md"
      );
      expect(content).toContain("useQuery");
    });

    it("function-budget.md mentions transaction limits", () => {
      const content = readSkillFile(
        "convex-performance-audit",
        "references",
        "function-budget.md"
      );
      expect(content.toLowerCase()).toContain("transaction");
    });

    it("function-budget.md includes a limits table", () => {
      const content = readSkillFile(
        "convex-performance-audit",
        "references",
        "function-budget.md"
      );
      // Markdown table rows have | characters
      const tableRows = content
        .split("\n")
        .filter((line) => line.trim().startsWith("|"));
      expect(tableRows.length).toBeGreaterThan(3);
    });
  });
});

// ─── SKILL.md content quality tests ──────────────────────────────────────────

describe("SKILL.md content quality", () => {
  describe("convex-create-component", () => {
    let content;
    beforeAll(() => {
      content = readSkillFile("convex-create-component", "SKILL.md");
    });

    it("mentions the component boundary rules", () => {
      expect(content).toContain("ctx.auth");
    });

    it("mentions defineComponent", () => {
      expect(content).toContain("defineComponent");
    });

    it("mentions app.use", () => {
      expect(content).toContain("app.use");
    });

    it("references local-components.md in reference table", () => {
      expect(content).toContain("local-components.md");
    });

    it("references packaged-components.md in reference table", () => {
      expect(content).toContain("packaged-components.md");
    });

    it("references hybrid-components.md in reference table", () => {
      expect(content).toContain("hybrid-components.md");
    });

    it("references advanced-patterns.md", () => {
      expect(content).toContain("advanced-patterns.md");
    });

    it("includes validation section", () => {
      expect(content).toMatch(/## Validation/);
    });

    it("includes component skeleton code example", () => {
      expect(content).toContain("defineComponent");
      expect(content).toContain("defineSchema");
    });

    it("Critical Rules section exists", () => {
      expect(content).toMatch(/## Critical Rules/);
    });

    it("warns about keeping auth in the app", () => {
      expect(content.toLowerCase()).toMatch(/authentication|auth.*app|app.*auth/);
    });

    it("warns about v.id across component boundary", () => {
      expect(content).toContain("v.string()");
    });
  });

  describe("convex-migration-helper", () => {
    let content;
    beforeAll(() => {
      content = readSkillFile("convex-migration-helper", "SKILL.md");
    });

    it("mentions widen-migrate-narrow workflow", () => {
      expect(content.toLowerCase()).toContain("widen");
      expect(content.toLowerCase()).toContain("narrow");
    });

    it("mentions @convex-dev/migrations", () => {
      expect(content).toContain("@convex-dev/migrations");
    });

    it("covers breaking changes workflow", () => {
      expect(content).toMatch(/Breaking Changes/i);
    });

    it("references migrations-component.md", () => {
      expect(content).toContain("migrations-component.md");
    });

    it("references migration-patterns.md", () => {
      expect(content).toContain("migration-patterns.md");
    });

    it("lists common pitfalls", () => {
      expect(content).toMatch(/## Common Pitfalls/);
    });

    it("warns about using collect on large tables", () => {
      expect(content.toLowerCase()).toContain(".collect()");
    });
  });

  describe("convex-performance-audit", () => {
    let content;
    beforeAll(() => {
      content = readSkillFile("convex-performance-audit", "SKILL.md");
    });

    it("references hot-path-rules.md", () => {
      expect(content).toContain("hot-path-rules.md");
    });

    it("references occ-conflicts.md", () => {
      expect(content).toContain("occ-conflicts.md");
    });

    it("references subscription-cost.md", () => {
      expect(content).toContain("subscription-cost.md");
    });

    it("references function-budget.md", () => {
      expect(content).toContain("function-budget.md");
    });

    it("mentions npx convex insights", () => {
      expect(content).toContain("npx convex insights");
    });

    it("has signal routing table", () => {
      expect(content).toMatch(/## Signal Routing/);
    });

    it("defines guardrails", () => {
      expect(content).toMatch(/## Guardrails/);
    });
  });

  describe("convex-quickstart", () => {
    let content;
    beforeAll(() => {
      content = readSkillFile("convex-quickstart", "SKILL.md");
    });

    it("mentions npm create convex@latest", () => {
      expect(content).toContain("npm create convex@latest");
    });

    it("mentions npx convex dev", () => {
      expect(content).toContain("npx convex dev");
    });

    it("has framework-specific setup sections", () => {
      expect(content).toMatch(/React.*Vite|Next\.js/i);
    });

    it("mentions ConvexProvider", () => {
      expect(content).toContain("ConvexProvider");
    });

    it("mentions ConvexReactClient", () => {
      expect(content).toContain("ConvexReactClient");
    });

    it("covers environment variable configuration", () => {
      expect(content).toContain("VITE_CONVEX_URL");
      expect(content).toContain("NEXT_PUBLIC_CONVEX_URL");
    });

    it("covers production deployment", () => {
      expect(content).toContain("npx convex deploy");
    });

    it("has agent mode section for headless environments", () => {
      expect(content).toContain("CONVEX_AGENT_MODE");
    });

    it("lists available templates including react-vite-shadcn", () => {
      expect(content).toContain("react-vite-shadcn");
    });
  });

  describe("convex-setup-auth", () => {
    let content;
    beforeAll(() => {
      content = readSkillFile("convex-setup-auth", "SKILL.md");
    });

    it("mentions ctx.auth.getUserIdentity", () => {
      expect(content).toContain("ctx.auth.getUserIdentity");
    });

    it("mentions supported auth providers", () => {
      expect(content.toLowerCase()).toMatch(/clerk|convex auth|auth0|workos/i);
    });

    it("instructs to choose provider before writing code", () => {
      expect(content.toLowerCase()).toContain("provider");
    });
  });
});

// ─── Edge / regression cases ─────────────────────────────────────────────────

describe("edge cases and regressions", () => {
  it("no SKILL.md has empty description field", () => {
    for (const skillName of SKILL_NAMES) {
      const content = readSkillFile(skillName, "SKILL.md");
      const fm = parseSkillFrontmatter(content);
      expect(fm.description.trim()).not.toBe("");
    }
  });

  it("no openai.yaml has empty default_prompt", () => {
    for (const skillName of SKILL_NAMES) {
      const raw = readSkillFile(skillName, "agents", "openai.yaml");
      const config = yaml.load(raw);
      expect(config.interface.default_prompt.trim()).not.toBe("");
    }
  });

  it("all brand colors are uppercase hex (consistent formatting)", () => {
    for (const skillName of SKILL_NAMES) {
      const raw = readSkillFile(skillName, "agents", "openai.yaml");
      const config = yaml.load(raw);
      expect(config.interface.brand_color).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it("no SVG icon has fill set to a solid color (should be 'none')", () => {
    for (const skillName of SKILL_NAMES) {
      const content = readSkillFile(skillName, "assets", "icon.svg");
      // The svg root fill should be 'none', not a color value
      const fillAttr = content.match(/fill="([^"]+)"/);
      if (fillAttr) {
        // The root fill="none" is expected
        expect(fillAttr[1]).toBe("none");
      }
    }
  });

  it("SKILL.md frontmatter name uses kebab-case", () => {
    for (const skillName of SKILL_NAMES) {
      const content = readSkillFile(skillName, "SKILL.md");
      const fm = parseSkillFrontmatter(content);
      // Kebab-case: lowercase letters and hyphens only
      expect(fm.name).toMatch(/^[a-z][a-z0-9-]+[a-z0-9]$/);
    }
  });

  it("all skill directories have exactly the required files", () => {
    for (const skillName of SKILL_NAMES) {
      expect(skillFileExists(skillName, "SKILL.md")).toBe(true);
      expect(skillFileExists(skillName, "agents", "openai.yaml")).toBe(true);
      expect(skillFileExists(skillName, "assets", "icon.svg")).toBe(true);
    }
  });

  it("openai.yaml does not contain unexpected top-level keys", () => {
    const ALLOWED_KEYS = new Set(["interface", "policy"]);
    for (const skillName of SKILL_NAMES) {
      const raw = readSkillFile(skillName, "agents", "openai.yaml");
      const config = yaml.load(raw);
      for (const key of Object.keys(config)) {
        expect(ALLOWED_KEYS.has(key)).toBe(true);
      }
    }
  });

  it("interface section does not contain unexpected keys", () => {
    const ALLOWED_KEYS = new Set([
      "display_name",
      "short_description",
      "icon_small",
      "icon_large",
      "brand_color",
      "default_prompt",
    ]);
    for (const skillName of SKILL_NAMES) {
      const raw = readSkillFile(skillName, "agents", "openai.yaml");
      const config = yaml.load(raw);
      for (const key of Object.keys(config.interface)) {
        expect(ALLOWED_KEYS.has(key)).toBe(true);
      }
    }
  });

  it("SKILL.md for each skill mentions use with 'Use this skill when'", () => {
    for (const skillName of SKILL_NAMES) {
      const content = readSkillFile(skillName, "SKILL.md");
      const fm = parseSkillFrontmatter(content);
      expect(fm.description.toLowerCase()).toContain("use this skill when");
    }
  });
});