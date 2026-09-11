import sqlite3

def classify_sector(name, agency):
    name = str(name).lower()
    agency = str(agency).lower()
    
    if 'rail' in agency or 'rail' in name or 'nwr' in agency:
        if 'metro' in name or 'metro' in agency:
            return 'Metro Rail'
        return 'Railways'
    elif 'nhai' in agency or 'road' in name or 'highway' in name:
        return 'Highways'
    elif 'power' in agency or 'thermal' in name or 'ntpc' in agency or 'grid' in agency or 'energy' in agency:
        return 'Power & Energy'
    elif 'telecom' in agency or 'dot' in agency or 'bharatnet' in name:
        return 'Telecommunications'
    elif 'coal' in agency or 'cil' in agency or 'ecl' in agency or 'ccl' in agency:
        return 'Coal & Mining'
    elif 'airport' in agency or 'aai' in agency:
        return 'Aviation'
    elif 'oil' in agency or 'petroleum' in agency or 'iocl' in agency or 'gas' in name:
        return 'Petroleum & Natural Gas'
    elif 'steel' in agency or 'sail' in agency:
        return 'Steel'
    elif 'port' in name or 'port' in agency or 'shipping' in agency:
        return 'Ports & Shipping'
    elif 'water' in name or 'sanitation' in name or 'irrigation' in name:
        return 'Urban Water & Sanitation'
    else:
        return 'Other Infrastructure'

def run():
    conn = sqlite3.connect('paimana.db')
    cursor = conn.cursor()
    cursor.execute("SELECT project_id, project_name, implementing_agency FROM Projects")
    rows = cursor.fetchall()
    
    updates = []
    for row in rows:
        pid, name, agency = row
        sector = classify_sector(name, agency)
        updates.append((sector, pid))
        
    cursor.executemany("UPDATE Projects SET sector = ? WHERE project_id = ?", updates)
    conn.commit()
    print(f"Updated {len(updates)} projects with assigned sectors.")
    
    cursor.execute("SELECT DISTINCT sector FROM Projects")
    print("New Sectors:", [r[0] for r in cursor.fetchall()])
    
    conn.close()

if __name__ == '__main__':
    run()
