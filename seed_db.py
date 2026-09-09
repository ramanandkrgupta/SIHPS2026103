import sqlite3
import pandas as pd
import os

DB_PATH = "paimana.db"
SNAPSHOTS_CSV = "output/canonical_snapshots.csv"
PROJECTS_CSV = "output/canonical_projects.csv"

def main():
    print(f"Connecting to SQLite database at {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    
    if os.path.exists(SNAPSHOTS_CSV):
        print(f"Loading {SNAPSHOTS_CSV} into SQLite...")
        df_snapshots = pd.read_csv(SNAPSHOTS_CSV)
        # We will create a table called 'project_snapshots'
        df_snapshots.to_sql('project_snapshots', conn, if_exists='replace', index=False)
        print(f"Successfully loaded {len(df_snapshots)} snapshots.")
        
        # Create an index on project_id for fast lookup
        conn.execute("CREATE INDEX IF NOT EXISTS idx_project_id ON project_snapshots (project_id)")
    else:
        print(f"Warning: {SNAPSHOTS_CSV} not found.")

    if os.path.exists(PROJECTS_CSV):
        print(f"Loading {PROJECTS_CSV} into SQLite...")
        df_projects = pd.read_csv(PROJECTS_CSV)
        # Create 'projects' table
        df_projects.to_sql('projects', conn, if_exists='replace', index=False)
        print(f"Successfully loaded {len(df_projects)} projects.")
    else:
        print(f"Warning: {PROJECTS_CSV} not found.")
        
    conn.commit()
    conn.close()
    print("Database seeding complete!")

if __name__ == "__main__":
    main()
