import React, { useState, useEffect, useRef } from "react";
import { Table, Column, Relationship } from "../types";
import { 
  Database, 
  Tag, 
  Eye, 
  EyeOff, 
  Search, 
  Plus, 
  Trash2, 
  Layers, 
  ArrowRight, 
  Sparkles,
  Check,
  ChevronRight,
  Info,
  Compass,
  FileSpreadsheet,
  Terminal,
  FileDown
} from "lucide-react";

interface SchemaViewerProps {
  schema: Table[];
  setSchema: (schema: Table[]) => void;
  selectedTable: string | null;
  setSelectedTable: (table: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedTags: string[];
  setSelectedTags: (tags: string[]) => void;
  hideSystemColumns: boolean;
  setHideSystemColumns: (hide: boolean) => void;
}

export default function SchemaViewer({
  schema,
  setSchema,
  selectedTable,
  setSelectedTable,
  searchQuery,
  setSearchQuery,
  selectedTags,
  setSelectedTags,
  hideSystemColumns,
  setHideSystemColumns
}: SchemaViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [connections, setConnections] = useState<Array<{ from: string; to: string; fromCoord: { x: number; y: number }; toCoord: { x: number; y: number } }>>([]);
  const [isAddingTable, setIsAddingTable] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [newTableLogicalName, setNewTableLogicalName] = useState("");
  const [newTableTags, setNewTableTags] = useState<string[]>([]);
  const [allTags] = useState(["Core CRM", "Sales", "Marketing", "Consent & Privacy"]);

  // Column addition state
  const [newColName, setNewColName] = useState("");
  const [newColType, setNewColType] = useState("String");
  const [newColIsPK, setNewColIsPK] = useState(false);
  const [newColIsSystem, setNewColIsSystem] = useState(false);

  // Filter tables
  const filteredTables = schema.filter(table => {
    // Tag filter
    if (selectedTags.length > 0 && !table.tags.some(t => selectedTags.includes(t))) {
      return false;
    }
    // Search query filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesTableName = table.displayName.toLowerCase().includes(q) || table.logicalName.toLowerCase().includes(q);
      const matchesColumnName = table.columns.some(c => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q));
      return matchesTableName || matchesColumnName;
    }
    return true;
  });

  // Calculate coordinates for SVG connecting lines
  useEffect(() => {
    const updateLines = () => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newConnections: typeof connections = [];

      filteredTables.forEach(table => {
        const fromEl = document.getElementById(`table-card-${table.logicalName}`);
        if (!fromEl) return;

        table.relationships.forEach(rel => {
          // Verify if target table is currently visible
          if (!filteredTables.some(t => t.logicalName === rel.targetTable)) return;

          const toEl = document.getElementById(`table-card-${rel.targetTable}`);
          if (!toEl) return;

          const fromRect = fromEl.getBoundingClientRect();
          const toRect = toEl.getBoundingClientRect();

          // Calculate center connection points relative to container
          const fromX = fromRect.left + fromRect.width / 2 - containerRect.left;
          const fromY = fromRect.top + fromRect.height / 2 - containerRect.top;
          const toX = toRect.left + toRect.width / 2 - containerRect.left;
          const toY = toRect.top + toRect.height / 2 - containerRect.top;

          newConnections.push({
            from: table.logicalName,
            to: rel.targetTable,
            fromCoord: { x: fromX, y: fromY },
            toCoord: { x: toX, y: toY }
          });
        });
      });

      setConnections(newConnections);
    };

    // Run after renders/state changes
    const timer = setTimeout(updateLines, 150);
    window.addEventListener("resize", updateLines);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateLines);
    };
  }, [schema, filteredTables, hideSystemColumns, selectedTable]);

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName || !newTableLogicalName) return;

    const lowerLogical = newTableLogicalName.toLowerCase().trim();
    if (schema.some(t => t.logicalName === lowerLogical)) {
      alert("A table with this logical name already exists.");
      return;
    }

    const defaultColumns: Column[] = [
      { name: `${lowerLogical}id`, type: "Uniqueidentifier", isPrimaryKey: true, isSystem: false },
      { name: "name", type: "String", isPrimaryKey: false, isSystem: false },
      { name: "ownerid", type: "Lookup", isPrimaryKey: false, isSystem: true },
      { name: "createdon", type: "DateTime", isPrimaryKey: false, isSystem: true }
    ];

    const newTable: Table = {
      logicalName: lowerLogical,
      displayName: newTableName,
      tags: newTableTags.length > 0 ? newTableTags : ["Core CRM"],
      columns: defaultColumns,
      relationships: []
    };

    setSchema([...schema, newTable]);
    setNewTableName("");
    setNewTableLogicalName("");
    setNewTableTags([]);
    setIsAddingTable(false);
    setSelectedTable(lowerLogical);
  };

  const handleDeleteTable = (logicalName: string) => {
    if (confirm(`Are you sure you want to delete table "${logicalName}"?`)) {
      const updatedSchema = schema
        .filter(t => t.logicalName !== logicalName)
        .map(t => ({
          ...t,
          relationships: t.relationships.filter(r => r.targetTable !== logicalName)
        }));
      setSchema(updatedSchema);
      if (selectedTable === logicalName) {
        setSelectedTable(null);
      }
    }
  };

  const handleAddColumnToSelected = () => {
    if (!selectedTable || !newColName) return;

    const updatedSchema = schema.map(t => {
      if (t.logicalName === selectedTable) {
        if (t.columns.some(c => c.name.toLowerCase() === newColName.toLowerCase())) {
          alert("Column name already exists in this table.");
          return t;
        }
        const newCol: Column = {
          name: newColName.toLowerCase().trim(),
          type: newColType,
          isPrimaryKey: newColIsPK,
          isSystem: newColIsSystem
        };
        
        let updatedRelationships = [...t.relationships];
        if (newColType === "Lookup") {
          const targetTableLogical = prompt(`Enter target table logical name for the lookup relationship (e.g. contact, account):`);
          if (targetTableLogical && schema.some(s => s.logicalName === targetTableLogical.toLowerCase().trim())) {
            updatedRelationships.push({
              targetTable: targetTableLogical.toLowerCase().trim(),
              type: "ManyToOne",
              navigationProperty: `${newCol.name}_${targetTableLogical.toLowerCase().trim()}`
            });
          }
        }

        return {
          ...t,
          columns: [...t.columns, newCol],
          relationships: updatedRelationships
        };
      }
      return t;
    });

    setSchema(updatedSchema);
    setNewColName("");
    setNewColIsPK(false);
    setNewColIsSystem(false);
  };

  const handleDeleteColumnFromSelected = (columnName: string) => {
    if (!selectedTable) return;
    const updatedSchema = schema.map(t => {
      if (t.logicalName === selectedTable) {
        return {
          ...t,
          columns: t.columns.filter(c => c.name !== columnName)
        };
      }
      return t;
    });
    setSchema(updatedSchema);
  };

  // Export static CSV representation as requested in mock
  const handleExportCSV = () => {
    if (!selectedTable) return;
    const table = schema.find(t => t.logicalName === selectedTable);
    if (!table) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Column Name,Type,Primary Key,System Field\n";
    table.columns.forEach(c => {
      csvContent += `${c.name},${c.type},${c.isPrimaryKey ? "Yes" : "No"},${c.isSystem ? "Yes" : "No"}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${table.logicalName}_columns_schema.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to resolve card background color based on tags and selection
  const getHeaderColorClass = (table: Table, isSelected: boolean) => {
    if (isSelected) {
      return "bg-blue-600 text-white";
    }
    if (table.tags.includes("Core CRM")) {
      return "bg-slate-800 text-white";
    }
    if (table.tags.includes("Sales")) {
      return "bg-blue-700 text-white";
    }
    if (table.tags.includes("Marketing")) {
      return "bg-green-600 text-white";
    }
    if (table.tags.includes("Consent & Privacy")) {
      return "bg-purple-600 text-white";
    }
    return "bg-slate-700 text-white";
  };

  const selectedTableData = schema.find(t => t.logicalName === selectedTable);

  return (
    <div className="flex flex-1 h-full bg-slate-100 text-slate-800 font-sans overflow-hidden" id="schema-viewer-container">
      
      {/* LEFT SIDEBAR: Filters & Table Explorer */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 z-10 shadow-sm">
        {/* Header section */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Workspace Controls</span>
          <button
            onClick={() => setIsAddingTable(!isAddingTable)}
            className="p-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200/50 text-blue-700 rounded-md transition-colors"
            title="Create New Entity"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Scrollable sections */}
        <div className="p-4 flex flex-col gap-6 overflow-y-auto flex-1">
          {/* Functional areas selection */}
          <section>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 block">Functional Areas</label>
            <div className="space-y-1">
              {allTags.map(tag => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <label key={tag} className="flex items-center gap-2.5 p-2 hover:bg-slate-50 rounded-md cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleTagToggle(tag)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className={`text-xs ${isSelected ? "text-slate-900 font-semibold" : "text-slate-600"}`}>{tag}</span>
                  </label>
                );
              })}
            </div>
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="text-[10px] text-blue-600 hover:text-blue-800 font-medium underline mt-2 block ml-2"
              >
                Clear functional tags
              </button>
            )}
          </section>

          {/* Table Explorer Search and List */}
          <section className="flex-1 flex flex-col min-h-[220px]">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 block">Table Explorer</label>
            <div className="relative mb-3">
              <input
                type="text"
                placeholder="Search tables..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs border border-slate-200 bg-slate-50/50 rounded-lg py-1.8 pl-8 pr-3 outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all text-slate-700"
              />
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            </div>

            {/* List of matching entities */}
            <div className="space-y-1 overflow-y-auto max-h-[280px] flex-1 pr-1">
              {filteredTables.map(t => {
                const isCurrent = selectedTable === t.logicalName;
                return (
                  <button
                    key={t.logicalName}
                    onClick={() => setSelectedTable(isCurrent ? null : t.logicalName)}
                    className={`w-full text-left text-xs p-2 rounded-md transition-all flex items-center justify-between group ${
                      isCurrent 
                        ? "bg-blue-50 text-blue-700 font-semibold border-l-3 border-blue-600" 
                        : "hover:bg-slate-50 text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Database className={`h-3 w-3 ${isCurrent ? "text-blue-600" : "text-slate-400"}`} />
                      <span className="truncate">{t.displayName}</span>
                    </div>
                    <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 text-slate-400 shrink-0 transition-opacity" />
                  </button>
                );
              })}
              {filteredTables.length === 0 && (
                <div className="text-center py-4 text-[11px] text-slate-400 italic">No matching tables.</div>
              )}
            </div>
          </section>

          {/* System Fields Switcher */}
          <section className="mt-auto border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Hide System Fields</span>
              <button
                onClick={() => setHideSystemColumns(!hideSystemColumns)}
                className={`w-9 h-5 rounded-full relative transition-colors ${
                  hideSystemColumns ? "bg-blue-600" : "bg-slate-300"
                }`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                  hideSystemColumns ? "right-0.5" : "left-0.5"
                }`} />
              </button>
            </div>
          </section>
        </div>
      </aside>

      {/* CENTRAL AREA: Interactive Canvas Diagram */}
      <main className="flex-1 flex flex-col relative bg-slate-50 overflow-hidden">
        
        {/* Dynamic Add Table Inline Header Panel */}
        {isAddingTable && (
          <div className="bg-white border-b border-slate-200 p-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-200 z-10">
            <form onSubmit={handleAddTable} className="max-w-4xl mx-auto flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[180px]">
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Table Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Loyalty Program"
                  value={newTableName}
                  onChange={(e) => {
                    setNewTableName(e.target.value);
                    if (!newTableLogicalName) {
                      setNewTableLogicalName(e.target.value.toLowerCase().replace(/\s+/g, ""));
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                />
              </div>
              <div className="flex-1 min-w-[180px]">
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Logical Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. loyaltyprogram"
                  value={newTableLogicalName}
                  onChange={(e) => setNewTableLogicalName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                />
              </div>
              <div className="min-w-[200px]">
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Functional Tags</label>
                <div className="flex gap-1 flex-wrap pt-1">
                  {allTags.map(tag => {
                    const hasTag = newTableTags.includes(tag);
                    return (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => {
                          if (hasTag) {
                            setNewTableTags(newTableTags.filter(t => t !== tag));
                          } else {
                            setNewTableTags([...newTableTags, tag]);
                          }
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] transition-colors border ${
                          hasTag 
                            ? "bg-blue-50 text-blue-600 border-blue-200" 
                            : "bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-colors"
                >
                  Create Table
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingTable(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium text-xs px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* The Grid Canvas */}
        <div 
          className="flex-1 relative overflow-auto p-8 grid-bg" 
          ref={containerRef} 
          style={{ minHeight: "500px" }}
          id="erd-board"
        >
          {/* SVG Connections with Professional Polish styling */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none select-none z-0 overflow-visible" style={{ minWidth: "100%", minHeight: "100%" }}>
            <defs>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#94a3b8" />
              </marker>
              <marker
                id="arrow-selected"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#2563eb" />
              </marker>
            </defs>

            {connections.map((conn, idx) => {
              const isRelatedToSelected = selectedTable && (conn.from === selectedTable || conn.to === selectedTable);
              const isHighPriority = selectedTable ? isRelatedToSelected : true;

              if (!isHighPriority) return null;

              // Compute smooth cubic Bezier curve coordinates
              const dx = conn.toCoord.x - conn.fromCoord.x;
              const dy = conn.toCoord.y - conn.fromCoord.y;
              const cx1 = conn.fromCoord.x + dx * 0.45;
              const cy1 = conn.fromCoord.y;
              const cx2 = conn.fromCoord.x + dx * 0.55;
              const cy2 = conn.toCoord.y;

              const pathData = `M ${conn.fromCoord.x} ${conn.fromCoord.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${conn.toCoord.x} ${conn.toCoord.y}`;

              return (
                <g key={`link-${idx}`}>
                  {/* Subtle glowing halo path behind active lines */}
                  {isRelatedToSelected && (
                    <path
                      d={pathData}
                      fill="none"
                      stroke="#bfdbfe"
                      strokeWidth={6}
                      className="opacity-40"
                    />
                  )}
                  <path
                    d={pathData}
                    fill="none"
                    stroke={isRelatedToSelected ? "#2563eb" : "#94a3b8"}
                    strokeWidth={isRelatedToSelected ? 2.5 : 1.2}
                    strokeDasharray={isRelatedToSelected ? "none" : "4, 4"}
                    markerEnd={isRelatedToSelected ? "url(#arrow-selected)" : "url(#arrow)"}
                    className="transition-all duration-300"
                  />
                </g>
              );
            })}
          </svg>

          {/* Tables Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 relative z-10">
            {filteredTables.map((table) => {
              const isSelected = selectedTable === table.logicalName;
              const isRelated = selectedTable && (
                table.logicalName === selectedTable ||
                table.relationships.some(r => r.targetTable === selectedTable) ||
                schema.find(t => t.logicalName === selectedTable)?.relationships.some(r => r.targetTable === table.logicalName)
              );

              const columnsToDisplay = table.columns.filter(c => !hideSystemColumns || !c.isSystem);

              return (
                <div
                  key={table.logicalName}
                  id={`table-card-${table.logicalName}`}
                  onClick={() => setSelectedTable(isSelected ? null : table.logicalName)}
                  className={`bg-white rounded-xl border transition-all duration-300 select-none cursor-pointer overflow-hidden ${
                    isSelected
                      ? "border-blue-500 shadow-xl ring-2 ring-blue-500/20 scale-[1.01]"
                      : isRelated
                      ? "border-blue-300/80 shadow-md scale-[1.005]"
                      : selectedTable
                      ? "border-slate-200 opacity-50 hover:opacity-85"
                      : "border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300"
                  }`}
                >
                  {/* Entity Color-Coded Header */}
                  <div className={`px-4 py-2.5 ${getHeaderColorClass(table, isSelected)} flex justify-between items-center transition-all`}>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold tracking-wider opacity-85">{table.logicalName}</span>
                      <span className="text-xs font-bold truncate max-w-[150px]" title={table.displayName}>
                        {table.displayName}
                      </span>
                    </div>
                    
                    {/* Tiny functional tag */}
                    <span className="text-[8px] bg-white/20 border border-white/10 text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-tight shrink-0">
                      {table.tags[0]}
                    </span>
                  </div>

                  {/* Columns List */}
                  <div className="p-3 bg-white">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 text-[9px] uppercase font-bold">
                          <th className="pb-1">Column</th>
                          <th className="pb-1 text-right">Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 font-mono">
                        {columnsToDisplay.map((col) => (
                          <tr
                            key={col.name}
                            className={`group/col transition-colors ${
                              col.isPrimaryKey 
                                ? "text-blue-700 font-semibold bg-blue-50/20" 
                                : col.isSystem 
                                ? "text-slate-400 italic" 
                                : "text-slate-700"
                            }`}
                          >
                            <td className="py-1.5 flex items-center justify-between">
                              <span className="truncate max-w-[120px]" title={col.name}>
                                {col.name}
                                {col.isPrimaryKey && <span className="text-[8px] bg-amber-100 text-amber-800 ml-1.5 px-1 rounded-sm font-bold">PK</span>}
                                {col.isSystem && <span className="text-[8px] bg-slate-100 text-slate-500 ml-1.5 px-1 rounded-sm">SYS</span>}
                              </span>
                            </td>
                            <td className="py-1.5 text-[10px] text-slate-400 text-right">
                              {col.type.toLowerCase()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {columnsToDisplay.length === 0 && (
                      <div className="text-center py-4 text-[10px] text-slate-400 italic">No columns displayable.</div>
                    )}
                  </div>

                  {/* Footer showing relationships */}
                  {table.relationships.length > 0 && (
                    <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                      <span className="flex items-center gap-1">
                        <Layers className="h-3 w-3 text-blue-500" />
                        {table.relationships.length} relationship{table.relationships.length > 1 ? "s" : ""}
                      </span>
                      <span className="text-[8px] text-slate-400 truncate max-w-[110px]" title={table.relationships.map(r => r.targetTable).join(", ")}>
                        → {table.relationships.map(r => r.targetTable).join(", ")}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Empty state */}
          {filteredTables.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Compass className="h-12 w-12 stroke-1 text-slate-300 mb-3 animate-spin" style={{ animationDuration: "12s" }} />
              <p className="text-sm font-semibold">No entities visible with current filters.</p>
              <button 
                onClick={() => { setSelectedTags([]); setSearchQuery(""); }}
                className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-semibold underline"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </main>

      {/* RIGHT SIDEBAR: Inspector Panel */}
      <aside className="w-72 bg-white border-l border-slate-200 flex flex-col shrink-0 z-10 shadow-sm">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Table Inspector</h2>
          <p className="text-[11px] text-slate-500 font-semibold mt-1">
            {selectedTableData ? `${selectedTableData.displayName} (${selectedTableData.logicalName})` : "No Entity Selected"}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
          {selectedTableData ? (
            <>
              {/* Quick Actions inside inspector */}
              <section>
                <h3 className="text-[10px] font-bold text-slate-400 mb-2.5 uppercase tracking-wider">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={handleExportCSV}
                    className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-lg text-[11px] font-medium transition-all flex items-center justify-center gap-1 shadow-xs"
                  >
                    <FileDown className="h-3.5 w-3.5 text-blue-600" /> Export CSV
                  </button>
                  <button 
                    onClick={() => handleDeleteTable(selectedTableData.logicalName)}
                    className="p-2 border border-red-200 hover:bg-red-50 text-red-700 rounded-lg text-[11px] font-medium transition-all flex items-center justify-center gap-1 shadow-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Drop Entity
                  </button>
                </div>
              </section>

              {/* Add New Column Form directly in sidebar */}
              <section className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                <h3 className="text-[10px] font-bold text-slate-400 mb-2.5 uppercase tracking-wider">Add Field</h3>
                <div className="space-y-2.5">
                  <input
                    type="text"
                    placeholder="field_name"
                    value={newColName}
                    onChange={e => setNewColName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                  />
                  <div className="flex gap-2">
                    <select
                      value={newColType}
                      onChange={e => setNewColType(e.target.value)}
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:outline-none"
                    >
                      <option>String</option>
                      <option>Uniqueidentifier</option>
                      <option>Lookup</option>
                      <option>DateTime</option>
                      <option>Integer</option>
                      <option>Picklist</option>
                      <option>Money</option>
                      <option>Boolean</option>
                    </select>
                    <button
                      onClick={handleAddColumnToSelected}
                      disabled={!newColName}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-45 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition-colors shrink-0"
                    >
                      Add
                    </button>
                  </div>

                  <div className="flex flex-col gap-1.5 pt-1">
                    <label className="flex items-center gap-1.5 text-[10px] text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newColIsPK}
                        onChange={e => setNewColIsPK(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 accent-blue-600 cursor-pointer"
                      />
                      Primary Key (PK)
                    </label>
                    <label className="flex items-center gap-1.5 text-[10px] text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newColIsSystem}
                        onChange={e => setNewColIsSystem(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 accent-blue-600 cursor-pointer"
                      />
                      D365 System Field
                    </label>
                  </div>
                </div>
              </section>

              {/* Columns Inspector */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Columns ({selectedTableData.columns.length})
                  </h3>
                  {hideSystemColumns && selectedTableData.columns.some(c => c.isSystem) && (
                    <span className="text-[9px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded-full">
                      System Hidden
                    </span>
                  )}
                </div>

                <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                  {selectedTableData.columns
                    .filter(c => !hideSystemColumns || !c.isSystem)
                    .map(col => (
                      <div 
                        key={col.name} 
                        className={`p-2.5 rounded-lg border transition-all ${
                          col.isPrimaryKey 
                            ? "bg-amber-50/50 border-amber-200/60" 
                            : col.isSystem 
                            ? "border-slate-100 opacity-60 bg-slate-50/20" 
                            : "border-slate-100 hover:border-slate-200 bg-white"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1 gap-1">
                          <span className="text-xs font-bold text-slate-800 break-all">{col.name}</span>
                          <span className={`text-[8px] px-1.5 py-0.2 rounded-full font-bold uppercase shrink-0 ${
                            col.isPrimaryKey 
                              ? "bg-amber-100 text-amber-800" 
                              : col.isSystem 
                              ? "bg-slate-100 text-slate-500" 
                              : "bg-blue-50 text-blue-700"
                          }`}>
                            {col.isPrimaryKey ? "PK" : col.isSystem ? "System" : col.type}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 flex justify-between items-center mt-1.5">
                          <span>
                            {col.isPrimaryKey 
                              ? "Unique identifier of record" 
                              : col.type === "Lookup" 
                              ? "Relational lookup reference" 
                              : "Field definition"}
                          </span>
                          {!col.isPrimaryKey && (
                            <button
                              onClick={() => handleDeleteColumnFromSelected(col.name)}
                              className="text-red-500 hover:text-red-700 text-[10px] font-semibold hover:underline cursor-pointer"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </section>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center flex-1">
              <Info className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-xs font-medium">Click any table entity on the canvas to inspect its schema metadata.</p>
            </div>
          )}

          {/* Connected environment log info inside right panel */}
          <section className="mt-auto bg-slate-900 -mx-4 -mb-4 p-4 text-slate-300 rounded-b-lg">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shrink-0"></span>
              <span className="text-[9px] uppercase font-bold tracking-widest text-emerald-400">D365 Connection Active</span>
            </div>
            <p className="text-[10px] opacity-75 leading-relaxed">
              Target Tenant:<br />
              <strong className="text-white font-mono">org8c92a.crm.dynamics.com</strong>
            </p>
          </section>
        </div>
      </aside>

    </div>
  );
}
