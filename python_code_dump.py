import os
import sys
from pathlib import Path

def dump_to_md(input_file: str, output_file: str = "code_dump.md"):
    if not os.path.exists(input_file):
        print(f"Error: {input_file} not found.")
        return

    # Read the file containing the list of paths
    with open(input_file, 'r') as f:
        paths = [line.strip() for line in f if line.strip()]

    with open(output_file, 'w', encoding='utf-8') as out:
        out.write("# Codebase Context Dump\n\n")
        
        for path_str in paths:
            file_path = Path(path_str)
            
            if file_path.is_file():
                try:
                    content = file_path.read_text(encoding='utf-8')
                    # Get file extension for markdown syntax highlighting (e.g., 'tsx', 'ts')
                    ext = file_path.suffix.lstrip('.') or 'text'
                    
                    out.write(f"## File: `{file_path}`\n\n")
                    out.write(f"```{ext}\n")
                    out.write(content)
                    # Ensure a trailing newline to prevent markdown formatting breaks
                    if not content.endswith('\n'):
                        out.write('\n')
                    out.write("```\n\n")
                    print(f"✅ Added: {file_path}")
                    
                except Exception as e:
                    print(f"❌ Failed to read {file_path}: {e}")
            else:
                print(f"⚠️  Warning: File not found -> {file_path}")
                
    print(f"\n🎉 Done! Code dumped to {output_file}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python dump_code.py <paths_list.txt> [output.md]")
    else:
        in_file = sys.argv[1]
        out_file = sys.argv[2] if len(sys.argv) > 2 else "code_dump.md"
        dump_to_md(in_file, out_file)
