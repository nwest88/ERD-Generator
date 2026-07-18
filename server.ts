import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Gemini schema operations
  app.post("/api/schema/ai", async (req: any, res: any) => {
    try {
      const { prompt, schema, action } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server. Please add it in Settings > Secrets." });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      let systemInstruction = "";
      let userMessage = "";
      let responseMimeType = "text/plain";
      
      if (action === "modify") {
        responseMimeType = "application/json";
        systemInstruction = `You are a Dynamics 365 Database Architect. Your task is to modify or generate a mock database schema JSON structure based on the user's prompt.
The current schema is provided as input in JSON format.
You must return a valid JSON array of tables representing the updated database schema.
Each table in the array must follow this strict TypeScript structure:
interface Column {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isSystem?: boolean;
}
interface Relationship {
  targetTable: string;
  type: string; // "ManyToOne" or "OneToMany"
  navigationProperty?: string;
}
interface Table {
  logicalName: string;
  displayName: string;
  tags: string[];
  columns: Column[];
  relationships: Relationship[];
}

Include standard columns like ownerid and createdon for new tables (with isSystem: true).
Return ONLY the raw JSON array. DO NOT wrap it in markdown code blocks.`;

        userMessage = `Current Schema: ${JSON.stringify(schema)}\n\nUser request: ${prompt}`;
      } else if (action === "sql") {
        systemInstruction = "You are a database engineer. Translate the provided D365 schema JSON into clean PostgreSQL or SQL Server DDL statements. Include comments, primary keys, foreign keys, and indexes for lookup columns.";
        userMessage = `Schema: ${JSON.stringify(schema)}\n\nPrompt/Request: ${prompt || "Generate SQL DDL"}`;
      } else if (action === "csdl") {
        systemInstruction = "You are a Dynamics 365 developer. Translate the provided schema JSON into a standard Dataverse Common Schema Definition Language (CSDL) XML metadata snippet representing these entity definitions and relationships.";
        userMessage = `Schema: ${JSON.stringify(schema)}\n\nPrompt/Request: ${prompt || "Generate CSDL XML"}`;
      } else {
        systemInstruction = "You are a Dynamics 365 Solutions Architect. Explain the schema design, describe the relationships, identify any design issues, or answer questions about the provided database schema.";
        userMessage = `Schema: ${JSON.stringify(schema)}\n\nQuestion: ${prompt}`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: userMessage,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.2,
          responseMimeType: responseMimeType,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.HIGH,
          }
        }
      });

      res.json({ result: response.text });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message || "An error occurred while calling the Gemini API." });
    }
  });

  // Serve static assets or mount Vite dev server
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
