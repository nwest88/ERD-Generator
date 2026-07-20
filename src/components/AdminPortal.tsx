import React, { useState, useEffect } from "react";
import { Table } from "../types";
import { 
  Database, 
  Save, 
  Plus, 
  Trash2, 
  CheckCircle, 
  AlertCircle,
  Tag,
  HelpCircle,
  Hash
} from "lucide-react";

interface AdminPortalProps {
  schema: Table[];
  setSchema: (schema: Table[]) => void;
}

export default function AdminPortal({ schema, setSchema }: AdminPortalProps) {
  // Keep local draft state so updates don't immediately trigger heavy diagram re-renders until saved
  const [draftSchema, setDraftSchema] = useState<Table[]>([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTables, setSelectedTables] = useState<Set<number>>(new Set());
  const [bulkTagInput, setBulkTagInput] = useState("");

  // Sync draft with main schema when it mounts or resets
  useEffect(() => {
    setDraftSchema(JSON.parse(JSON.stringify(schema)));
    setSelectedTables(new Set());
  }, [schema]);

  const handleTagsChange = (tableIndex: number, value: string) => {
    const updated = [...draftSchema];
    // Split on comma and trim
    const tagArray = value.split(",").map(t => t.trim()).filter(t => t !== "");
    updated[tableIndex] = {
      ...updated[tableIndex],
      tags: tagArray
    };
    setDraftSchema(updated);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const all = new Set(draftSchema.map((_, i) => i));
      setSelectedTables(all);
    } else {
      setSelectedTables(new Set());
    }
  };

  const handleSelectTable = (index: number) => {
    const newSet = new Set(selectedTables);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedTables(newSet);
  };

  const parseBulkTags = (input: string) => input.split(",").map(t => t.trim()).filter(t => t !== "");

  const handleBulkAdd = () => {
    if (!bulkTagInput || selectedTables.size === 0) return;
    const tagsToAdd = parseBulkTags(bulkTagInput);
    if (tagsToAdd.length === 0) return;

    const updated = [...draftSchema];
    selectedTables.forEach(idx => {
      const currentTags = new Set(updated[idx].tags);
      tagsToAdd.forEach(t => currentTags.add(t));
      updated[idx] = { ...updated[idx], tags: Array.from(currentTags) };
    });
    setDraftSchema(updated);
    setBulkTagInput("");
  };

  const handleBulkRemove = () => {
    if (!bulkTagInput || selectedTables.size === 0) return;
    const tagsToRemove = parseBulkTags(bulkTagInput);
    if (tagsToRemove.length === 0) return;

    const updated = [...draftSchema];
    selectedTables.forEach(idx => {
      const currentTags = updated[idx].tags.filter(t => !tagsToRemove.includes(t));
      updated[idx] = { ...updated[idx], tags: currentTags };
    });
    setDraftSchema(updated);
    setBulkTagInput("");
  };

  const handleBulkReplace = () => {
    if (selectedTables.size === 0) return;
    const tagsToReplace = parseBulkTags(bulkTagInput);

    const updated = [...draftSchema];
    selectedTables.forEach(idx => {
      updated[idx] = { ...updated[idx], tags: tagsToReplace };
    });
    setDraftSchema(updated);
    setBulkTagInput("");
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess(null);
    setError(null);
    try {
      const response = await fetch("/api/schema/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schema: draftSchema })
      });
      const data = await response.json();
      if (response.ok) {
        setSchema(draftSchema);
        setSuccess("D365 Entity tags saved successfully to schema.json!");
      } else {
        setError(data.error || "Failed to save schema changes.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect to the schema save service.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-100 text-slate-800 p-6 flex flex-col h-full overflow-auto" id="admin-portal-root">
      <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col">
        
        {/* Title bar */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 shadow-xs">
              <Database className="h-5.5 w-5.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Dynamics 365 Admin Portal</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage entity metadata tags to organize relational models into functional business categories.
              </p>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-md cursor-pointer disabled:opacity-50"
            id="save-schema-changes-btn"
          >
            {saving ? (
              <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save Changes
          </button>
        </div>

        {/* Feedback Messages */}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl mb-6 text-xs flex items-start gap-2.5 shadow-xs animate-in fade-in" id="admin-success-msg">
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-emerald-900">Changes Saved</span>
              {success}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl mb-6 text-xs flex items-start gap-2.5 shadow-xs animate-in fade-in" id="admin-error-msg">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-red-900">Save Failed</span>
              {error}
            </div>
          </div>
        )}

        {/* Bulk Actions Panel */}
        {selectedTables.size > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in zoom-in-95">
            <div className="text-sm font-semibold text-indigo-900">
              <span className="bg-indigo-200 text-indigo-800 px-2.5 py-0.5 rounded-full mr-2">{selectedTables.size}</span>
              Tables Selected
            </div>
            
            <div className="flex flex-1 max-w-lg items-center gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={bulkTagInput}
                  onChange={(e) => setBulkTagInput(e.target.value)}
                  placeholder="Tags (e.g. Sales, Marketing)"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-indigo-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all shadow-sm"
                />
              </div>
              
              <div className="flex shrink-0 gap-1.5">
                <button
                  onClick={handleBulkAdd}
                  className="px-3 py-2 bg-white text-indigo-700 hover:bg-indigo-100 border border-indigo-200 hover:border-indigo-300 rounded-lg text-xs font-semibold transition-colors shadow-sm"
                  title="Add tags to selection"
                >
                  Add
                </button>
                <button
                  onClick={handleBulkRemove}
                  className="px-3 py-2 bg-white text-red-700 hover:bg-red-50 border border-red-200 hover:border-red-300 rounded-lg text-xs font-semibold transition-colors shadow-sm"
                  title="Remove tags from selection"
                >
                  Remove
                </button>
                <button
                  onClick={handleBulkReplace}
                  className="px-3 py-2 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold transition-colors shadow-sm"
                  title="Replace all tags for selection"
                >
                  Replace
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Grid Table Container */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex-1">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200">
                  <th className="px-5 py-3 w-12 text-center">
                    <input 
                      type="checkbox"
                      checked={draftSchema.length > 0 && selectedTables.size === draftSchema.length}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                      title="Select All"
                    />
                  </th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">Entity Display Name</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">Logical Name</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">Functional Area Tags (Comma Separated)</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider w-40">System Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {draftSchema.map((table, idx) => (
                  <tr key={table.logicalName} className={`hover:bg-slate-50/50 transition-colors ${selectedTables.has(idx) ? 'bg-indigo-50/30' : ''}`}>
                    
                    {/* Selection Checkbox */}
                    <td className="px-5 py-4 w-12 text-center">
                      <input 
                        type="checkbox"
                        checked={selectedTables.has(idx)}
                        onChange={() => handleSelectTable(idx)}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>

                    {/* Display Name */}
                    <td className="px-5 py-4">
                      <div className="font-semibold text-xs text-slate-900">{table.displayName}</div>
                    </td>

                    {/* Logical Name */}
                    <td className="px-5 py-4">
                      <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                        {table.logicalName}
                      </span>
                    </td>

                    {/* Editable Tags */}
                    <td className="px-5 py-4">
                      <div className="relative flex items-center">
                        <Tag className="absolute left-3 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={table.tags.join(", ")}
                          onChange={(e) => handleTagsChange(idx, e.target.value)}
                          placeholder="e.g. Sales, Marketing"
                          className="w-full pl-9 pr-3 py-1.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all"
                          id={`input-tags-${table.logicalName}`}
                        />
                      </div>
                    </td>

                    {/* System Tag Badges Preview */}
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {table.tags.map(t => (
                          <span 
                            key={t}
                            className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100"
                          >
                            {t}
                          </span>
                        ))}
                        {table.tags.length === 0 && (
                          <span className="text-[10px] text-slate-400 italic">No Tags</span>
                        )}
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
