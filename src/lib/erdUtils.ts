import { Table } from "../types";

// Standard system columns to exclude from ERD diagram to reduce layout noise
export const SYSTEM_COLUMNS_TO_EXCLUDE = new Set([
  'createdon', 'modifiedon', 'createdby', 'modifiedby', 
  'ownerid', 'statecode', 'statuscode', 'importsequencenumber',
  'overriddencreatedon', 'utcconversiontimezonecode', 'timezoneruleversionnumber',
  'versionnumber'
]);

/**
 * Normalizes a string identifier so that it is safe for Mermaid.js syntax.
 */
export function sanitizeMermaidId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase().trim();
}

/**
 * Filters the schema to include only tables that have at least one of the selected tags.
 * If selectedTags is empty, returns all tables.
 */
export function filterSchemaByTags(schema: Table[], selectedTags: string[]): Table[] {
  if (!selectedTags || selectedTags.length === 0) {
    return schema;
  }
  
  const normalizedSelected = new Set(selectedTags.map(t => t.toLowerCase().trim()));
  
  return schema.filter(table => {
    const tableTags = (table.tags || []).map(t => t.toLowerCase().trim());
    return tableTags.some(tag => normalizedSelected.has(tag));
  });
}

/**
 * Returns a sorted, unique list of all tags present in the schema.
 */
export function getAllTags(schema: Table[]): string[] {
  const tagsSet = new Set<string>();
  schema.forEach(table => {
    if (Array.isArray(table.tags)) {
      table.tags.forEach(tag => {
        if (tag && tag.trim()) {
          tagsSet.add(tag.trim());
        }
      });
    }
  });
  return Array.from(tagsSet).sort();
}

/**
 * Generates Mermaid.js erDiagram representation for the provided schema subset.
 */
export function generateMermaidCode(filteredSchema: Table[]): string {
  const visibleTables = new Set(filteredSchema.map(t => t.logicalName.toLowerCase().trim()));
  
  const lines: string[] = ["erDiagram"];
  
  // 1. Define entities and their attributes
  filteredSchema.forEach(table => {
    const safeName = sanitizeMermaidId(table.logicalName);
    lines.push(`    ${safeName} {`);
    
    const columns = table.columns || [];
    columns.forEach(col => {
      const colName = col.name.toLowerCase().trim();
      
      // Exclude primary system columns & user-flagged system columns
      if (col.isSystem || SYSTEM_COLUMNS_TO_EXCLUDE.has(colName)) {
        return;
      }
      
      const colType = (col.type || "String").replace(/\s+/g, "_");
      const pkLabel = col.isPrimaryKey ? "PK" : "";
      
      lines.push(`        ${colType} ${colName} ${pkLabel}`);
    });
    
    lines.push("    }");
  });
  
  lines.push(""); // Spacing line
  
  // 2. Define relationships (Only link if both source and target exist)
  const drawnRelationships = new Set<string>();
  
  filteredSchema.forEach(table => {
    const sourceName = table.logicalName.toLowerCase().trim();
    const safeSource = sanitizeMermaidId(table.logicalName);
    
    const relationships = table.relationships || [];
    relationships.forEach(rel => {
      const targetName = rel.targetTable.toLowerCase().trim();
      const safeTarget = sanitizeMermaidId(rel.targetTable);
      
      // Only draw relationship lines if BOTH source and target exist in current filtered selection
      if (visibleTables.has(targetName)) {
        const navProp = rel.navigationProperty || "relates_to";
        const cleanNavProp = navProp.replace(/[^a-zA-Z0-9_]/g, "_");
        
        // Ensure a unique relationship key to prevent duplicates
        const relKey = `${sourceName}-${targetName}-${cleanNavProp}`;
        
        if (!drawnRelationships.has(relKey)) {
          // Standard Dynamics 365 relationship: Target (One) to Source (Many)
          // Expressed as: Target ||--o{ Source : navProp
          lines.push(`    ${safeTarget} ||--o{ ${safeSource} : "${cleanNavProp}"`);
          drawnRelationships.add(relKey);
        }
      }
    });
  });
  
  return lines.join("\n");
}
