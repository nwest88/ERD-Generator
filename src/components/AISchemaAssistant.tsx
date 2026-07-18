import React, { useState } from "react";
import { Table } from "../types";
import { 
  Sparkles, 
  Send, 
  Lightbulb, 
  RefreshCw, 
  CheckCircle, 
  HelpCircle,
  AlertCircle,
  Code
} from "lucide-react";

interface AISchemaAssistantProps {
  schema: Table[];
  setSchema: (schema: Table[]) => void;
}

export default function AISchemaAssistant({ schema, setSchema }: AISchemaAssistantProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);

  const samplePrompts = [
    {
      title: "Add Feedback Entity",
      text: "Add a CustomerFeedback table with rating and comment, and establish a Many-to-One relationship to Account.",
      action: "modify"
    },
    {
      title: "Add Product Catalog",
      text: "Create a Product entity with listprice and skunumber columns, and add a Many-to-One lookup relationship to Campaign.",
      action: "modify"
    },
    {
      title: "Audit Orphan Tables",
      text: "Analyze this schema. Are there any orphan tables with no relationships? Explain.",
      action: "explain"
    },
    {
      title: "Explain Relationships",
      text: "Provide a high-level explanation of the relationship flow between Campaign, MarketingList, and Consent.",
      action: "explain"
    }
  ];

  const handleAISubmit = async (userPrompt: string, actionType: 'modify' | 'explain') => {
    setLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    setExplanation(null);

    try {
      const res = await fetch("/api/schema/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionType,
          schema: schema,
          prompt: userPrompt
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "An error occurred while calling the AI model.");
      }

      if (actionType === "modify") {
        try {
          const updatedSchema = JSON.parse(data.result);
          if (!Array.isArray(updatedSchema)) {
            throw new Error("AI returned an invalid schema array.");
          }
          setSchema(updatedSchema);
          setSuccessMsg("Dynamics 365 schema successfully modified using Enterprise Copilot!");
          setPrompt("");
        } catch (parseError) {
          console.error("Failed to parse AI modification response as JSON:", data.result);
          setExplanation(data.result);
          setErrorMsg("AI completed the operation but returned a raw response. Please check output log.");
        }
      } else {
        setExplanation(data.result);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to contact the AI solution service.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-100 text-slate-800 p-6 flex flex-col h-full overflow-auto" id="ai-assistant-container">
      <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col">
        
        {/* Title bar */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 shadow-xs">
            <Sparkles className="h-5.5 w-5.5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Dynamics 365 AI Solution Copilot</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Draft relational tables, execute metadata audits, or automatically construct data schemas with high-precision reasoning model.
            </p>
          </div>
        </div>

        {/* Feedback Messages */}
        {successMsg && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl mb-6 text-xs flex items-start gap-2.5 shadow-xs animate-in fade-in">
            <CheckCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-blue-900">Operation Successful</span>
              {successMsg}
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl mb-6 text-xs flex items-start gap-2.5 shadow-xs animate-in fade-in">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-red-900">Execution Error</span>
              {errorMsg}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* LEFT SIDE: Prompt box & suggestions */}
          <div className="flex flex-col gap-5">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Instruct the Copilot</h4>
              <textarea
                placeholder="e.g. Add a ServiceTicket table with customer_id lookup to Account..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full h-32 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 resize-none transition-all"
              />
              <div className="flex justify-end gap-2 mt-3">
                <button
                  onClick={() => handleAISubmit(prompt, "explain")}
                  disabled={loading || !prompt}
                  className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-4 py-2 rounded-lg border border-slate-200 transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  <HelpCircle className="h-3.5 w-3.5 text-slate-500" /> Explain Plan
                </button>
                <button
                  onClick={() => handleAISubmit(prompt, "modify")}
                  disabled={loading || !prompt}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all disabled:opacity-50 cursor-pointer shadow-md"
                >
                  {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Apply Schema Change
                </button>
              </div>
            </div>

            {/* Guided sample queries */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-3 flex items-center gap-1.5">
                <Lightbulb className="h-4 w-4 text-blue-500" /> Preserved Scenarios
              </h4>
              <div className="space-y-2">
                {samplePrompts.map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setPrompt(sample.text);
                      handleAISubmit(sample.text, sample.action as any);
                    }}
                    disabled={loading}
                    className="w-full text-left bg-slate-50/50 hover:bg-blue-50/30 hover:border-blue-200 transition-all p-3 rounded-lg border border-slate-150 flex flex-col gap-1 text-xs group"
                  >
                    <span className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{sample.title}</span>
                    <span className="text-slate-500 text-[11px] truncate w-full">{sample.text}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: Copilot Output block */}
          <div className="flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden min-h-[400px] shadow-sm">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-xs font-bold text-slate-700">Copilot Output Log</span>
              </div>
              <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">gemini-3.5</span>
            </div>

            <div className="flex-1 p-5 relative overflow-auto leading-relaxed text-xs">
              {loading ? (
                <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center p-6 text-center z-10">
                  <div className="h-7 w-7 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3.5" />
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-widest animate-pulse">Analyzing structures...</p>
                  <p className="text-[10px] text-slate-500 max-w-[240px] mt-1">
                    Executing metadata transformations on current workspace entities.
                  </p>
                </div>
              ) : explanation ? (
                <div className="whitespace-pre-wrap text-slate-700 font-sans leading-relaxed text-xs" id="ai-response-text">
                  {explanation}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-16 text-slate-400 text-center p-6 font-sans">
                  <HelpCircle className="h-7 w-7 text-slate-300 mb-2" />
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Awaiting Commands</p>
                  <p className="text-[11px] text-slate-400 max-w-[210px] mt-1 leading-normal">
                    Trigger a preserved scenario or type custom instructions to customize entity structures or query relations.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
