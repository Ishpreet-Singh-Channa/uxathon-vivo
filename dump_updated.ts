import * as fs from 'fs';
import * as path from 'path';

// --- Configuration ---
const EXCLUDED_DIRS: string[] = [
  'node_modules',
  '.next',
  '.git',
  'out',
  'build',
  'public',
  '.antigravitycli', // <- added
];

const ALLOWED_EXTENSIONS: string[] = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.css',
  '.json',
];

const EXCLUDED_FILES: string[] = [
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
];

const OUTPUT_FILE: string = 'project-code-dump.md';

// Helper to map file extensions to Markdown language tags
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

  // Clear previous dump
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
  }

  // Write initial markdown header
  fs.writeFileSync(outputPath, '# Project Code Dump\n\n', 'utf-8');

  function walk(currentDir: string): void {
    let files: string[];

    // Safely read directory
    try {
      files = fs.readdirSync(currentDir);
    } catch (err) {
      console.error(`⚠️ Failed to read directory: ${currentDir}`);
      return;
    }

    for (const file of files) {
      const filePath: string = path.join(currentDir, file);

      let stats: fs.Stats;

      // Safely stat file
      try {
        stats = fs.statSync(filePath);
      } catch (err) {
        console.warn(`⚠️ Skipping missing/inaccessible file: ${filePath}`);
        continue;
      }

      // Handle directories
      if (stats.isDirectory()) {
        if (!EXCLUDED_DIRS.includes(file)) {
          walk(filePath);
        }

        continue;
      }

      const ext: string = path.extname(file);
      const fileName: string = path.basename(filePath);

      const isAllowedExtension = ALLOWED_EXTENSIONS.includes(ext);
      const isExcludedFile = EXCLUDED_FILES.includes(fileName);
      const isOutputFile = fileName === OUTPUT_FILE;

      if (!isAllowedExtension || isExcludedFile || isOutputFile) {
        continue;
      }

      try {
        const content: string = fs.readFileSync(filePath, 'utf-8');
        const relativePath: string = path.relative(rootDir, filePath);
        const langTag: string = getMarkdownLang(ext);

        const markdownBlock = `### File: \`${relativePath}\`\n\n\`\`\`${langTag}
${content}
\`\`\`\n\n---\n\n`;

        fs.appendFileSync(outputPath, markdownBlock, 'utf-8');
      } catch (err) {
        console.error(`⚠️ Skipped ${filePath} due to read error.`);
      }
    }
  }

  console.log('Generating Markdown code dump...');
  walk(rootDir);
  console.log(`✅ Markdown code dump successfully generated at: ./${outputFile}`);
}

// Execute the script
generateCodeDump(process.cwd(), OUTPUT_FILE);
