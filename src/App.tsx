import React, { useState } from "react";
import initialSchema from "./data/schema.json";
import { Table } from "./types";
import SchemaViewer from "./components/SchemaViewer";
import SchemaJSONViewer from "./components/SchemaJSONViewer";
import AISchemaAssistant from "./components/AISchemaAssistant";
import { 
  Database, 
  Layers, 
  Code, 
  Sparkles, 
  Settings,
  HelpCircle,
  TrendingUp,
  GitBranch
} from "lucide-react";

export default function App() {
  const [schema, setSchema] = useState<Table[]>(initialSchema);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [hideSystemColumns, setHideSystemColumns] = useState(true);
  const [activeTab, setActiveTab] = useState<'erd' | 'json' | 'ai'>('erd');

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-50 text-slate-800 overflow-hidden font-sans">
      {/* Top Header with Professional Polish Styling */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shrink-0 shadow-sm z-30">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm">
            <Database className="h-5.5 w-5.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
                D365 ERD Architect
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 border border-blue-100 text-blue-700 uppercase tracking-wider">
                Enterprise POC
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Automated Dynamics 365 Entity-Relationship Diagram Generator</p>
          </div>
        </div>

        {/* Tab Navigation - Polished Segmented Control */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200/80">
          <button
            onClick={() => setActiveTab('erd')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'erd'
                ? "bg-white text-blue-700 shadow-sm border border-slate-200/40"
                : "text-slate-600 hover:text-slate-900"
            }`}
            id="tab-btn-erd"
          >
            <Layers className="h-3.5 w-3.5" /> Interactive ERD Canvas
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'json'
                ? "bg-white text-blue-700 shadow-sm border border-slate-200/40"
                : "text-slate-600 hover:text-slate-900"
            }`}
            id="tab-btn-json"
          >
            <Code className="h-3.5 w-3.5" /> schema.json Editor
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'ai'
                ? "bg-white text-blue-700 shadow-sm border border-slate-200/40"
                : "text-slate-600 hover:text-slate-900"
            }`}
            id="tab-btn-ai"
          >
            <Sparkles className="h-3.5 w-3.5 text-blue-600 animate-pulse" /> AI Solution Copilot
          </button>
        </div>

        {/* Active Stats Pill Badge */}
        <div className="hidden md:flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-full border border-slate-200">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">org8c92a.crm</span>
          </div>
          <div className="text-right">
            <span className="font-mono text-slate-700 font-semibold text-xs">{schema.length} entities</span>
            <span className="text-[10px] text-slate-400 block mt-0.2">
              {schema.reduce((acc, t) => acc + t.relationships.length, 0)} relations
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative flex flex-col bg-slate-100">
        {activeTab === 'erd' && (
          <SchemaViewer
            schema={schema}
            setSchema={setSchema}
            selectedTable={selectedTable}
            setSelectedTable={setSelectedTable}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedTags={selectedTags}
            setSelectedTags={setSelectedTags}
            hideSystemColumns={hideSystemColumns}
            setHideSystemColumns={setHideSystemColumns}
          />
        )}
        
        {activeTab === 'json' && (
          <SchemaJSONViewer
            schema={schema}
            setSchema={setSchema}
          />
        )}

        {activeTab === 'ai' && (
          <AISchemaAssistant
            schema={schema}
            setSchema={setSchema}
          />
        )}
      </main>
    </div>
  );
}
