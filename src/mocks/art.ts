/**
 * Generates placeholder artwork as inline SVG data URLs, so the mock catalogue
 * looks like a real store without shipping image files. Real games get real
 * images through the admin panel.
 */

type Motif = 'orbs' | 'grid' | 'rays' | 'blocks' | 'waves';

export interface ArtStyle {
  from: string;
  to: string;
  glow: string;
  motif: Motif;
}

interface Size {
  width: number;
  height: number;
}

const SIZES = {
  cover: { width: 600, height: 800 },
  banner: { width: 1600, height: 900 },
} as const satisfies Record<string, Size>;

/** Small deterministic random generator, so artwork is stable between reloads. */
function createRandom(seed: number): () => number {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function drawMotif(motif: Motif, { width, height }: Size, random: () => number): string {
  const unit = Math.min(width, height);

  switch (motif) {
    case 'orbs':
      return Array.from({ length: 7 }, () => {
        const radius = unit * (0.06 + random() * 0.22);
        return `<circle cx="${random() * width}" cy="${random() * height}" r="${radius}" fill="#fff" opacity="${0.05 + random() * 0.12}"/>`;
      }).join('');
    case 'grid': {
      const step = unit / 8;
      const lines: string[] = [];
      for (let x = 0; x <= width; x += step) {
        lines.push(`<path d="M${x} 0V${height}" stroke="#fff" opacity=".1"/>`);
      }
      for (let y = 0; y <= height; y += step) {
        lines.push(`<path d="M0 ${y}H${width}" stroke="#fff" opacity=".1"/>`);
      }
      const cells = Array.from({ length: 9 }, () => {
        const x = Math.floor(random() * (width / step)) * step;
        const y = Math.floor(random() * (height / step)) * step;
        return `<rect x="${x}" y="${y}" width="${step}" height="${step}" fill="#fff" opacity="${0.08 + random() * 0.2}"/>`;
      });
      return lines.concat(cells).join('');
    }
    case 'rays':
      return Array.from({ length: 12 }, (_, index) => {
        const angle = (index / 12) * Math.PI * 2 + random() * 0.2;
        const length = unit * 1.6;
        const x = width / 2 + Math.cos(angle) * length;
        const y = height * 0.62 + Math.sin(angle) * length;
        return `<path d="M${width / 2} ${height * 0.62}L${x} ${y}" stroke="#fff" stroke-width="${unit * 0.035}" opacity="${0.05 + random() * 0.1}"/>`;
      }).join('');
    case 'blocks':
      return Array.from({ length: 12 }, () => {
        const size = unit * (0.08 + random() * 0.16);
        return `<rect x="${random() * width}" y="${random() * height}" width="${size}" height="${size}" rx="${size * 0.18}" fill="#fff" opacity="${0.06 + random() * 0.14}" transform="rotate(${random() * 40 - 20} ${width / 2} ${height / 2})"/>`;
      }).join('');
    case 'waves':
      return Array.from({ length: 6 }, (_, index) => {
        const y = height * (0.3 + index * 0.12);
        const amplitude = unit * (0.05 + random() * 0.08);
        return `<path d="M0 ${y}C${width * 0.25} ${y - amplitude} ${width * 0.5} ${y + amplitude} ${width} ${y - amplitude}V${height}H0Z" fill="#fff" opacity="${0.04 + random() * 0.06}"/>`;
      }).join('');
  }
}

function toDataUrl(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Creates one piece of artwork. Different seeds give different compositions. */
export function createArt(style: ArtStyle, kind: keyof typeof SIZES, seed: number): string {
  const size = SIZES[kind];
  const random = createRandom(seed);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size.width} ${size.height}" preserveAspectRatio="xMidYMid slice">` +
    `<defs>` +
    `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${style.from}"/><stop offset="1" stop-color="${style.to}"/></linearGradient>` +
    `<radialGradient id="glow" cx="${0.25 + random() * 0.5}" cy="${0.2 + random() * 0.4}" r=".7"><stop offset="0" stop-color="${style.glow}" stop-opacity=".85"/><stop offset="1" stop-color="${style.glow}" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></linearGradient>` +
    `</defs>` +
    `<rect width="100%" height="100%" fill="url(#bg)"/>` +
    `<rect width="100%" height="100%" fill="url(#glow)"/>` +
    drawMotif(style.motif, size, random) +
    `<rect width="100%" height="100%" fill="url(#shade)"/>` +
    `</svg>`;
  return toDataUrl(svg);
}
