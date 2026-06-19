import { DragEvent, FormEvent, Fragment, KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  DashboardColumn,
  DashboardConfig,
  DashboardLink,
  DashboardRow,
  DashboardSection,
  DEFAULT_CONFIG,
  SEARCH_PRESETS,
  exportConfigToYaml,
  importConfigFromYaml,
  makeColumn,
  makeLink,
  makeRow,
  makeSection,
  summarizeConfig,
} from "./config";
import { initialsFor, resolveIcon } from "./icons";
import { loadConfig, saveConfig } from "./storage";

type ModalMode = "import" | "export" | "docs" | null;
type DraggedColumn = {
  rowId: string;
  columnId: string;
};

type DraggedLink = {
  rowId: string;
  columnId: string;
  sectionId: string;
  linkId: string;
  title: string;
};

type DragGhost = {
  kind: "Column" | "Link";
  label: string;
  icon?: string;
  url?: string;
  x: number;
  y: number;
};

type CommandItem = {
  id: string;
  title: string;
  url: string;
  icon?: string;
  context: string;
  searchText: string;
};

type EditorSelection =
  | { type: "column"; rowId: string; columnId: string }
  | { type: "section"; rowId: string; columnId: string; sectionId: string }
  | { type: "link"; rowId: string; columnId: string; sectionId: string; linkId: string };

export default function App() {
  const [config, setConfig] = useState<DashboardConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [saveState, setSaveState] = useState("Saved");
  const [paletteQuery, setPaletteQuery] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    loadConfig().then((loadedConfig) => {
      if (!active) {
        return;
      }

      setConfig(loadedConfig);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  function commit(nextConfig: DashboardConfig) {
    setConfig(nextConfig);
    setSaveState("Saving...");

    saveConfig(nextConfig)
      .then(() => setSaveState("Saved"))
      .catch((error) => {
        console.error(error);
        setSaveState("Save failed");
      });
  }

  function replaceConfig(nextConfig: DashboardConfig) {
    commit(nextConfig);
    setModalMode(null);
    setEditing(false);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (modalMode || editing || paletteQuery !== null || isTypingTarget(event.target)) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteQuery("");
        return;
      }

      if (event.altKey || event.ctrlKey || event.metaKey || event.key.length !== 1 || !event.key.trim()) {
        return;
      }

      event.preventDefault();
      setPaletteQuery(event.key);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editing, modalMode, paletteQuery]);

  if (loading) {
    return <div className="loading-screen">Loading startpage...</div>;
  }

  return (
    <div className="app-shell">
      <header className="top-app-bar">
        <div className="brand-mark">
          <StratumLogo />
          <strong>{config.title}</strong>
        </div>

        <button type="button" className="top-command" onClick={() => setPaletteQuery("")}>
          <span className="command-glyph">/</span>
          <span>Search or run command...</span>
          <kbd>Ctrl</kbd>
          <kbd>K</kbd>
        </button>

        <div className="top-actions">
          <span className={`save-state ${saveState === "Save failed" ? "is-error" : ""}`}>{saveState}</span>
          <button type="button" className="icon-action" onClick={() => setModalMode("import")} title="Import config">
            Import
          </button>
          <button type="button" className="icon-action" onClick={() => setModalMode("export")} title="Export config">
            Export
          </button>
          <button type="button" className="outline-button" onClick={() => setEditing((value) => !value)}>
            {editing ? "Done" : "Customize"}
          </button>
        </div>
      </header>

      <main className="main-canvas">
        <div className="mobile-command-wrap">
          <button type="button" className="top-command mobile-command" onClick={() => setPaletteQuery("")}>
            <span className="command-glyph">/</span>
            <span>Search or run command...</span>
          </button>
        </div>

        <div className="content-stack">
          <section className="page-heading">
            <div>
              <h1>{config.title || "Dashboard"}</h1>
              <p>Quick access to your services, tools, and searches.</p>
            </div>
          </section>

          {editing ? <EditSettings config={config} onChange={commit} /> : null}

          <Dashboard config={config} editing={editing} onChange={commit} />
        </div>
      </main>

      {modalMode ? (
        modalMode === "docs" ? (
          <DocsModal onClose={() => setModalMode(null)} />
        ) : (
          <ConfigModal
            mode={modalMode}
            config={config}
            onClose={() => setModalMode(null)}
            onImport={replaceConfig}
          />
        )
      ) : null}

      <button type="button" className="help-fab" onClick={() => setModalMode("docs")} aria-label="Open help and documentation">
        ?
      </button>

      {paletteQuery !== null ? (
        <CommandPalette
          config={config}
          query={paletteQuery}
          onQueryChange={setPaletteQuery}
          onClose={() => setPaletteQuery(null)}
        />
      ) : null}
    </div>
  );
}

function StratumLogo() {
  return (
    <svg className="brand-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="stratum-logo-circle-clip">
          <circle cx="256" cy="256" r="220" />
        </clipPath>
      </defs>
      <circle cx="256" cy="256" r="220" fill="#131315" stroke="#a45a52" strokeWidth="8" />
      <g clipPath="url(#stratum-logo-circle-clip)">
        <circle cx="120" cy="150" r="1.5" fill="white" opacity="0.8" />
        <circle cx="180" cy="80" r="1" fill="white" opacity="0.6" />
        <circle cx="280" cy="120" r="1.2" fill="white" opacity="0.9" />
        <circle cx="350" cy="190" r="1" fill="white" opacity="0.5" />
        <circle cx="400" cy="100" r="1.5" fill="white" opacity="0.7" />
        <circle cx="220" cy="200" r="0.8" fill="white" opacity="0.4" />
        <circle cx="150" cy="220" r="1.2" fill="white" opacity="0.8" />
        <circle cx="320" cy="70" r="1" fill="white" opacity="0.6" />
        <circle cx="420" cy="230" r="0.9" fill="white" opacity="0.5" />
        <circle cx="80" cy="200" r="1.1" fill="white" opacity="0.7" />
        <path d="M0 300 Q128 270 256 300 T512 300 L512 512 L0 512 Z" fill="#a45a52" />
        <path d="M36 350 Q146 330 256 350 T476 350" stroke="#8b4513" strokeWidth="3" fill="none" opacity="0.15" />
        <path d="M36 390 Q146 370 256 390 T476 390" stroke="#8b4513" strokeWidth="3" fill="none" opacity="0.1" />
        <circle cx="256" cy="256" r="220" fill="none" stroke="white" strokeWidth="2" opacity="0.05" />
      </g>
    </svg>
  );
}

function SearchBox({ search }: Pick<DashboardConfig, "search">) {
  const [query, setQuery] = useState("");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const destination = destinationFor(query, search.url);

    if (destination) {
      window.location.href = destination;
    }
  }

  return (
    <form className="search-box" onSubmit={onSubmit}>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={search.placeholder || `Search ${search.provider} or enter a URL`}
        autoFocus
      />
      <button type="submit">Search</button>
    </form>
  );
}

function Dashboard({
  config,
  editing,
  onChange,
}: {
  config: DashboardConfig;
  editing: boolean;
  onChange: (config: DashboardConfig) => void;
}) {
  const [draggedColumn, setDraggedColumn] = useState<DraggedColumn | null>(null);
  const [draggedLink, setDraggedLink] = useState<DraggedLink | null>(null);
  const [activeLinkDropKey, setActiveLinkDropKey] = useState<string | null>(null);
  const [selection, setSelection] = useState<EditorSelection | null>(null);
  const [dragGhost, setDragGhost] = useState<DragGhost | null>(null);

  useEffect(() => {
    if (!dragGhost) {
      return;
    }

    function onWindowDragOver(event: globalThis.DragEvent) {
      setDragGhost((current) => (current ? { ...current, x: event.clientX, y: event.clientY } : current));
    }

    window.addEventListener("dragover", onWindowDragOver);
    return () => window.removeEventListener("dragover", onWindowDragOver);
  }, [dragGhost]);

  function updateConfig(updater: (config: DashboardConfig) => DashboardConfig) {
    onChange(updater(config));
  }

  function updateRow(rowId: string, updater: (row: DashboardRow) => DashboardRow) {
    updateConfig((current) => ({
      ...current,
      rows: current.rows.map((row) => (row.id === rowId ? updater(row) : row)),
    }));
  }

  function updateColumn(rowId: string, columnId: string, updater: (column: DashboardColumn) => DashboardColumn) {
    updateRow(rowId, (row) => ({
      ...row,
      columns: row.columns.map((column) => (column.id === columnId ? updater(column) : column)),
    }));
  }

  function updateSection(
    rowId: string,
    columnId: string,
    sectionId: string,
    updater: (section: DashboardSection) => DashboardSection,
  ) {
    updateColumn(rowId, columnId, (column) => ({
      ...column,
      sections: column.sections.map((section) => (section.id === sectionId ? updater(section) : section)),
    }));
  }

  function updateLink(rowId: string, columnId: string, sectionId: string, linkId: string, updater: (link: DashboardLink) => DashboardLink) {
    updateSection(rowId, columnId, sectionId, (section) => ({
      ...section,
      links: section.links.map((link) => (link.id === linkId ? updater(link) : link)),
    }));
  }

  function addRow(afterIndex?: number) {
    updateConfig((current) => {
      const nextRows = [...current.rows];
      nextRows.splice(typeof afterIndex === "number" ? afterIndex + 1 : nextRows.length, 0, makeRow());
      return { ...current, rows: nextRows };
    });
  }

  function moveRow(rowId: string, direction: -1 | 1) {
    updateConfig((current) => ({
      ...current,
      rows: moveItem(current.rows, current.rows.findIndex((row) => row.id === rowId), direction),
    }));
  }

  function deleteRow(rowId: string) {
    updateConfig((current) => ({
      ...current,
      rows: current.rows.length === 1 ? current.rows : current.rows.filter((row) => row.id !== rowId),
    }));
    setSelection(null);
  }

  function addColumn(rowId: string) {
    updateRow(rowId, (row) => ({ ...row, columns: [...row.columns, makeColumn()] }));
  }

  function moveColumn(rowId: string, columnId: string, direction: -1 | 1) {
    updateRow(rowId, (row) => ({
      ...row,
      columns: moveItem(row.columns, row.columns.findIndex((column) => column.id === columnId), direction),
    }));
  }

  function deleteColumn(rowId: string, columnId: string) {
    updateRow(rowId, (row) => ({
      ...row,
      columns: row.columns.length === 1 ? row.columns : row.columns.filter((column) => column.id !== columnId),
    }));
    setSelection(null);
  }

  function dropColumn(rowId: string, targetColumnId: string) {
    if (!draggedColumn || (draggedColumn.rowId === rowId && draggedColumn.columnId === targetColumnId)) {
      return;
    }

    updateConfig((current) => moveColumnBetweenRows(current, draggedColumn, rowId, targetColumnId));
    setDraggedColumn(null);
    setDragGhost(null);
  }

  function dropColumnAtRowEnd(rowId: string) {
    if (!draggedColumn) {
      return;
    }

    updateConfig((current) => moveColumnBetweenRows(current, draggedColumn, rowId));
    setDraggedColumn(null);
    setDragGhost(null);
  }

  function dropLink(targetRowId: string, targetColumnId: string, targetSectionId: string, targetIndex: number) {
    if (!draggedLink) {
      return;
    }

    updateConfig((current) => moveLink(current, draggedLink, targetRowId, targetColumnId, targetSectionId, targetIndex));
    setDraggedLink(null);
    setActiveLinkDropKey(null);
    setDragGhost(null);
  }

  function beginDrag(event: DragEvent<HTMLElement>, label: string, kind: DragGhost["kind"], icon?: string, url?: string) {
    event.dataTransfer.effectAllowed = "move";
    setNativeTransparentDragImage(event);
    setDragGhost({ kind, label: label || kind, icon, url, x: event.clientX, y: event.clientY });
  }

  function endDrag() {
    setDraggedColumn(null);
    setDraggedLink(null);
    setActiveLinkDropKey(null);
    setDragGhost(null);
  }

  function handleLinkDragOver(event: DragEvent<HTMLElement>, section: DashboardSection) {
    if (!draggedLink) {
      return;
    }

    allowDrop(event);
    const index = linkDropIndexFromPointer(event, draggedLink.linkId, section.links.length);
    setActiveLinkDropKey(dropKey(section.id, index));
  }

  return (
    <section className={`dashboard-rows ${editing ? "is-editing" : ""}`} aria-label="Startpage links">
      {config.rows.map((row, rowIndex) => (
        <section className="dashboard-row" key={row.id} aria-label={`Row ${rowIndex + 1}`}>
          {editing ? (
            <div className="row-edit-bar">
              <div className="row-summary">
                <span>Layout row {rowIndex + 1}</span>
                <strong>{row.columns.length} {row.columns.length === 1 ? "column" : "columns"}</strong>
              </div>
              <div className="inline-actions">
                <button type="button" onClick={() => moveRow(row.id, -1)} disabled={rowIndex === 0}>
                  Up
                </button>
                <button type="button" onClick={() => moveRow(row.id, 1)} disabled={rowIndex === config.rows.length - 1}>
                  Down
                </button>
                <button type="button" onClick={() => addColumn(row.id)}>
                  Add column
                </button>
                <button type="button" onClick={() => addRow(rowIndex)}>
                  Add row below
                </button>
                <button type="button" className="danger-ghost" onClick={() => deleteRow(row.id)} disabled={config.rows.length === 1}>
                  Remove row
                </button>
              </div>
            </div>
          ) : null}
          <div
            className={`columns-grid ${editing ? "is-editing" : ""}`}
            style={{ gridTemplateColumns: `repeat(${row.columns.length}, minmax(0, 1fr))` }}
            onDragOver={editing ? allowDrop : undefined}
            onDrop={editing ? () => dropColumnAtRowEnd(row.id) : undefined}
          >
            {row.columns.map((column, columnIndex) => (
              <article
                className={`column-card ${editing ? "editable-card" : ""}`}
                key={column.id}
                draggable={editing}
                onDragStart={
                  editing
                    ? (event) => {
                        if (event.target instanceof HTMLElement && event.target.closest(".editable-link")) {
                          return;
                        }

                        if (shouldIgnoreColumnDrag(event.target)) {
                          event.preventDefault();
                          return;
                        }

                        beginDrag(event, column.title || "Column", "Column");
                        setDraggedColumn({ rowId: row.id, columnId: column.id });
                      }
                    : undefined
                }
                onDragEnd={editing ? endDrag : undefined}
                onDragOver={editing ? allowDrop : undefined}
                onDrop={
                  editing
                    ? (event) => {
                        event.stopPropagation();
                        dropColumn(row.id, column.id);
                      }
                    : undefined
                }
              >
                <div className="column-heading">
                  {editing ? (
                    <button
                      type="button"
                      className={`editable-heading-button ${isSelected(selection, { type: "column", rowId: row.id, columnId: column.id }) ? "is-selected" : ""}`}
                      onClick={() => setSelection({ type: "column", rowId: row.id, columnId: column.id })}
                    >
                      <span>Column</span>
                      <strong>{titleText(column.title) || "Untitled column"}</strong>
                    </button>
                  ) : (
                    titleText(column.title) ? <h2>{titleText(column.title)}</h2> : null
                  )}
                  {editing ? (
                    <div className="inline-actions">
                      <button type="button" onClick={() => moveColumn(row.id, column.id, -1)} disabled={columnIndex === 0}>
                        Left
                      </button>
                      <button type="button" onClick={() => moveColumn(row.id, column.id, 1)} disabled={columnIndex === row.columns.length - 1}>
                        Right
                      </button>
                      <button type="button" className="danger-ghost" onClick={() => deleteColumn(row.id, column.id)} disabled={row.columns.length === 1}>
                        Remove
                      </button>
                    </div>
                  ) : null}
                </div>
                <div className="sections-stack">
                  {column.sections.map((section) => (
                    <section className="section-card" key={section.id}>
                      <div className="section-heading">
                        {editing ? (
                          <button
                            type="button"
                            className={`editable-heading-button section-heading-button ${isSelected(selection, { type: "section", rowId: row.id, columnId: column.id, sectionId: section.id }) ? "is-selected" : ""}`}
                            onClick={() => setSelection({ type: "section", rowId: row.id, columnId: column.id, sectionId: section.id })}
                          >
                            <span>Section</span>
                            <strong>{titleText(section.title) || "Untitled section"}</strong>
                          </button>
                        ) : (
                          titleText(section.title) ? <h3>{titleText(section.title)}</h3> : null
                        )}
                        {editing ? (
                          <div className="inline-actions">
                            <button
                              type="button"
                              onClick={() => updateSection(row.id, column.id, section.id, (item) => ({ ...item, links: [...item.links, makeLink()] }))}
                            >
                              Add link
                            </button>
                            <button
                              type="button"
                              className="danger-ghost"
                              disabled={column.sections.length === 1}
                              onClick={() =>
                                updateColumn(row.id, column.id, (item) => ({
                                  ...item,
                                  sections: item.sections.filter((candidate) => candidate.id !== section.id),
                                }))
                              }
                            >
                              Remove
                            </button>
                          </div>
                        ) : null}
                      </div>
                      <div
                        className="links-list"
                        style={sectionGridStyle(section.columns)}
                        onDragEnter={editing ? () => draggedLink && setActiveLinkDropKey(dropKey(section.id, section.links.length)) : undefined}
                        onDragOver={editing ? (event) => handleLinkDragOver(event, section) : undefined}
                        onDrop={
                          editing
                            ? (event) => {
                                if (!draggedLink) {
                                  return;
                                }

                                event.stopPropagation();
                                dropLink(row.id, column.id, section.id, dropIndexFromKey(activeLinkDropKey, section.id) ?? section.links.length);
                              }
                            : undefined
                        }
                      >
                        {editing ? (
                          <>
                            {section.links.map((link, linkIndex) => (
                              <Fragment key={link.id}>
                                {activeLinkDropKey === dropKey(section.id, linkIndex) && draggedLink ? <LinkDropPlaceholder label={draggedLink.title} /> : null}
                                <div className="editable-link-group" data-link-drop-item data-link-id={link.id} data-link-index={linkIndex}>
                                <EditableLink
                                  link={link}
                                  dragging={draggedLink?.linkId === link.id}
                                  canDelete={section.links.length > 1}
                                  onDragStart={(event) => {
                                    beginDrag(event, link.title || prettyUrl(link.url), "Link", link.icon, link.url);
                                    setDraggedLink({ rowId: row.id, columnId: column.id, sectionId: section.id, linkId: link.id, title: link.title });
                                  }}
                                  onDragEnd={endDrag}
                                  onDelete={() =>
                                    updateSection(row.id, column.id, section.id, (item) => ({
                                      ...item,
                                      links: item.links.filter((candidate) => candidate.id !== link.id),
                                    }))
                                  }
                                  selected={isSelected(selection, { type: "link", rowId: row.id, columnId: column.id, sectionId: section.id, linkId: link.id })}
                                  onSelect={() => setSelection({ type: "link", rowId: row.id, columnId: column.id, sectionId: section.id, linkId: link.id })}
                                />
                                </div>
                              </Fragment>
                            ))}
                            {activeLinkDropKey === dropKey(section.id, section.links.length) && draggedLink ? <LinkDropPlaceholder label={draggedLink.title} /> : null}
                          </>
                        ) : (
                          section.links.map((link) => <LinkTile link={link} key={link.id} />)
                        )}
                      </div>
                    </section>
                  ))}
                </div>
                {editing ? (
                  <div className="column-footer-actions">
                    <button type="button" onClick={() => updateColumn(row.id, column.id, (item) => ({ ...item, sections: [...item.sections, makeSection()] }))}>
                      Add section
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ))}
      {editing ? (
        <button type="button" className="add-row-button" onClick={() => addRow()}>
          Add row
        </button>
      ) : null}
      {editing ? (
        <EditInspector
          selection={selection}
          config={config}
          onClose={() => setSelection(null)}
          onColumnChange={updateColumn}
          onSectionChange={updateSection}
          onLinkChange={updateLink}
        />
      ) : null}
      <DragPreview ghost={dragGhost} />
    </section>
  );
}

function DragPreview({ ghost }: { ghost: DragGhost | null }) {
  if (!ghost) {
    return null;
  }

  return (
    <div className="floating-drag-preview" style={{ transform: `translate3d(${ghost.x + 14}px, ${ghost.y + 14}px, 0)` }}>
      {ghost.kind === "Link" ? <LinkIcon link={{ id: "drag-preview", title: ghost.label, url: ghost.url ?? "#", icon: ghost.icon }} /> : null}
      <span>
        <small>{ghost.kind}</small>
        <strong>{ghost.label}</strong>
      </span>
    </div>
  );
}

function EditSettings({ config, onChange }: { config: DashboardConfig; onChange: (config: DashboardConfig) => void }) {
  function updateConfig(updater: (config: DashboardConfig) => DashboardConfig) {
    onChange(updater(config));
  }

  return (
    <section className="edit-settings" aria-label="Page settings">
      <label className="field compact-field">
        <span>Page title</span>
        <input value={config.title} onChange={(event) => updateConfig((current) => ({ ...current, title: event.target.value }))} />
      </label>
      <label className="field compact-field">
        <span>Search provider</span>
        <select
          value={config.search.provider}
          onChange={(event) => {
            const preset = SEARCH_PRESETS.find((item) => item.provider === event.target.value);
            if (preset) {
              updateConfig((current) => ({ ...current, search: preset }));
            }
          }}
        >
          {SEARCH_PRESETS.map((preset) => (
            <option value={preset.provider} key={preset.provider}>
              {preset.provider}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="danger-ghost" onClick={() => onChange(DEFAULT_CONFIG)}>
        Reset
      </button>
    </section>
  );
}

function EditableLink({
  link,
  dragging,
  canDelete,
  selected,
  onDragStart,
  onDragEnd,
  onDelete,
  onSelect,
}: {
  link: DashboardLink;
  dragging: boolean;
  canDelete: boolean;
  selected: boolean;
  onDragStart: (event: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onDelete: () => void;
  onSelect: () => void;
}) {
  const title = titleText(link.title);

  return (
    <div className={`editable-link ${dragging ? "is-dragging" : ""} ${selected ? "is-selected" : ""}`} draggable onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <button type="button" className="editable-link-select" onClick={onSelect}>
        <LinkIcon link={link} />
        <span>
          {title ? <strong>{title}</strong> : null}
          {link.showUrl ? <small>{prettyUrl(link.url)}</small> : null}
        </span>
      </button>
      <button type="button" className="link-delete-button" disabled={!canDelete} onClick={onDelete} title="Delete link">
        Delete
      </button>
    </div>
  );
}

function EditInspector({
  selection,
  config,
  onClose,
  onColumnChange,
  onSectionChange,
  onLinkChange,
}: {
  selection: EditorSelection | null;
  config: DashboardConfig;
  onClose: () => void;
  onColumnChange: (rowId: string, columnId: string, updater: (column: DashboardColumn) => DashboardColumn) => void;
  onSectionChange: (rowId: string, columnId: string, sectionId: string, updater: (section: DashboardSection) => DashboardSection) => void;
  onLinkChange: (rowId: string, columnId: string, sectionId: string, linkId: string, updater: (link: DashboardLink) => DashboardLink) => void;
}) {
  const selected = selection ? findSelection(config, selection) : null;

  if (!selection || !selected) {
    return (
      <aside className="edit-inspector is-empty">
        <div>
          <span>Inspector</span>
          <strong>Select something to edit</strong>
        </div>
        <p>Click a column, section, or link. Fields stay here so the grid does not overflow.</p>
      </aside>
    );
  }

  if (selection.type === "column" && selected.type === "column") {
    return (
      <aside className="edit-inspector">
        <InspectorHeading label="Column" title={selected.column.title || "Untitled column"} onClose={onClose} />
        <label className="field compact-field">
          <span>Title</span>
          <input value={selected.column.title} onChange={(event) => onColumnChange(selection.rowId, selection.columnId, (column) => ({ ...column, title: event.target.value }))} />
        </label>
      </aside>
    );
  }

  if (selection.type === "section" && selected.type === "section") {
    return (
      <aside className="edit-inspector">
        <InspectorHeading label="Section" title={selected.section.title || "Untitled section"} onClose={onClose} />
        <label className="field compact-field">
          <span>Title</span>
          <input
            value={selected.section.title}
            onChange={(event) => onSectionChange(selection.rowId, selection.columnId, selection.sectionId, (section) => ({ ...section, title: event.target.value }))}
          />
        </label>
        <label className="field compact-field">
          <span>Card columns</span>
          <select
            value={selected.section.columns ?? "auto"}
            onChange={(event) =>
              onSectionChange(selection.rowId, selection.columnId, selection.sectionId, (section) => ({
                ...section,
                columns: event.target.value === "auto" ? undefined : Number(event.target.value),
              }))
            }
          >
            <option value="auto">Auto</option>
            <option value="1">1 column</option>
            <option value="2">2 columns</option>
            <option value="3">3 columns</option>
            <option value="4">4 columns</option>
            <option value="5">5 columns</option>
            <option value="6">6 columns</option>
          </select>
        </label>
      </aside>
    );
  }

  if (selection.type === "link" && selected.type === "link") {
    return (
      <aside className="edit-inspector">
        <InspectorHeading label="Link" title={selected.link.title || prettyUrl(selected.link.url)} onClose={onClose} />
        <div className="inspector-link-preview">
          <LinkIcon link={selected.link} />
          <span>{prettyUrl(selected.link.url)}</span>
        </div>
        <div className="inspector-grid">
          <label className="field compact-field">
            <span>Title</span>
            <input
              value={selected.link.title}
              onChange={(event) => onLinkChange(selection.rowId, selection.columnId, selection.sectionId, selection.linkId, (link) => ({ ...link, title: event.target.value }))}
            />
          </label>
          <label className="field compact-field">
            <span>URL</span>
            <input
              value={selected.link.url}
              onChange={(event) => onLinkChange(selection.rowId, selection.columnId, selection.sectionId, selection.linkId, (link) => ({ ...link, url: event.target.value }))}
            />
          </label>
          <label className="field compact-field">
            <span>Icon</span>
            <input
              value={selected.link.icon ?? ""}
              placeholder="github, emoji:home, url:https://..."
              onChange={(event) => onLinkChange(selection.rowId, selection.columnId, selection.sectionId, selection.linkId, (link) => ({ ...link, icon: event.target.value }))}
            />
          </label>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={Boolean(selected.link.showUrl)}
              onChange={(event) =>
                onLinkChange(selection.rowId, selection.columnId, selection.sectionId, selection.linkId, (link) => ({ ...link, showUrl: event.target.checked }))
              }
            />
            <span>Show URL on card</span>
          </label>
        </div>
      </aside>
    );
  }

  return null;
}

function InspectorHeading({ label, title, onClose }: { label: string; title: string; onClose: () => void }) {
  return (
    <div className="inspector-heading">
      <div>
        <span>{label}</span>
        <strong>{title}</strong>
      </div>
      <button type="button" onClick={onClose}>
        Close
      </button>
    </div>
  );
}

function LinkDropPlaceholder({ label }: { label?: string }) {
  return (
    <div className="link-drop-placeholder">
      <span>{label ? `Place ${label} here` : "Place link here"}</span>
    </div>
  );
}

function LinkTile({ link }: { link: DashboardLink }) {
  const title = titleText(link.title);

  return (
    <a className={`link-tile ${title ? "" : "icon-only-link"}`} href={hrefFor(link.url)}>
      <div className="link-card-topline">
        <LinkIcon link={link} />
      </div>
      {title ? (
        <span className="link-card-copy">
          <strong>{title}</strong>
          {link.showUrl ? <small>{prettyUrl(link.url)}</small> : null}
        </span>
      ) : null}
    </a>
  );
}

function LinkIcon({ link }: { link: DashboardLink }) {
  const [failed, setFailed] = useState(false);
  const icon = useMemo(() => resolveIcon(link), [link]);

  useEffect(() => {
    setFailed(false);
  }, [link.icon, link.title]);

  if (failed || icon.kind === "text") {
    return <span className="link-icon text-icon">{initialsFor(link.title)}</span>;
  }

  if (icon.kind === "emoji") {
    return <span className="link-icon emoji-icon">{icon.value}</span>;
  }

  return <img className="link-icon" src={icon.src} alt="" loading="lazy" onError={() => setFailed(true)} />;
}

function CommandPalette({
  config,
  query,
  onQueryChange,
  onClose,
}: {
  config: DashboardConfig;
  query: string;
  onQueryChange: (query: string) => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const items = useMemo(() => collectCommandItems(config), [config]);
  const providerPrefix = useMemo(() => parseProviderPrefix(query), [query]);
  const searchProvider = providerPrefix?.provider ?? config.search;
  const searchQuery = providerPrefix?.query ?? query;
  const matches = useMemo(() => (providerPrefix ? [] : filterCommandItems(items, query)), [items, providerPrefix, query]);
  const visibleMatches = matches.slice(0, 8);
  const destination = destinationFor(searchQuery, searchProvider.url);
  const searchOptionIndex = visibleMatches.length;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function runItem(item: CommandItem) {
    window.location.href = hrefFor(item.url);
  }

  function runQuery() {
    if (activeIndex < visibleMatches.length && visibleMatches[activeIndex]) {
      runItem(visibleMatches[activeIndex]);
      return;
    }

    if (destination) {
      window.location.href = destination;
    }
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, searchOptionIndex));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      runQuery();
    }
  }

  return (
    <div className="command-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="command-palette" role="dialog" aria-modal="true" aria-label="Command palette" onMouseDown={(event) => event.stopPropagation()}>
        <div className="command-input-wrap">
          <span>Go</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a link, URL, or search..."
            spellCheck={false}
          />
          <kbd>Esc</kbd>
        </div>

        <div className="command-results">
          {visibleMatches.length > 0 ? (
            visibleMatches.map((item, index) => (
              <button
                type="button"
                className={`command-result ${index === activeIndex ? "is-active" : ""}`}
                key={item.id}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => runItem(item)}
              >
                <LinkIcon link={{ id: item.id, title: item.title, url: item.url, icon: item.icon }} />
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.context}</small>
                </span>
                <em>{prettyUrl(item.url)}</em>
              </button>
            ))
          ) : (
            <div className="command-empty">
              <strong>No matching links</strong>
              <span>Press Enter to search {searchProvider.provider}.</span>
            </div>
          )}
        </div>

        <button
          type="button"
          className={`command-search-fallback ${activeIndex === searchOptionIndex ? "is-active" : ""}`}
          onMouseEnter={() => setActiveIndex(searchOptionIndex)}
          onClick={() => {
            if (destination) {
              window.location.href = destination;
            }
          }}
          disabled={!destination}
        >
          {providerPrefix ? `Search ${searchProvider.provider}` : "Search or open"} <span>{searchQuery || "..."}</span>
        </button>
      </section>
    </div>
  );
}

function DocsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="docs-modal" role="dialog" aria-modal="true" aria-label="Startpage documentation" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Help</p>
            <h2>Startpage Docs</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close docs">
            x
          </button>
        </div>

        <div className="docs-grid">
          <article>
            <h3>Command Palette</h3>
            <p>Start typing anywhere on the page to open the palette. Use <kbd>Ctrl</kbd> + <kbd>K</kbd> to open it empty.</p>
            <p>Arrow keys select results. Press <kbd>Enter</kbd> to open the selected link or run the search fallback.</p>
          </article>

          <article>
            <h3>Search Prefixes</h3>
            <p>Prefix a query with a provider to search there instead of your default provider.</p>
            <code>youtube synthwave</code>
            <code>github: react</code>
            <code>mdn grid layout</code>
          </article>

          <article>
            <h3>Layout</h3>
            <p>Rows contain columns. Columns contain sections. Sections contain link cards.</p>
            <p>Select a section in edit mode to choose how many card columns it should use.</p>
          </article>

          <article>
            <h3>Edit Mode</h3>
            <p>Click <strong>Customize</strong> to edit. Select a column, section, or link to edit it in the inspector.</p>
            <p>Drag link cards directly to reorder them. Drag columns directly to move them within or between rows.</p>
          </article>

          <article>
            <h3>Icons</h3>
            <p>Use a Dashboard Icons slug for the common case. The app turns the slug into a hosted icon automatically.</p>
            <a href="https://dashboardicons.com/icons" target="_blank" rel="noreferrer">Browse Dashboard Icons</a>
            <p>You can also use a direct image URL, an emoji, or fixed initials. If an icon fails to load, the card falls back to initials.</p>
            <code>github</code>
            <code>jellyfin</code>
            <code>proxmox.png</code>
            <code>url:https://example.com/icon.png</code>
            <code>emoji:🏠</code>
            <code>initials:GH</code>
          </article>

          <article>
            <h3>Config</h3>
            <p>Use Import and Export to copy/paste your YAML config. Store it in a Gist, notes app, or dotfiles repo.</p>
          </article>
        </div>
      </section>
    </div>
  );
}

function ConfigModal({
  mode,
  config,
  onClose,
  onImport,
}: {
  mode: "import" | "export";
  config: DashboardConfig;
  onClose: () => void;
  onImport: (config: DashboardConfig) => void;
}) {
  const exportText = useMemo(() => exportConfigToYaml(config), [config]);
  const [importText, setImportText] = useState("");
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function copyConfig() {
    try {
      await navigator.clipboard.writeText(exportText);
      setMessage("Copied to clipboard.");
    } catch {
      textareaRef.current?.select();
      setMessage("Copy failed. The config text is selected for manual copy.");
    }
  }

  function importConfig() {
    try {
      const nextConfig = importConfigFromYaml(importText);
      onImport(nextConfig);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed.");
    }
  }

  const preview = mode === "import" && importText.trim() ? importPreview(importText) : null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="config-modal" role="dialog" aria-modal="true" aria-label={`${mode} config`} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Config string</p>
            <h2>{mode === "export" ? "Export" : "Import"}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close modal">
            x
          </button>
        </div>

        {mode === "export" ? (
          <>
            <p className="hint">Copy this YAML and store it anywhere: a Gist, notes app, dotfiles repo, or password manager.</p>
            <textarea ref={textareaRef} readOnly value={exportText} />
            <div className="modal-actions">
              <button type="button" className="primary-button" onClick={copyConfig}>
                Copy
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="hint">Paste an exported YAML or JSON config. Import replaces the current dashboard.</p>
            <textarea value={importText} onChange={(event) => setImportText(event.target.value)} placeholder="Paste config here..." />
            {preview ? <p className={preview.startsWith("Ready") ? "success-text" : "error-text"}>{preview}</p> : null}
            <div className="modal-actions">
              <button type="button" className="primary-button" onClick={importConfig} disabled={!importText.trim()}>
                Import
              </button>
            </div>
          </>
        )}

        {message ? <p className="modal-message">{message}</p> : null}
      </section>
    </div>
  );
}

function importPreview(input: string) {
  try {
    return `Ready: ${summarizeConfig(importConfigFromYaml(input))}.`;
  } catch (error) {
    return error instanceof Error ? error.message : "Invalid config.";
  }
}

function destinationFor(query: string, searchUrl: string) {
  const trimmed = query.trim();

  if (!trimmed) {
    return "";
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return trimmed;
  }

  if (/^(localhost|[\w-]+(\.[\w-]+)+)(:\d+)?(\/.*)?$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return searchUrl.replace("{query}", encodeURIComponent(trimmed));
}

function hrefFor(url: string) {
  const trimmed = url.trim();

  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function titleText(value: string | undefined) {
  return value?.trim();
}

function sectionGridStyle(columns: number | undefined) {
  return columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined;
}

function findSelection(config: DashboardConfig, selection: EditorSelection) {
  const row = config.rows.find((candidate) => candidate.id === selection.rowId);
  const column = row?.columns.find((candidate) => candidate.id === selection.columnId);

  if (!row || !column) {
    return null;
  }

  if (selection.type === "column") {
    return { type: "column" as const, row, column };
  }

  const section = column.sections.find((candidate) => candidate.id === selection.sectionId);
  if (!section) {
    return null;
  }

  if (selection.type === "section") {
    return { type: "section" as const, row, column, section };
  }

  const link = section.links.find((candidate) => candidate.id === selection.linkId);
  return link ? { type: "link" as const, row, column, section, link } : null;
}

function isSelected(selection: EditorSelection | null, candidate: EditorSelection) {
  if (!selection || selection.type !== candidate.type || selection.rowId !== candidate.rowId || selection.columnId !== candidate.columnId) {
    return false;
  }

  if (selection.type === "column" && candidate.type === "column") {
    return true;
  }

  if (selection.type === "section" && candidate.type === "section") {
    return selection.sectionId === candidate.sectionId;
  }

  return selection.type === "link" && candidate.type === "link" && selection.sectionId === candidate.sectionId && selection.linkId === candidate.linkId;
}

function collectCommandItems(config: DashboardConfig): CommandItem[] {
  return config.rows.flatMap((row) =>
    row.columns.flatMap((column) =>
      column.sections.flatMap((section) =>
        section.links.map((link) => {
          const title = titleText(link.title) || prettyUrl(link.url);
          const context = [titleText(row.title), titleText(column.title), titleText(section.title)]
            .filter(Boolean)
            .join(" / ");

          return {
            id: link.id,
            title,
            url: link.url,
            icon: link.icon,
            context,
            searchText: `${title} ${link.url} ${context}`.toLowerCase(),
          };
        }),
      ),
    ),
  );
}

function filterCommandItems(items: CommandItem[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return items;
  }

  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  return items
    .map((item) => {
      if (!terms.every((term) => item.searchText.includes(term))) {
        return null;
      }

      const title = item.title.toLowerCase();
      const url = item.url.toLowerCase();
      let score = 0;

      if (title === normalizedQuery) score += 100;
      if (title.startsWith(normalizedQuery)) score += 50;
      if (url.includes(normalizedQuery)) score += 15;
      score += terms.reduce((sum, term) => sum + (title.includes(term) ? 10 : 1), 0);

      return { item, score };
    })
    .filter((result): result is { item: CommandItem; score: number } => Boolean(result))
    .sort((left, right) => right.score - left.score || left.item.title.localeCompare(right.item.title))
    .map((result) => result.item);
}

function parseProviderPrefix(query: string) {
  const trimmed = query.trimStart();

  if (!trimmed) {
    return null;
  }

  const normalizedQuery = normalizeProviderName(trimmed);
  const sortedPresets = [...SEARCH_PRESETS].sort((left, right) => right.provider.length - left.provider.length);

  for (const provider of sortedPresets) {
    const normalizedProvider = normalizeProviderName(provider.provider);
    const separator = providerPrefixSeparator(trimmed, normalizedProvider, normalizedQuery);

    if (!separator) {
      continue;
    }

    return {
      provider,
      query: trimmed.slice(separator.index).replace(/^[:\s-]+/, ""),
    };
  }

  return null;
}

function providerPrefixSeparator(input: string, normalizedProvider: string, normalizedInput: string) {
  if (!normalizedInput.startsWith(normalizedProvider)) {
    return null;
  }

  let normalizedCount = 0;
  for (let index = 0; index < input.length; index += 1) {
    if (/[a-z0-9]/i.test(input[index])) {
      normalizedCount += 1;
    }

    if (normalizedCount === normalizedProvider.length) {
      const nextCharacter = input[index + 1];
      return nextCharacter && /[:\s-]/.test(nextCharacter) ? { index: index + 1 } : null;
    }
  }

  return null;
}

function normalizeProviderName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function prettyUrl(url: string) {
  try {
    const parsed = new URL(hrefFor(url));
    return parsed.hostname.replace(/^www\./, "") + parsed.pathname.replace(/\/$/, "");
  } catch {
    return url;
  }
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return target.matches("input, textarea, select, [contenteditable='true']");
}

function shouldIgnoreColumnDrag(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest("button, input, textarea, select, a, .editable-link"));
}

function allowDrop(event: DragEvent<HTMLElement>) {
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
}

function dropKey(sectionId: string, index: number) {
  return `${sectionId}:${index}`;
}

function dropIndexFromKey(key: string | null, sectionId: string) {
  if (!key?.startsWith(`${sectionId}:`)) {
    return null;
  }

  const index = Number(key.slice(sectionId.length + 1));
  return Number.isInteger(index) ? index : null;
}

function linkDropIndexFromPointer(event: DragEvent<HTMLElement>, draggedLinkId: string, fallbackIndex: number) {
  const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("[data-link-drop-item]"));

  for (const item of items) {
    if (item.dataset.linkId === draggedLinkId) {
      continue;
    }

    const rect = item.getBoundingClientRect();
    const index = Number(item.dataset.linkIndex);

    if (!Number.isInteger(index)) {
      continue;
    }

    const isInRow = event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (isInRow && event.clientX < rect.left + rect.width / 2) {
      return index;
    }

    if (!isInRow && event.clientY < rect.top + rect.height / 2) {
      return index;
    }
  }

  return fallbackIndex;
}

function moveItem<T>(items: T[], sourceIndex: number, direction: -1 | 1) {
  if (sourceIndex < 0) {
    return items;
  }

  return moveToIndex(items, sourceIndex, sourceIndex + direction);
}

function moveToIndex<T>(items: T[], sourceIndex: number, targetIndex: number) {
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex >= items.length || targetIndex >= items.length || sourceIndex === targetIndex) {
    return items;
  }

  const nextItems = [...items];
  const [item] = nextItems.splice(sourceIndex, 1);
  nextItems.splice(targetIndex, 0, item);
  return nextItems;
}

function moveColumnBetweenRows(
  config: DashboardConfig,
  source: DraggedColumn,
  targetRowId: string,
  targetColumnId?: string,
) {
  if (source.rowId === targetRowId && targetColumnId) {
    return {
      ...config,
      rows: config.rows.map((row) => {
        if (row.id !== targetRowId) {
          return row;
        }

        const sourceIndex = row.columns.findIndex((column) => column.id === source.columnId);
        const targetIndex = row.columns.findIndex((column) => column.id === targetColumnId);

        if (sourceIndex < 0 || targetIndex < 0) {
          return row;
        }

        return { ...row, columns: moveToIndex(row.columns, sourceIndex, targetIndex) };
      }),
    };
  }

  let movedColumn: DashboardColumn | null = null;
  const rowsWithoutSource = config.rows
    .map((row) => {
      if (row.id !== source.rowId) {
        return row;
      }

      movedColumn = row.columns.find((column) => column.id === source.columnId) ?? null;
      return { ...row, columns: row.columns.filter((column) => column.id !== source.columnId) };
    })
    .filter((row) => row.columns.length > 0 || row.id === targetRowId || config.rows.length === 1);

  if (!movedColumn) {
    return config;
  }

  return {
    ...config,
    rows: rowsWithoutSource.map((row) => {
      if (row.id !== targetRowId) {
        return row;
      }

      const nextColumns = [...row.columns];
      const targetIndex = targetColumnId ? nextColumns.findIndex((column) => column.id === targetColumnId) : nextColumns.length;
      nextColumns.splice(targetIndex < 0 ? nextColumns.length : targetIndex, 0, movedColumn!);
      return { ...row, columns: nextColumns };
    }),
  };
}

function moveLink(
  config: DashboardConfig,
  source: DraggedLink,
  targetRowId: string,
  targetColumnId: string,
  targetSectionId: string,
  targetIndex: number,
) {
  let dragged: DashboardLink | null = null;
  let sourceIndex = -1;

  const withoutSource = {
    ...config,
    rows: config.rows.map((row) => ({
      ...row,
      columns: row.columns.map((column) => ({
        ...column,
        sections: column.sections.map((section) => {
          if (row.id !== source.rowId || column.id !== source.columnId || section.id !== source.sectionId) {
            return section;
          }

          sourceIndex = section.links.findIndex((link) => link.id === source.linkId);
          dragged = sourceIndex >= 0 ? section.links[sourceIndex] : null;
          return { ...section, links: section.links.filter((link) => link.id !== source.linkId) };
        }),
      })),
    })),
  };

  if (!dragged) {
    return config;
  }

  return {
    ...withoutSource,
    rows: withoutSource.rows.map((row) => ({
      ...row,
      columns: row.columns.map((column) => ({
        ...column,
        sections: column.sections.map((section) => {
          if (row.id !== targetRowId || column.id !== targetColumnId || section.id !== targetSectionId) {
            return section;
          }

          const nextLinks = [...section.links];
          const adjustedTargetIndex =
            source.rowId === targetRowId &&
            source.columnId === targetColumnId &&
            source.sectionId === targetSectionId &&
            sourceIndex >= 0 &&
            sourceIndex < targetIndex
              ? targetIndex - 1
              : targetIndex;
          nextLinks.splice(Math.min(adjustedTargetIndex, nextLinks.length), 0, dragged!);
          return { ...section, links: nextLinks };
        }),
      })),
    })),
  };
}

function setNativeTransparentDragImage(event: DragEvent<HTMLElement>) {
  const dragImage = document.createElement("div");
  dragImage.style.width = "1px";
  dragImage.style.height = "1px";
  dragImage.style.opacity = "0";
  document.body.appendChild(dragImage);
  event.dataTransfer.setDragImage(dragImage, 0, 0);
  window.setTimeout(() => dragImage.remove(), 0);
}
