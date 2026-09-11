import fitz
import re
import pandas as pd

pdf_path = "2025-26/FlashReport_August_2025.pdf"

def test_extraction():
    doc = fitz.open(pdf_path)
    all_text = ""
    for page in doc:
        all_text += page.get_text("text") + "\n"

    # Save raw text to see the pattern
    with open("raw_text.txt", "w", encoding="utf-8") as f:
        f.write(all_text)
        
    print("Saved raw text to raw_text.txt")

if __name__ == "__main__":
    test_extraction()
