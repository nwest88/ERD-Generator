import React, { useState, useEffect, useRef } from "react";
import { Table } from "../types";
import { 
  Sparkles, 
  Copy, 
  Check, 
  HelpCircle, 
  RefreshCw, 
  Filter, 
  Maximize2,
  FileText
} from "lucide-react";

interface DiagramViewerProps {
  schema: Table[];
}

export default function DiagramViewer({ schema }: DiagramViewerProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [mermaidCode, setMermaidCode] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const chartRef = useRef<HTMLDivElement>(null);

  // 1. Load available tags dynamically from current schema
  useEffect(() => {
    const tagsSet = new Set<string>();
    schema.forEach(table => {
      if (Array.isArray(table.tags)) {
        table.tags.forEach(tag => {
          if (tag) tagsSet.add(tag.trim());
        });
      }
    });
    const sortedTags = Array.from(tagsSet).sort();
    setAvailableTags(sortedTags);
    
    // Default select all tags initially
    setSelectedTags(sortedTags);
  }, [schema]);

  // 2. Load the Mermaid CDN script
  useEffect(() => {
    const scriptId = "mermaid-cdn-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement;
    
    const initMermaid = () => {
      if ((window as any).mermaid) {
        (window as any).mermaid.initialize({
          startOnLoad: false,
          theme: "forest",
          securityLevel: "loose",
          er: {
            useWidth: 800,
            direction: "LR"
          }
        });
      }
    };

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js";
      script.async = true;
      script.onload = () => {
        initMermaid();
        fetchMermaidCode();
      };
      document.body.appendChild(script);
    } else {
      initMermaid();
      fetchMermaidCode();
    }
  }, []);

  // 3. Fetch Mermaid code from backend when selectedTags changes
  const fetchMermaidCode = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/schema/mermaid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: selectedTags })
      });
      const data = await response.json();
      if (response.ok) {
        setMermaidCode(data.mermaid || "erDiagram\n");
      } else {
        setError(data.error || "Failed to generate diagram.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to contact diagram service.");
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetch when tags change
  useEffect(() => {
    if (availableTags.length > 0) {
      fetchMermaidCode();
    }
  }, [selectedTags, availableTags]);

  // 4. Render Mermaid whenever mermaidCode changes
  useEffect(() => {
    if (chartRef.current && (window as any).mermaid && mermaidCode) {
      try {
        chartRef.current.removeAttribute("data-processed");
        chartRef.current.innerHTML = mermaidCode;
        (window as any).mermaid.run({
          nodes: [chartRef.current]
        });
      } catch (err: any) {
        console.error("Mermaid run error:", err);
      }
    }
  }, [mermaidCode]);

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(mermaidCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 bg-slate-50 text-slate-800 flex flex-col lg:flex-row h-full overflow-hidden" id="diagram-viewer-root">
      
      {/* FILTER PANEL - Left side on desktop */}
      <aside className="w-full lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 p-4 flex flex-col shrink-0 z-10 shadow-sm overflow-y-auto">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-blue-600" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Functional Groupings</h3>
        </div>

        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
          Select D365 area modules to visualize on the dynamic Crow's Foot diagram.
        </p>

        <div className="space-y-2">
          {availableTags.map(tag => {
            const isChecked = selectedTags.includes(tag);
            return (
              <label 
                key={tag} 
                className="flex items-center gap-2.5 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                id={`filter-tag-${tag.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleTagToggle(tag)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <span className={`text-xs ${isChecked ? "font-semibold text-slate-800" : "text-slate-600"}`}>
                  {tag}
                </span>
              </label>
            );
          })}
          {availableTags.length === 0 && (
            <p className="text-xs text-slate-400 italic">No tags defined in schema.</p>
          )}
        </div>

        {availableTags.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
            <button
              onClick={() => setSelectedTags(availableTags)}
              className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold uppercase tracking-wider"
            >
              Select All
            </button>
            <span className="text-slate-300 text-[10px]">•</span>
            <button
              onClick={() => setSelectedTags([])}
              className="text-[10px] text-slate-500 hover:text-slate-800 font-semibold uppercase tracking-wider"
            >
              Clear All
            </button>
          </div>
        )}
      </aside>

      {/* DIAGRAM PANEL - Central / Right side */}
      <section className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 relative p-6">
        
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center z-20 transition-opacity">
            <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mb-2" />
            <span className="text-xs font-semibold text-slate-600">Generating Mermaid script...</span>
          </div>
        )}

        {/* Diagram Area */}
        <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm relative min-h-[300px]">
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-150 flex items-center justify-between shrink-0">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Crow's Foot ERD Sandbox</span>
            <button 
              onClick={fetchMermaidCode}
              className="text-slate-500 hover:text-blue-600 transition-colors p-1"
              title="Refresh Diagram"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-auto p-8 flex items-center justify-center bg-slate-50/50 relative">
            {error ? (
              <div className="text-center p-6 text-red-600 max-w-sm">
                <p className="text-xs font-bold uppercase mb-1">Diagram Render Failed</p>
                <p className="text-xs text-slate-500">{error}</p>
              </div>
            ) : selectedTags.length === 0 ? (
              <div className="text-center p-6 text-slate-400">
                <HelpCircle className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-semibold">Select functional groupings on the left sidebar to generate the ERD.</p>
              </div>
            ) : (
              <div 
                id="mermaid-chart"
                ref={chartRef}
                className="mermaid transition-all duration-300 scale-100 origin-center"
              >
                {mermaidCode}
              </div>
            )}
          </div>
        </div>

        {/* EXPORT & SHARING SECTION */}
        <div className="mt-5 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Mermaid.js DDL Specification</h4>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs px-3 py-1.5 rounded-lg border border-slate-200 transition-all font-semibold shadow-xs"
              id="copy-mermaid-btn"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5 text-slate-500" />}
              {copied ? "Copied!" : "Copy Code"}
            </button>
          </div>

          {/* Formatted Code Block */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 font-mono text-[11px] text-emerald-400 max-h-32 overflow-y-auto mb-4">
            <pre className="whitespace-pre-wrap">{mermaidCode}</pre>
          </div>

          {/* Informational Text Box for Visio export */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3.5 text-[11px] text-slate-700 leading-relaxed flex items-start gap-2.5">
            <HelpCircle className="h-4.5 w-4.5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-blue-900 block mb-0.5">Visio Export Instructions</span>
              {"To export as a native Visio file: Click the copy button on the code below, open Draw.io (app.diagrams.net), go to Arrange -> Insert -> Advanced -> Mermaid, paste the code, and then select File -> Export as -> Visio (.vsdx)."}
            </div>
          </div>
        </div>

      </section>
    </div>
  );
}
