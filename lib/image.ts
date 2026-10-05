const escapeXml = (value: string) => value.replace(/[<>&"']/g, (character) => ({
  "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;",
}[character] as string));

function selectFontSize(length: number): number {
  if (length <= 42) return 80;
  if (length <= 78) return 68;
  if (length <= 120) return 58;
  return 50;
}

export function wrapQuote(quote: string, fontSize: number): string[] {
  const maxCharacters = Math.max(16, Math.floor(790 / (fontSize * 0.54)));
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

export function createQuoteSvg(quote: string, _category: string, _templateIndex = 0): string {
  const fontSize = selectFontSize(quote.length);
  const lines = wrapQuote(quote, fontSize);
  const lineHeight = Math.round(fontSize * 1.22);
  const totalHeight = lines.length * lineHeight;
  const startY = 500 - totalHeight / 2 + fontSize * 0.8;
  const text = lines.map((line, index) =>
    `<text x="540" y="${Math.round(startY + index * lineHeight)}" text-anchor="middle" fill="#FFFFFF" font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="900" letter-spacing="-1">${escapeXml(line)}</text>`,
  ).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
<rect width="1080" height="1350" fill="#000000"/>
${text}
<text x="540" y="1190" text-anchor="middle" fill="#FFFFFF" opacity="0.65" font-family="Arial, Helvetica, sans-serif" font-size="27" font-weight="800" letter-spacing="1.5">@brosaid.it</text>
</svg>`;
}
