import re
import pymupdf

def clean_cost(val):
    return str(val).replace(',', '').strip('()')

def parse_pdf(pdf_path):
    doc = pymupdf.open(pdf_path)
    lines = []
    for page in doc:
        text = page.get_text("text")
        if text:
            lines.extend([l.strip() for l in text.split('\n') if l.strip()])
    
    projects = []
    current_section = "Unknown"
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        if "Ministry-wise Ongoing Projects" in line:
            current_section = "Ministry"
        elif "State-wise" in line or "State-Wise" in line:
            current_section = "State"
        elif "Completed Projects During Month" in line or line == "Completed Projects":
            current_section = "Completed"
        elif "Newly Added Projects" in line:
            current_section = "Newly Added"
        elif "All Ongoing Projects" in line and current_section != "Completed" and current_section != "Newly Added":
            current_section = "Ongoing"
            
        if current_section in ["Ongoing", "Completed", "Newly Added"]:
            is_proj = False
            project_code = ""
            
            m_ongoing = re.match(r'^\(\d{6}\)$', line)
            m_completed = re.match(r'^\d{6}$', line)
            
            if m_ongoing:
                is_proj = True
                project_code = line.strip('()')
            elif m_completed and current_section == "Completed":
                is_proj = True
                project_code = line.strip()
                
            if is_proj:
                agency = lines[i-1].strip('()')
                
                j = i - 2
                project_name_parts = []
                while j >= 0:
                    if re.match(r'^\d+$', lines[j]) and len(lines[j]) < 5:
                        break
                    if re.match(r'^\(\d{6}\)$', lines[j]) or (current_section == "Completed" and re.match(r'^\d{6}$', lines[j])):
                        break
                    if "Table" in lines[j] or "Projects" in lines[j] or "Total" in lines[j]:
                        break
                    project_name_parts.insert(0, lines[j])
                    j -= 1
                project_name = " ".join(project_name_parts).strip()
                
                # Gather state dynamically
                state_parts = []
                k = i + 1
                while k < len(lines):
                    if re.match(r'^(NA|-|\(-\)|\d{2}/\d{4}|\(\d{2}/\d{4}\))$', lines[k].strip()):
                        break
                    # Also if it's a number, it might be the start of costs (if dates are missing entirely)
                    # But usually dates are not entirely missing.
                    state_parts.append(lines[k])
                    k += 1
                state = " ".join(state_parts).strip()
                
                # Gather dates (usually 4 items)
                dates = []
                while k < len(lines) and len(dates) < 4:
                    if not re.match(r'^(NA|-|\(-\)|\d{2}/\d{4}|\(\d{2}/\d{4}\))$', lines[k].strip()):
                        # We hit something that isn't a date format!
                        break
                    dates.append(lines[k].strip('()'))
                    k += 1
                    
                planned_start_1 = dates[0] if len(dates) > 0 else ""
                planned_start_2 = dates[1] if len(dates) > 1 else ""
                planned_comp_1 = dates[2] if len(dates) > 2 else ""
                planned_comp_2 = dates[3] if len(dates) > 3 else ""
                
                # Gather costs and progress
                original_cost = clean_cost(lines[k]) if k < len(lines) else "0"
                k += 1
                revised_cost = clean_cost(lines[k]) if k < len(lines) else "0"
                k += 1
                expenditure = clean_cost(lines[k]) if k < len(lines) else "0"
                k += 1
                
                if current_section == "Completed":
                    physical_progress = "100"
                else:
                    physical_progress = clean_cost(lines[k]) if k < len(lines) else "0"
                    k += 1
                    
                skip_lines = k - i
                
                if project_code == "108000" or project_code == "705728":
                    print(f"Parsed Project: {project_code}")
                    print(f"Name: {project_name}")
                    print(f"Agency: {agency}")
                    print(f"State: {state}")
                    print(f"Dates: {dates}")
                    print(f"Costs: {original_cost}, {revised_cost}, {expenditure}")
                    print(f"Progress: {physical_progress}")
                    print("-" * 20)
                
                i += skip_lines
                continue
                
        i += 1
        
parse_pdf("2025-26/FlashReport_August_2025.pdf")
