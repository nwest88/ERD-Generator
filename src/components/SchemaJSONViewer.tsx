import React, { useState } from "react";
import { Table } from "../types";
import { 
  Copy, 
  Check, 
  Download, 
  FileText, 
  Terminal, 
  Code,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  Code2
} from "lucide-react";

interface SchemaJSONViewerProps {
  schema: Table[];
  setSchema: (schema: Table[]) => void;
}

export default function SchemaJSONViewer({ schema, setSchema }: SchemaJSONViewerProps) {
  const [copied, setCopied] = useState(false);
  const [jsonText, setJsonText] = useState(JSON.stringify(schema, null, 2));
  const [isEditing, setIsEditing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // AI-generated state
  const [aiAction, setAiAction] = useState<'sql' | 'csdl' | 'none'>('none');
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiOutput, setAiOutput] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(schema, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(schema, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "schema.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleApplyChanges = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) {
        throw new Error("Schema must be a JSON array of Table objects.");
      }
      
      parsed.forEach((table: any, idx: number) => {
        if (!table.logicalName || !table.displayName) {
          throw new Error(`Table at index ${idx} is missing logicalName or displayName.`);
        }
        if (!Array.isArray(table.columns)) {
          throw new Error(`Table "${table.displayName}" is missing columns array.`);
        }
        if (!Array.isArray(table.relationships)) {
          throw new Error(`Table "${table.displayName}" is missing relationships array.`);
        }
      });

      setSchema(parsed);
      setErrorMsg(null);
      setIsEditing(false);
    } catch (e: any) {
      setErrorMsg(e.message || "Invalid JSON schema structure.");
    }
  };

  const generateAITranslation = async (type: 'sql' | 'csdl') => {
    setLoadingAI(true);
    setAiAction(type);
    setErrorMsg(null);
    setAiOutput("");

    try {
      const res = await fetch("/api/schema/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: type,
          schema: schema,
          prompt: aiPrompt || `Generate ${type.toUpperCase()} specification`
        })
      });
      const data = await res.json();
      if (res.ok) {
        setAiOutput(data.result);
      } else {
        setErrorMsg(data.error || "An error occurred with the AI generator.");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to contact the AI service.");
    } finally {
      setLoadingAI(false);
    }
  };

  const handleCopyAIOutput = () => {
    navigator.clipboard.writeText(aiOutput);
    alert("Copied AI-generated script to clipboard!");
  };

  return (
    <div className="flex-1 bg-slate-100 text-slate-800 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-200 overflow-auto h-full" id="schema-json-container">
      
      {/* LEFT COLUMN: JSON Editor Panel */}
      <div className="flex-1 p-6 flex flex-col h-full min-h-[400px]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
              <FileText className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">schema.json Specification</h3>
              <p className="text-[11px] text-slate-500">View and edit raw entity definition arrays</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs px-3 py-1.8 rounded-lg border border-slate-200 transition-all font-semibold shadow-xs"
              id="copy-schema-btn"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5 text-slate-500" />}
              {copied ? "Copied!" : "Copy JSON"}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs px-3 py-1.8 rounded-lg border border-slate-200 transition-all font-semibold shadow-xs"
              id="download-schema-btn"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" /> Download
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-3.5 rounded-lg mb-4 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertTriangle className="h-4.5 w-4.5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-red-900">Schema Validation Failed</span>
              <p className="mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200/80 overflow-hidden font-mono text-xs shadow-xs relative">
          <textarea
            value={isEditing ? jsonText : JSON.stringify(schema, null, 2)}
            onChange={(e) => {
              setJsonText(e.target.value);
              setIsEditing(true);
            }}
            className="w-full h-full p-4 bg-transparent resize-none focus:outline-none text-slate-700 leading-relaxed font-mono overflow-auto"
            style={{ minHeight: "250px" }}
          />
          {isEditing && (
            <div className="absolute bottom-4 right-4 flex gap-2">
              <button
                onClick={handleApplyChanges}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-1.8 rounded-lg shadow-md transition-colors"
              >
                Apply Schema Updates
              </button>
              <button
                onClick={() => {
                  setJsonText(JSON.stringify(schema, null, 2));
                  setIsEditing(false);
                  setErrorMsg(null);
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs px-3.5 py-1.8 rounded-lg transition-colors flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" /> Reset
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-3 text-slate-500 text-[11px]">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
          <span>Tip: Direct JSON edit will automatically calculate coordinates and links in the Interactive Canvas.</span>
        </div>
      </div>

      {/* RIGHT COLUMN: AI Automation DDL Translation Panel */}
      <div className="w-full md:w-[45%] p-6 flex flex-col bg-white border-l border-slate-200 h-full overflow-auto shrink-0">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
            <Sparkles className="h-4.5 w-4.5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">AI DDL Translation Suite</h3>
            <p className="text-[11px] text-slate-500">Generate instantly compiled deployment scripts</p>
          </div>
        </div>

        <p className="text-xs text-slate-500 mb-5 leading-relaxed">
          Render target scripts in SQL Server syntax or native Dataverse XML Custom Schema Definition Language (CSDL) format using our pre-grounded high performance models.
        </p>

        {/* Translation action buttons */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            onClick={() => generateAITranslation("sql")}
            disabled={loadingAI}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-xs font-bold transition-all ${
              aiAction === "sql" && aiOutput
                ? "bg-blue-50 border-blue-500 text-blue-700 shadow-xs"
                : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 shadow-2xs"
            } disabled:opacity-50 cursor-pointer`}
          >
            <Terminal className="h-4 w-4 text-blue-600" /> SQL Server DDL
          </button>
          <button
            onClick={() => generateAITranslation("csdl")}
            disabled={loadingAI}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-xs font-bold transition-all ${
              aiAction === "csdl" && aiOutput
                ? "bg-blue-50 border-blue-500 text-blue-700 shadow-xs"
                : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 shadow-2xs"
            } disabled:opacity-50 cursor-pointer`}
          >
            <Code2 className="h-4 w-4 text-blue-600" /> Dataverse CSDL XML
          </button>
        </div>

        {/* Custom prompt contextual overrides */}
        <div className="mb-5">
          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Additional Translation Controls (Optional)</label>
          <input
            type="text"
            placeholder="e.g. Include foreign key constraints, or add default tenant comments"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
          />
        </div>

        {/* Output console */}
        <div className="flex-1 flex flex-col min-h-[250px] bg-slate-900 rounded-xl border border-slate-800 overflow-hidden relative shadow-md">
          {loadingAI ? (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center z-10">
              <div className="h-7 w-7 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-3.5" />
              <p className="text-xs font-bold text-blue-400 uppercase tracking-widest animate-pulse">Running compilation...</p>
              <p className="text-[10px] text-slate-500 max-w-[240px] mt-1">
                Parsing ERD models to create strict entity definitions.
              </p>
            </div>
          ) : aiOutput ? (
            <div className="flex flex-col h-full">
              <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex justify-between items-center text-[10px]">
                <span className="font-mono text-emerald-400 font-bold tracking-wider">{aiAction.toUpperCase()} script</span>
                <button
                  onClick={handleCopyAIOutput}
                  className="text-slate-300 hover:text-white font-semibold underline flex items-center gap-1"
                >
                  Copy Script Output
                </button>
              </div>
              <textarea
                readOnly
                value={aiOutput}
                className="flex-1 w-full p-4 bg-transparent resize-none focus:outline-none text-emerald-400 font-mono text-xs leading-relaxed"
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-6 text-center">
              <Code className="h-7 w-7 text-slate-700 mb-2" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Empty Script Console</p>
              <p className="text-[11px] text-slate-500 max-w-[210px] mt-1">
                Select a target type above to compile your schema definitions dynamically.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
