export interface Column {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isSystem?: boolean;
}

export interface Relationship {
  targetTable: string;
  type: string; // e.g., "ManyToOne", "OneToMany", "ManyToMany"
  navigationProperty?: string;
}

export interface Table {
  logicalName: string;
  displayName: string;
  tags: string[];
  columns: Column[];
  relationships: Relationship[];
}

export interface AppState {
  schema: Table[];
  selectedTable: string | null;
  searchQuery: string;
  selectedTags: string[];
  hideSystemColumns: boolean;
  showRelationshipLines: boolean;
  viewMode: 'erd' | 'table-list' | 'json';
}
