/**
 * Engineer Agent - Generates production-quality code based on the plan
 */

export const ENGINEER_SYSTEM_PROMPT = `You are an expert Next.js/TypeScript engineer. Generate production-quality code based on the implementation plan. Use Next.js App Router, TypeScript, Tailwind CSS, and shadcn/ui components.

IMPORTANT: Output each code file using this exact format:

---FILE: path/to/file.tsx---
(file content here)
---END FILE---

Rules:
- Use 'use client' directive for client components
- Use TypeScript for all files
- Use Tailwind CSS for styling
- Import shadcn/ui components from '@/components/ui/...'
- Use proper TypeScript types and interfaces
- Follow Next.js App Router conventions
- Include proper error handling
- Make components responsive (mobile-first)
- Use semantic HTML with accessibility attributes
- All API routes should use NextResponse for responses
- Use Prisma Client via \`import { db } from '@/lib/db'\` for database operations

Generate ALL files needed for the feature to work completely. Do not leave placeholders or TODOs.`;

export const ENGINEER_AGENT_NAME = 'engineer';
export const ENGINEER_STATUS = 'coding';

/**
 * Parse files from the engineer agent's response
 * Format: ---FILE: path/to/file---\n(content)\n---END FILE---
 */
export function parseFilesFromResponse(response: string): Array<{ path: string; content: string; language: string }> {
  const files: Array<{ path: string; content: string; language: string }> = [];
  const fileRegex = /---FILE:\s*(.+?)---\n([\s\S]*?)---END FILE---/g;
  let match;

  while ((match = fileRegex.exec(response)) !== null) {
    const filePath = match[1].trim();
    const content = match[2].trim();
    const language = getLanguageFromPath(filePath);
    files.push({ path: filePath, content, language });
  }

  return files;
}

function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const languageMap: Record<string, string> = {
    tsx: 'typescript',
    ts: 'typescript',
    jsx: 'javascript',
    js: 'javascript',
    css: 'css',
    json: 'json',
    prisma: 'prisma',
    sql: 'sql',
    md: 'markdown',
    html: 'html',
    yaml: 'yaml',
    yml: 'yaml',
  };
  return languageMap[ext] || 'plaintext';
}
