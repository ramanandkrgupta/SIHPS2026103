import sqlite3
import pandas as pd
conn = sqlite3.connect("paimana.db")
print(pd.read_sql("SELECT * FROM Projects LIMIT 1", conn).to_dict(orient="records")[0].keys())
