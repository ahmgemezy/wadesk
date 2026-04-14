export function extractVariables(body: string): string[] {
  const matches = body.matchAll(/\{\{(\w+)\}\}/g);
  return [...new Set([...matches].map((m) => m[1].toLowerCase()))];
}

export function renderTemplate(body: string, values: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key.toLowerCase()] ?? `{{${key}}}`);
}
