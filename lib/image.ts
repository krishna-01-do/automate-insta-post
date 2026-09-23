type Template = { background: string; foreground: string; accent: string };

const TEMPLATES: Template[] = [
  { background: "#FFFFFF", foreground: "#101010", accent: "#101010" },
  { background: "#111111", foreground: "#FFFFFF", accent: "#FFFFFF" },
  { background: "#F4EFE6", foreground: "#24211D", accent: "#C56A43" },
  { background: "#ECECEC", foreground: "#151515", accent: "#777777" },
  { background: "#F6E8DD", foreground: "#271D18", accent: "#A64B32" },
];

const escapeXml = (value: string) => value.replace(/[<>&"']/g, (character) => ({
  "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;",
}[character] as string));

function selectFontSize(length: number): number {
  if (length <= 45) return 76;
  if (length <= 85) return 66;
  if (length <= 130) return 56;
  return 48;
}

export function wrapQuote(quote: string, fontSize: number): string[] {
  const maxCharacters = Math.max(16, Math.floor(820 / (fontSize * 0.54)));
  const words = quote.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxCharacters && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function createQuoteSvg(quote: string, _category: string, templateIndex = 0): string {
  const template = TEMPLATES[Math.abs(templateIndex) % TEMPLATES.length];
  const fontSize = selectFontSize(quote.length);
  const lines = wrapQuote(quote, fontSize);
  const lineHeight = Math.round(fontSize * 1.24);
  const totalHeight = lines.length * lineHeight;
  const startY = 675 - totalHeight / 2 + fontSize * 0.8;
  const text = lines.map((line, index) =>
    `<text x="540" y="${Math.round(startY + index * lineHeight)}" text-anchor="middle" fill="${template.foreground}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700">${escapeXml(line)}</text>`,
  ).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
<rect width="1080" height="1350" fill="${template.background}"/>
<rect x="490" y="164" width="100" height="8" rx="4" fill="${template.accent}"/>
${text}
<text x="540" y="1170" text-anchor="middle" fill="${template.foreground}" opacity="0.62" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="700" letter-spacing="2">@brosaid.it</text>
</svg>`;
}
