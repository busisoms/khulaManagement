import type { Stage } from "@/lib/growth/score";

/*
 * The growth tree. One SVG, five stages. Each stage is drawn from the same
 * parts (trunk, branches, crown blobs) at a different scale, so moving up a
 * stage looks like the same tree growing, not a different picture.
 * Motion: the crown sways gently; disabled for prefers-reduced-motion.
 */

type Blob = [cx: number, cy: number, r: number, shade: "dark" | "mid" | "light"];

type StageShape = {
  trunkTop: number; // y where the trunk ends
  trunkWidth: number;
  branches: string; // SVG path for branches
  crown: Blob[];
  fruit: [number, number][];
  leaves?: { x: number; y: number; angle: number }[]; // sprout-style single leaves
};

const GROUND_Y = 186;

const SHAPES: Record<Exclude<Stage, "seed">, StageShape> = {
  sprout: {
    trunkTop: 150,
    trunkWidth: 3,
    branches: "",
    crown: [],
    fruit: [],
    leaves: [
      { x: 119, y: 156, angle: -50 },
      { x: 121, y: 152, angle: 50 },
    ],
  },
  sapling: {
    trunkTop: 120,
    trunkWidth: 5,
    branches: "M120 150 L108 138",
    crown: [
      [106, 128, 15, "mid"],
      [134, 122, 16, "mid"],
      [120, 108, 19, "light"],
    ],
    fruit: [],
  },
  young_tree: {
    trunkTop: 104,
    trunkWidth: 8,
    branches: "M120 146 L98 124 M120 134 L144 114",
    crown: [
      [94, 116, 24, "dark"],
      [148, 110, 25, "dark"],
      [104, 92, 26, "mid"],
      [138, 88, 26, "mid"],
      [121, 72, 28, "light"],
    ],
    fruit: [],
  },
  thriving: {
    trunkTop: 96,
    trunkWidth: 11,
    branches: "M120 150 L90 120 M120 136 L152 108 M120 118 L104 96",
    crown: [
      [80, 112, 28, "dark"],
      [162, 106, 29, "dark"],
      [96, 84, 31, "mid"],
      [146, 78, 32, "mid"],
      [120, 104, 26, "dark"],
      [121, 56, 33, "light"],
      [92, 60, 22, "light"],
      [150, 52, 22, "light"],
    ],
    fruit: [
      [86, 104],
      [152, 92],
      [118, 64],
      [100, 78],
      [140, 112],
      [166, 74],
    ],
  },
};

function Trunk({ top, width }: { top: number; width: number }) {
  // Slight taper: wider at the ground.
  const half = width / 2;
  return (
    <path
      d={`M${120 - half * 1.4} ${GROUND_Y} C${120 - half} ${GROUND_Y - 30} ${120 - half * 0.8} ${top + 20} ${120 - half * 0.6} ${top}
          L${120 + half * 0.6} ${top} C${120 + half * 0.8} ${top + 20} ${120 + half} ${GROUND_Y - 30} ${120 + half * 1.4} ${GROUND_Y} Z`}
      fill="url(#bark)"
    />
  );
}

function Leaf({ x, y, angle }: { x: number; y: number; angle: number }) {
  return <path d={`M${x} ${y} q-11 -10 -2 -20 q11 8 2 20z`} fill="url(#leaf-mid)" transform={`rotate(${angle} ${x} ${y})`} />;
}

export function GrowthTree({ stage, label }: { stage: Stage; label: string }) {
  const shape = stage === "seed" ? null : SHAPES[stage];

  return (
    <svg viewBox="0 0 240 210" role="img" aria-label={label} className="mx-auto h-auto w-full max-w-[280px]">
      <defs>
        <radialGradient id="halo" cx="50%" cy="55%" r="55%">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bark" x1="0" x2="1">
          <stop offset="0%" stopColor="#5b3a22" />
          <stop offset="100%" stopColor="#8a5a36" />
        </linearGradient>
        <linearGradient id="leaf-dark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0f7a55" />
          <stop offset="100%" stopColor="#065f46" />
        </linearGradient>
        <linearGradient id="leaf-mid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22a873" />
          <stop offset="100%" stopColor="#0f7a55" />
        </linearGradient>
        <linearGradient id="leaf-light" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5fd3a0" />
          <stop offset="100%" stopColor="#22a873" />
        </linearGradient>
        <radialGradient id="ground" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#cfd8e3" />
          <stop offset="100%" stopColor="#cfd8e3" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="120" cy="118" r="96" fill="url(#halo)" />
      <ellipse cx="120" cy={GROUND_Y + 2} rx="78" ry="9" fill="url(#ground)" />

      {stage === "seed" && (
        <g className="tree-rise">
          <path d={`M98 ${GROUND_Y} q22 -14 44 0z`} fill="#8a5a36" opacity="0.35" />
          <ellipse cx="120" cy={GROUND_Y - 6} rx="9" ry="6.5" fill="url(#bark)" />
          <path d={`M120 ${GROUND_Y - 12} q2 -8 7 -10`} stroke="#22a873" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </g>
      )}

      {shape && (
        <g className="tree-rise" key={stage}>
          <Trunk top={shape.trunkTop} width={shape.trunkWidth} />
          {shape.branches && (
            <path d={shape.branches} stroke="url(#bark)" strokeWidth={Math.max(3, shape.trunkWidth * 0.45)} strokeLinecap="round" fill="none" />
          )}
          <g className="tree-sway">
            {shape.leaves?.map((l, i) => <Leaf key={i} {...l} />)}
            {shape.crown.map(([cx, cy, r, shade], i) => (
              <circle key={i} cx={cx} cy={cy} r={r} fill={`url(#leaf-${shade})`} />
            ))}
            {/* soft highlight on the crown */}
            {shape.crown.length > 0 && (
              <ellipse
                cx={shape.crown[shape.crown.length - 1][0] - 8}
                cy={shape.crown[shape.crown.length - 1][1] - 8}
                rx={shape.crown[shape.crown.length - 1][2] * 0.45}
                ry={shape.crown[shape.crown.length - 1][2] * 0.3}
                fill="#ffffff"
                opacity="0.18"
              />
            )}
            {shape.fruit.map(([cx, cy], i) => (
              <g key={i}>
                <circle cx={cx} cy={cy} r="5" fill="#f59e0b" />
                <circle cx={cx - 1.5} cy={cy - 1.5} r="1.6" fill="#fde68a" />
              </g>
            ))}
          </g>
        </g>
      )}
    </svg>
  );
}

/** Stage order for progress displays. */
export const STAGE_ORDER: Stage[] = ["seed", "sprout", "sapling", "young_tree", "thriving"];
