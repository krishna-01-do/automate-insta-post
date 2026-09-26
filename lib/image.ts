type Template = {
  foreground: string;
  watermarkBackground: string;
  watermarkForeground: string;
  art: string;
};

const TEMPLATES: Template[] = [
  {
    foreground: "#17120F",
    watermarkBackground: "#17120F",
    watermarkForeground: "#FFF8E7",
    art: `<defs>
  <linearGradient id="sunset" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#FF5C7A"/><stop offset="0.52" stop-color="#FF8A4C"/><stop offset="1" stop-color="#FFD84D"/></linearGradient>
  <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="22" stdDeviation="22" flood-color="#7A183A" flood-opacity="0.28"/></filter>
</defs>
<rect width="1080" height="1350" fill="url(#sunset)"/>
<circle cx="80" cy="150" r="190" fill="#FFEB72" opacity="0.7"/>
<circle cx="1000" cy="1190" r="240" fill="#FF3D81" opacity="0.38"/>
<path d="M-40 1040 C220 900 310 1180 570 1030 S900 900 1140 1030 V1390 H-40Z" fill="#5D2BFF" opacity="0.2"/>
<g transform="rotate(-2 540 650)" filter="url(#shadow)"><rect x="92" y="248" width="896" height="790" rx="56" fill="#FFF8E7"/><rect x="122" y="278" width="836" height="730" rx="38" fill="none" stroke="#17120F" stroke-width="5"/></g>
<path d="M134 207 l20 -49 20 49 49 20-49 20-20 49-20-49-49-20Z" fill="#17120F"/>
<path d="M927 166 l13 -32 13 32 32 13-32 13-13 32-13-32-32-13Z" fill="#FFF8E7"/>`,
  },
  {
    foreground: "#101010",
    watermarkBackground: "#101010",
    watermarkForeground: "#FFE13D",
    art: `<defs>
  <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="4" fill="#101010" opacity="0.2"/></pattern>
  <filter id="hardShadow" x="-20%" y="-20%" width="150%" height="150%"><feDropShadow dx="20" dy="22" stdDeviation="0" flood-color="#101010"/></filter>
</defs>
<rect width="1080" height="1350" fill="#FFE13D"/>
<rect width="1080" height="1350" fill="url(#dots)"/>
<path d="M0 0 H350 L0 350Z" fill="#FF4D78"/><path d="M1080 1350 H730 L1080 1000Z" fill="#48D6C8"/>
<g filter="url(#hardShadow)"><rect x="86" y="240" width="888" height="800" rx="18" fill="#FFFDF6" stroke="#101010" stroke-width="8"/></g>
<path d="M122 192 h132 l-26 30 26 30H122Z" fill="#101010"/><circle cx="912" cy="186" r="62" fill="#48D6C8" stroke="#101010" stroke-width="7"/>
<path d="M891 184 l15 16 29-35" fill="none" stroke="#101010" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  {
    foreground: "#F8F5FF",
    watermarkBackground: "#B8FF3D",
    watermarkForeground: "#111019",
    art: `<defs>
  <radialGradient id="neonA"><stop stop-color="#B936FF" stop-opacity="0.9"/><stop offset="1" stop-color="#B936FF" stop-opacity="0"/></radialGradient>
  <radialGradient id="neonB"><stop stop-color="#00E5FF" stop-opacity="0.8"/><stop offset="1" stop-color="#00E5FF" stop-opacity="0"/></radialGradient>
  <pattern id="grid" width="54" height="54" patternUnits="userSpaceOnUse"><path d="M54 0H0V54" fill="none" stroke="#FFFFFF" stroke-width="1" opacity="0.1"/></pattern>
  <filter id="glow"><feGaussianBlur stdDeviation="9" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
<rect width="1080" height="1350" fill="#111019"/><rect width="1080" height="1350" fill="url(#grid)"/>
<circle cx="70" cy="220" r="360" fill="url(#neonA)"/><circle cx="1020" cy="1110" r="420" fill="url(#neonB)"/>
<rect x="82" y="238" width="916" height="812" rx="64" fill="#181625" fill-opacity="0.9" stroke="#B8FF3D" stroke-width="4"/>
<path d="M144 315 H936" stroke="#00E5FF" stroke-width="4" opacity="0.65"/>
<g filter="url(#glow)" fill="#B8FF3D"><circle cx="150" cy="184" r="8"/><circle cx="930" cy="195" r="8"/><circle cx="972" cy="222" r="4"/></g>
<path d="M860 150 l28 43 50 13-32 39 3 52-49-19-48 20 2-52-33-39 50-14Z" fill="none" stroke="#B8FF3D" stroke-width="6"/>`,
  },
  {
    foreground: "#2A211C",
    watermarkBackground: "#E84B3C",
    watermarkForeground: "#FFFDF5",
    art: `<defs>
  <filter id="paperShadow" x="-20%" y="-20%" width="150%" height="160%"><feDropShadow dx="8" dy="18" stdDeviation="15" flood-color="#6F4E37" flood-opacity="0.25"/></filter>
  <pattern id="paperDots" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="2" fill="#8C6A52" opacity="0.16"/></pattern>
</defs>
<rect width="1080" height="1350" fill="#F4D9A6"/><rect width="1080" height="1350" fill="url(#paperDots)"/>
<path d="M0 1080 C210 1010 280 1190 500 1110 S800 1010 1080 1130 V1350H0Z" fill="#82C9B8"/>
<g filter="url(#paperShadow)" transform="rotate(1.4 540 650)"><path d="M102 260 Q130 232 170 245 L928 245 Q970 250 972 292 L963 1008 Q944 1038 904 1029 L145 1038 Q105 1027 109 982Z" fill="#FFFDF5"/></g>
<g transform="rotate(-7 540 245)"><rect x="432" y="211" width="216" height="68" rx="5" fill="#E84B3C" opacity="0.82"/></g>
<path d="M142 177 q35-58 72 0 q36-58 72 0" fill="none" stroke="#2A211C" stroke-width="8" stroke-linecap="round"/>
<path d="M875 180 l22 46 48 7-35 35 9 49-44-23-44 23 8-49-35-35 49-7Z" fill="#FFD23F" stroke="#2A211C" stroke-width="5"/>
<path d="M170 1090 q55 42 110 0" fill="none" stroke="#2A211C" stroke-width="7" stroke-linecap="round"/><circle cx="188" cy="1068" r="7" fill="#2A211C"/><circle cx="261" cy="1068" r="7" fill="#2A211C"/>`,
  },
  {
    foreground: "#14213D",
    watermarkBackground: "#14213D",
    watermarkForeground: "#FFFFFF",
    art: `<defs>
  <linearGradient id="chatBg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#5B8CFF"/><stop offset="1" stop-color="#8B5CF6"/></linearGradient>
  <filter id="chatShadow" x="-20%" y="-20%" width="150%" height="160%"><feDropShadow dx="0" dy="24" stdDeviation="25" flood-color="#172554" flood-opacity="0.3"/></filter>
</defs>
<rect width="1080" height="1350" fill="url(#chatBg)"/>
<circle cx="110" cy="115" r="55" fill="#FFCF4A"/><circle cx="960" cy="1180" r="120" fill="#FF6B9A" opacity="0.75"/>
<g filter="url(#chatShadow)"><path d="M100 260 Q100 220 140 220 H940 Q980 220 980 260 V965 Q980 1005 940 1005 H360 L242 1090 265 1005 H140 Q100 1005 100 965Z" fill="#FFFFFF"/></g>
<rect x="142" y="282" width="796" height="8" rx="4" fill="#DDE5FF"/>
<g transform="translate(800 150) rotate(8)"><rect width="170" height="76" rx="38" fill="#FFCF4A"/><text x="85" y="50" text-anchor="middle" fill="#14213D" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="900">TOO REAL</text></g>
<path d="M138 172 c25-38 60-38 84 0 c24-38 60-38 84 0" fill="none" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round"/>
<circle cx="895" cy="1095" r="46" fill="#FFFFFF" opacity="0.25"/><path d="M873 1095 h44 M895 1073 v44" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round"/>`,
  },
];

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

export function createQuoteSvg(quote: string, _category: string, templateIndex = 0): string {
  const template = TEMPLATES[Math.abs(templateIndex) % TEMPLATES.length];
  const fontSize = selectFontSize(quote.length);
  const lines = wrapQuote(quote, fontSize);
  const lineHeight = Math.round(fontSize * 1.22);
  const totalHeight = lines.length * lineHeight;
  const startY = 655 - totalHeight / 2 + fontSize * 0.8;
  const text = lines.map((line, index) =>
    `<text x="540" y="${Math.round(startY + index * lineHeight)}" text-anchor="middle" fill="${template.foreground}" font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="900" letter-spacing="-1">${escapeXml(line)}</text>`,
  ).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
${template.art}
${text}
<rect x="405" y="1150" width="270" height="62" rx="31" fill="${template.watermarkBackground}"/>
<text x="540" y="1190" text-anchor="middle" fill="${template.watermarkForeground}" font-family="Arial, Helvetica, sans-serif" font-size="27" font-weight="800" letter-spacing="1.5">@brosaid.it</text>
</svg>`;
}
