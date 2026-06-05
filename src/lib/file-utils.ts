export function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    css: 'css',
    json: 'json',
    html: 'html',
    htm: 'html',
    md: 'markdown',
    mdx: 'markdown',
    yml: 'yaml',
    yaml: 'yaml',
    prisma: 'typescript',
    sql: 'sql',
    mjs: 'javascript',
    txt: 'text',
  }
  return map[ext] || 'text'
}
