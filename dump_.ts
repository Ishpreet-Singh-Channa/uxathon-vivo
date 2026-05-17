import * as fs from 'fs';
import * as path from 'path';

// --- Configuration ---
const EXCLUDED_DIRS: string[] = ['node_modules', '.next', '.git', 'out', 'build', 'public'];
const ALLOWED_EXTENSIONS: string[] = ['.ts', '.tsx', '.js', '.jsx', '.css', '.json'];
const EXCLUDED_FILES: string[] = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];
const OUTPUT_FILE: string = 'project-code-dump.md'; // Updated to .md

// Helper to map file extensions to Markdown language tags for syntax highlighting
const getMarkdownLang = (ext: string): string => {
  const langMap: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'tsx',
    '.js': 'javascript',
    '.jsx': 'jsx',
    '.css': 'css',
    '.json': 'json',
  };
  return langMap[ext] || '';
};

/**
 * Recursively walks through the directory and dumps code into a single Markdown file.
 */
function generateCodeDump(rootDir: string, outputFile: string): void {
  const outputPath = path.join(rootDir, outputFile);

  // Clear previous dump if it exists
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
  }

  // Write the initial document header
  fs.writeFileSync(outputPath, '# Project Code Dump\n\n', 'utf-8');

  function walk(currentDir: string): void {
    const files: string[] = fs.readdirSync(currentDir);

    for (const file of files) {
      const filePath: string = path.join(currentDir, file);
      const stats: fs.Stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        if (!EXCLUDED_DIRS.includes(file)) {
          walk(filePath);
        }
      } else {
        const ext: string = path.extname(file);
        const fileName: string = path.basename(filePath);

        // Filter files to include
        const isAllowedExtension = ALLOWED_EXTENSIONS.includes(ext);
        const isExcludedFile = EXCLUDED_FILES.includes(fileName);
        const isOutputFile = fileName === OUTPUT_FILE;

        if (isAllowedExtension && !isExcludedFile && !isOutputFile) {
          try {
            const content: string = fs.readFileSync(filePath, 'utf-8');
            const relativePath: string = path.relative(rootDir, filePath);
            const langTag: string = getMarkdownLang(ext);
            
            // Format the output as proper Markdown with headers and syntax-highlighted code blocks
            const markdownBlock = `### File: \`${relativePath}\`\n\n\`\`\`${langTag}\n${content}\n\`\`\`\n\n---\n\n`;
            
            fs.appendFileSync(outputPath, markdownBlock, 'utf-8');
          } catch (err) {
            console.error(`⚠️ Skipped ${filePath} due to read error.`);
          }
        }
      }
    }
  }

  console.log('Generating Markdown code dump...');
  walk(rootDir);
  console.log(`✅ Markdown code dump successfully generated at: ./${outputFile}`);
}

// Execute the script
generateCodeDump(process.cwd(), OUTPUT_FILE);
