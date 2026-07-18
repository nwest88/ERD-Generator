import json
import os
from typing import List, Dict, Any, Set

def load_schema(filepath: str) -> List[Dict[str, Any]]:
    """
    Loads the D365 schema from a JSON file.
    
    Args:
        filepath (str): Path to the schema.json file.
        
    Returns:
        List[Dict[str, Any]]: The parsed schema JSON.
    """
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Schema file not found at: {filepath}")
        
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_schema(schema: List[Dict[str, Any]], filepath: str) -> None:
    """
    Saves the updated schema back to the JSON file. This supports features like
    Admins updating table tags or configuring custom metadata attributes.
    
    Args:
        schema (List[Dict[str, Any]]): The schema dataset to save.
        filepath (str): Path where the JSON should be written.
    """
    # Create directory if it doesn't exist
    directory = os.path.dirname(filepath)
    if directory and not os.path.exists(directory):
        os.makedirs(directory)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(schema, f, indent=2)

def get_all_tags(schema: List[Dict[str, Any]]) -> List[str]:
    """
    Gathers and returns a unique, sorted list of all area tags found across
    all tables in the database schema.
    
    Args:
        schema (List[Dict[str, Any]]): The full database schema.
        
    Returns:
        List[str]: A sorted list of unique tags (e.g. ['Core CRM', 'Sales']).
    """
    tags_set: Set[str] = set()
    for table in schema:
        # Tables might have a tags array
        tags = table.get("tags", [])
        for tag in tags:
            if tag:
                tags_set.add(tag.strip())
                
    return sorted(list(tags_set))

def filter_schema_by_tags(schema: List[Dict[str, Any]], selected_tags: List[str]) -> List[Dict[str, Any]]:
    """
    Filters the tables in the schema, returning only tables containing ANY of the selected tags.
    If no tags are specified, returns the original schema unchanged.
    
    Args:
        schema (List[Dict[str, Any]]): The full database schema.
        selected_tags (List[str]): The area tags chosen to filter by.
        
    Returns:
        List[Dict[str, Any]]: The subset of tables matching the specified tags.
    """
    if not selected_tags:
        return schema
        
    normalized_selected = {t.lower().strip() for t in selected_tags}
    filtered_tables = []
    
    for table in schema:
        table_tags = {t.lower().strip() for t in table.get("tags", [])}
        # Check if there is any intersection
        if table_tags.intersection(normalized_selected):
            filtered_tables.append(table)
            
    return filtered_tables

def generate_mermaid(filtered_schema: List[Dict[str, Any]]) -> str:
    """
    Generates Mermaid.js erDiagram representation for the provided schema subset.
    
    Rule Requirements:
    1. EXCLUDES standard D365 system columns (e.g. createdon, ownerid) to minimize layout noise.
    2. ONLY draws relationships if BOTH the source and target tables exist in the filtered schema.
    3. Uses standard Crow's foot notation (e.g. `source ||--o{ target : rel_name`).
    
    Args:
        filtered_schema (List[Dict[str, Any]]): The filtered list of tables to include.
        
    Returns:
        str: Standard Mermaid.js erDiagram code block.
    """
    # Standard system columns to exclude from diagram
    SYSTEM_COLUMNS_TO_EXCLUDE = {
        'createdon', 'modifiedon', 'createdby', 'modifiedby', 
        'ownerid', 'statecode', 'statuscode', 'importsequencenumber',
        'overriddencreatedon', 'utcconversiontimezonecode', 'timezoneruleversionnumber',
        'versionnumber'
    }
    
    # Store visible logical names to verify target existence (prevents broken link errors in Mermaid)
    visible_tables: Set[str] = {t["logicalName"].lower().strip() for t in filtered_schema}
    
    lines = ["erDiagram"]
    
    # 1. Define entities and their filtered attributes
    for table in filtered_schema:
        logical_name = table["logicalName"].lower().strip()
        display_name = table.get("displayName", table["logicalName"])
        
        # Open entity declaration block
        # Note: Mermaid entities cannot contain spaces or special characters in their name declarations,
        # so we use the safe logicalName as the identifier. We add custom comments or keep them compact.
        lines.append(f"    {logical_name} {{")
        
        for col in table.get("columns", []):
            col_name = col["name"].lower().strip()
            col_type = col.get("type", "String")
            is_pk = col.get("isPrimaryKey", False)
            is_system = col.get("isSystem", False)
            
            # Exclude standard D365 system attributes & user exclusion list
            if is_system or col_name in SYSTEM_COLUMNS_TO_EXCLUDE:
                continue
                
            # Formatting key labels
            key_label = "PK" if is_pk else ""
            
            # Append column line format: type name key
            lines.append(f"        {col_type} {col_name} {key_label}")
            
        lines.append("    }")
    
    lines.append("") # Spacer
    
    # 2. Define relationships (Only link if both source and target exist)
    drawn_relationships: Set[str] = set() # Prevent duplicate links
    
    for table in filtered_schema:
        source_name = table["logicalName"].lower().strip()
        
        for rel in table.get("relationships", []):
            target_name = rel["targetTable"].lower().strip()
            
            # Only connect if target table is present in current subset
            if target_name in visible_tables:
                nav_prop = rel.get("navigationProperty", "relates_to")
                
                # Sort endpoints to uniquely identify this link to prevent duplicate visual rendering
                link_key = tuple(sorted([source_name, target_name]))
                relationship_signature = f"{source_name}-{target_name}-{nav_prop}"
                
                if relationship_signature not in drawn_relationships:
                    # D365 relationship types: standard is Many-to-One (Lookup attribute)
                    # Represented as: Target (One) ||--o{ Source (Many)
                    # We express this in standard Crow's Foot syntax:
                    lines.append(f"    {target_name} ||--o{{ {source_name} : \"{nav_prop}\"")
                    drawn_relationships.add(relationship_signature)
                    
    return "\n".join(lines)


# Example usage for testing and validation
if __name__ == "__main__":
    # Setup test mock data file
    schema_filepath = "src/data/schema.json"
    
    print("--- D365 ERD Backend Logic Test Suite ---")
    try:
        # Load schema
        schema_data = load_schema(schema_filepath)
        print(f"Loaded {len(schema_data)} entities from schema.json successfully.")
        
        # Test Get Tags
        all_tags = get_all_tags(schema_data)
        print(f"Discovered Tags: {all_tags}")
        
        # Test Filter by Tag
        test_tags = ["Marketing"]
        filtered = filter_schema_by_tags(schema_data, test_tags)
        print(f"Filtered to '{test_tags}': {len(filtered)} tables found.")
        
        # Test Mermaid generation on filtered subset
        mermaid_diagram = generate_mermaid(filtered)
        print("\nGenerated Mermaid.js ERD:")
        print("=========================")
        print(mermaid_diagram)
        print("=========================")
        
    except FileNotFoundError:
        print(f"No local schema.json detected at {schema_filepath}. Creating mock and trying again...")
        # Fallback placeholder to verify functional correctness without throwing crashes
        mock_schema = [
            {
                "logicalName": "account",
                "displayName": "Account",
                "tags": ["Core CRM"],
                "columns": [
                    { "name": "accountid", "type": "Uniqueidentifier", "isPrimaryKey": True, "isSystem": False },
                    { "name": "name", "type": "String", "isPrimaryKey": False, "isSystem": False },
                    { "name": "ownerid", "type": "Lookup", "isPrimaryKey": False, "isSystem": True }
                ],
                "relationships": []
            },
            {
                "logicalName": "contact",
                "displayName": "Contact",
                "tags": ["Core CRM", "Marketing"],
                "columns": [
                    { "name": "contactid", "type": "Uniqueidentifier", "isPrimaryKey": True, "isSystem": False },
                    { "name": "parentcustomerid", "type": "Lookup", "isPrimaryKey": False, "isSystem": False },
                    { "name": "firstname", "type": "String", "isPrimaryKey": False, "isSystem": False },
                    { "name": "lastname", "type": "String", "isPrimaryKey": False, "isSystem": False },
                    { "name": "createdon", "type": "DateTime", "isPrimaryKey": False, "isSystem": True }
                ],
                "relationships": [
                    { "targetTable": "account", "type": "ManyToOne", "navigationProperty": "parentcustomerid_account" }
                ]
              }
        ]
        
        # Test Save
        save_schema(mock_schema, "src/data/temp_test_schema.json")
        print("Saved mock test database subset successfully to src/data/temp_test_schema.json.")
        
        # Run filters & mermaid tests on mock
        tags = get_all_tags(mock_schema)
        print(f"Mock Tags: {tags}")
        filtered_mock = filter_schema_by_tags(mock_schema, ["Marketing"])
        print(f"Filtered Mock: {generate_mermaid(filtered_mock)}")
        
        # Clean up temporary test file
        if os.path.exists("src/data/temp_test_schema.json"):
            os.remove("src/data/temp_test_schema.json")
