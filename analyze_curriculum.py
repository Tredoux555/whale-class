import pandas as pd

file_path = "/Users/tredouxwillemse/Desktop/ACTIVE/whale/CVC_Curriculum_English V3.xlsx"
xls = pd.ExcelFile(file_path)

# Set pandas options for full display
pd.set_option('display.max_rows', None)
pd.set_option('display.max_columns', None)
pd.set_option('display.width', None)
pd.set_option('display.max_colwidth', None)

# Open output file
with open('/Users/tredouxwillemse/Desktop/ACTIVE/whale/curriculum_analysis.txt', 'w') as f:
    f.write("=" * 100 + "\n")
    f.write("EXCEL FILE ANALYSIS: CVC_Curriculum_English V3.xlsx\n")
    f.write("=" * 100 + "\n")
    
    # Get information about each sheet
    for sheet_name in xls.sheet_names:
        df = pd.read_excel(file_path, sheet_name=sheet_name)
        f.write(f"\n{'='*100}\n")
        f.write(f"SHEET: {sheet_name}\n")
        f.write(f"Shape: {df.shape[0]} rows x {df.shape[1]} columns\n")
        f.write(f"Columns: {list(df.columns)}\n")
        f.write('='*100 + "\n")
        
        # Show data
        if df.shape[0] <= 200:
            f.write(f"\nFull data for '{sheet_name}':\n")
            f.write(df.to_string())
        else:
            f.write(f"\nFirst 50 rows (sheet has {df.shape[0]} total rows):\n")
            f.write(df.head(50).to_string())
            f.write(f"\n... ({df.shape[0] - 50} more rows) ...\n")
        
        f.write("\n\n")

print("Analysis complete. Output written to curriculum_analysis.txt")
