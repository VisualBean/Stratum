import { parse, stringify } from "yaml";

export type DashboardConfig = {
  version: 1;
  title: string;
  search: SearchConfig;
  rows: DashboardRow[];
};

export type SearchConfig = {
  provider: string;
  url: string;
  placeholder?: string;
};

export type DashboardRow = {
  id: string;
  title?: string;
  columns: DashboardColumn[];
};

export type DashboardColumn = {
  id: string;
  title: string;
  sections: DashboardSection[];
};

export type DashboardSection = {
  id: string;
  title: string;
  columns?: number;
  links: DashboardLink[];
};

export type DashboardLink = {
  id: string;
  title: string;
  url: string;
  icon?: string;
  showUrl?: boolean;
};

export const SEARCH_PRESETS: SearchConfig[] = [
  {
    provider: "DuckDuckGo",
    url: "https://duckduckgo.com/?q={query}",
    placeholder: "Search DuckDuckGo or enter a URL",
  },
  {
    provider: "Google",
    url: "https://www.google.com/search?q={query}",
    placeholder: "Search Google or enter a URL",
  },
  {
    provider: "Kagi",
    url: "https://kagi.com/search?q={query}",
    placeholder: "Search Kagi or enter a URL",
  },
  {
    provider: "Brave",
    url: "https://search.brave.com/search?q={query}",
    placeholder: "Search Brave or enter a URL",
  },
  {
    provider: "Bing",
    url: "https://www.bing.com/search?q={query}",
    placeholder: "Search Bing or enter a URL",
  },
  {
    provider: "Startpage",
    url: "https://www.startpage.com/sp/search?query={query}",
    placeholder: "Search Startpage or enter a URL",
  },
  {
    provider: "Ecosia",
    url: "https://www.ecosia.org/search?q={query}",
    placeholder: "Search Ecosia or enter a URL",
  },
  {
    provider: "Qwant",
    url: "https://www.qwant.com/?q={query}",
    placeholder: "Search Qwant or enter a URL",
  },
  {
    provider: "Wikipedia",
    url: "https://en.wikipedia.org/w/index.php?search={query}",
    placeholder: "Search Wikipedia or enter a URL",
  },
  {
    provider: "YouTube",
    url: "https://www.youtube.com/results?search_query={query}",
    placeholder: "Search YouTube or enter a URL",
  },
  {
    provider: "GitHub",
    url: "https://github.com/search?q={query}",
    placeholder: "Search GitHub or enter a URL",
  },
  {
    provider: "Stack Overflow",
    url: "https://stackoverflow.com/search?q={query}",
    placeholder: "Search Stack Overflow or enter a URL",
  },
  {
    provider: "MDN",
    url: "https://developer.mozilla.org/en-US/search?q={query}",
    placeholder: "Search MDN or enter a URL",
  },
  {
    provider: "npm",
    url: "https://www.npmjs.com/search?q={query}",
    placeholder: "Search npm or enter a URL",
  },
  {
    provider: "Docker Hub",
    url: "https://hub.docker.com/search?q={query}",
    placeholder: "Search Docker Hub or enter a URL",
  },
  {
    provider: "Reddit",
    url: "https://www.reddit.com/search/?q={query}",
    placeholder: "Search Reddit or enter a URL",
  },
];

export const DEFAULT_CONFIG: DashboardConfig = {
  version: 1,
  title: "Startpage",
  search: SEARCH_PRESETS[0],
  rows: [
    {
      id: createId(),
      columns: [
        {
          id: createId(),
          title: "Daily",
          sections: [
            {
              id: createId(),
              title: "Start Here",
              links: [
                {
                  id: createId(),
                  title: "GitHub",
                  url: "https://github.com",
                  icon: "github",
                },
                {
                  id: createId(),
                  title: "Dashboard Icons",
                  url: "https://dashboardicons.com/icons",
                  icon: "homarr",
                },
              ],
            },
          ],
        },
        {
          id: createId(),
          title: "Home Lab",
          sections: [
            {
              id: createId(),
              title: "Examples",
              links: [
                {
                  id: createId(),
                  title: "Jellyfin",
                  url: "https://jellyfin.local",
                  icon: "jellyfin",
                },
                {
                  id: createId(),
                  title: "Proxmox",
                  url: "https://proxmox.local",
                  icon: "proxmox",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: createId(),
      columns: [
        {
          id: createId(),
          title: "Second Row",
          sections: [
            {
              id: createId(),
              title: "More Links",
              links: [
                {
                  id: createId(),
                  title: "Example",
                  url: "https://example.com",
                  icon: "example",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

export function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2, 10);
}

export function makeRow(): DashboardRow {
  return {
    id: createId(),
    columns: [makeColumn()],
  };
}

export function makeColumn(): DashboardColumn {
  return {
    id: createId(),
    title: "New Column",
    sections: [makeSection()],
  };
}

export function makeSection(): DashboardSection {
  return {
    id: createId(),
    title: "New Section",
    columns: 2,
    links: [makeLink()],
  };
}

export function makeLink(): DashboardLink {
  return {
    id: createId(),
    title: "New Link",
    url: "https://example.com",
    icon: "example",
    showUrl: true,
  };
}

export function exportConfigToYaml(config: DashboardConfig) {
  return stringify(toPortableConfig(config), {
    indent: 2,
    lineWidth: 0,
  });
}

export function importConfigFromYaml(input: string) {
  const parsed = parse(input);
  return normalizeConfig(parsed);
}

export function normalizeConfig(value: unknown): DashboardConfig {
  if (!isRecord(value)) {
    throw new Error("Config must be a YAML or JSON object.");
  }

  const rows = normalizeRows(value);
  if (rows.length === 0) {
    throw new Error("Config must include at least one row.");
  }

  return {
    version: 1,
    title: readString(value.title, "Startpage"),
    search: normalizeSearch(value.search),
    rows,
  };
}

export function summarizeConfig(config: DashboardConfig) {
  const columnCount = config.rows.reduce((sum, row) => sum + row.columns.length, 0);
  const sectionCount = config.rows.reduce(
    (sum, row) => sum + row.columns.reduce((columnSum, column) => columnSum + column.sections.length, 0),
    0,
  );
  const linkCount = config.rows.reduce(
    (sum, row) =>
      sum +
      row.columns.reduce(
        (columnSum, column) =>
          columnSum + column.sections.reduce((sectionSum, section) => sectionSum + section.links.length, 0),
        0,
      ),
    0,
  );

  return `${config.rows.length} rows, ${columnCount} columns, ${sectionCount} sections, ${linkCount} links`;
}

function normalizeRows(value: Record<string, unknown>) {
  if (Array.isArray(value.rows)) {
    return value.rows.map(normalizeRow);
  }

  if (Array.isArray(value.columns)) {
    return [
      {
        id: createId(),
        columns: value.columns.map(normalizeColumn),
      },
    ];
  }

  throw new Error("Config must include a rows list.");
}

function normalizeSearch(value: unknown): SearchConfig {
  if (typeof value === "string") {
    return presetFor(value) ?? { ...SEARCH_PRESETS[0], provider: value };
  }

  if (!isRecord(value)) {
    return SEARCH_PRESETS[0];
  }

  const provider = readString(value.provider, SEARCH_PRESETS[0].provider);
  const preset = presetFor(provider);
  const url = readString(value.url, preset?.url ?? SEARCH_PRESETS[0].url);

  if (!url.includes("{query}")) {
    throw new Error("Search URL must include {query}.");
  }

  return {
    provider,
    url,
    placeholder: readString(value.placeholder, preset?.placeholder ?? `Search ${provider} or enter a URL`),
  };
}

function normalizeRow(value: unknown, index: number): DashboardRow {
  if (!isRecord(value)) {
    throw new Error(`Row ${index + 1} must be an object.`);
  }

  const columnsValue = value.columns;
  if (!Array.isArray(columnsValue)) {
    throw new Error(`Row ${index + 1} must include a columns list.`);
  }

  const columns = columnsValue.map(normalizeColumn);
  if (columns.length === 0) {
    throw new Error(`Row ${index + 1} must include at least one column.`);
  }

  return {
    id: readString(value.id, createId()),
    title: readOptionalString(value.title),
    columns,
  };
}

function normalizeColumn(value: unknown, index: number): DashboardColumn {
  if (!isRecord(value)) {
    throw new Error(`Column ${index + 1} must be an object.`);
  }

  const sectionsValue = value.sections;
  if (!Array.isArray(sectionsValue)) {
    throw new Error(`Column ${index + 1} must include a sections list.`);
  }

  return {
    id: readString(value.id, createId()),
    title: readPossiblyEmptyString(value.title, `Column ${index + 1}`),
    sections: sectionsValue.map((section, sectionIndex) => normalizeSection(section, index, sectionIndex)),
  };
}

function normalizeSection(value: unknown, columnIndex: number, sectionIndex: number): DashboardSection {
  if (!isRecord(value)) {
    throw new Error(`Section ${sectionIndex + 1} in column ${columnIndex + 1} must be an object.`);
  }

  const linksValue = value.links;
  if (!Array.isArray(linksValue)) {
    throw new Error(`Section ${sectionIndex + 1} in column ${columnIndex + 1} must include a links list.`);
  }

  return {
    id: readString(value.id, createId()),
    title: readPossiblyEmptyString(value.title, `Section ${sectionIndex + 1}`),
    columns: readIntegerInRange(value.columns, 1, 6),
    links: linksValue.map((link, linkIndex) => normalizeLink(link, columnIndex, sectionIndex, linkIndex)),
  };
}

function normalizeLink(value: unknown, columnIndex: number, sectionIndex: number, linkIndex: number): DashboardLink {
  if (!isRecord(value)) {
    throw new Error(
      `Link ${linkIndex + 1} in section ${sectionIndex + 1}, column ${columnIndex + 1} must be an object.`,
    );
  }

  const title = readPossiblyEmptyString(value.title, "");
  const url = readString(value.url, "");

  if (!url) {
    throw new Error(`Link ${linkIndex + 1} is missing a URL.`);
  }

  return {
    id: readString(value.id, createId()),
    title,
    url,
    icon: readOptionalString(value.icon),
    showUrl: readBoolean(value.showUrl, true),
  };
}

function toPortableConfig(config: DashboardConfig) {
  return {
    version: 1,
    title: config.title,
    search: {
      provider: config.search.provider,
      url: config.search.url,
    },
    rows: config.rows.map((row) => ({
      ...(row.title ? { title: row.title } : {}),
      columns: row.columns.map((column) => ({
        title: column.title,
        sections: column.sections.map((section) => ({
          title: section.title,
          ...(section.columns ? { columns: section.columns } : {}),
          links: section.links.map((link) => ({
            title: link.title,
            url: link.url,
            ...(link.icon ? { icon: link.icon } : {}),
            ...(link.showUrl ? { showUrl: true } : {}),
          })),
        })),
      })),
    })),
  };
}

function presetFor(provider: string) {
  const normalized = provider.trim().toLowerCase();
  return SEARCH_PRESETS.find((preset) => preset.provider.toLowerCase() === normalized);
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function readPossiblyEmptyString(value: unknown, fallback: string) {
  return typeof value === "string" ? value.trim() : fallback;
}

function readOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function readIntegerInRange(value: unknown, min: number, max: number) {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return undefined;
  }

  return value >= min && value <= max ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
