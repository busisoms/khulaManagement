import type { Stage } from "@/lib/growth/score";

// Inline SVG tree with 5 stages. Simple shapes, warm colours.
const LEAF = "#2f7a52";
const LEAF_DARK = "#1e5b3e";
const LEAF_LIGHT = "#5a9e74";
const TRUNK = "#7a5230";
const SOIL = "#c9b79c";
const FRUIT = "#d9822b";

function Leaf({ x, y, angle, size = 1 }: { x: number; y: number; angle: number; size?: number }) {
  return (
    <ellipse cx={x} cy={y} rx={9 * size} ry={4.5 * size} fill={LEAF} transform={`rotate(${angle} ${x} ${y})`} />
  );
}

function Crown({ circles }: { circles: [number, number, number, string][] }) {
  return (
    <>
      {circles.map(([cx, cy, r, fill], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={fill} />
      ))}
    </>
  );
}

function StageArt({ stage }: { stage: Stage }) {
  switch (stage) {
    case "seed":
      return <ellipse cx="100" cy="166" rx="7" ry="5" fill={TRUNK} />;
    case "sprout":
      return (
        <>
          <path d="M100 170 V140" stroke={LEAF_DARK} strokeWidth="3" strokeLinecap="round" />
          <Leaf x={91} y={144} angle={-30} />
          <Leaf x={109} y={140} angle={30} />
        </>
      );
    case "sapling":
      return (
        <>
          <path d="M100 170 V110" stroke={TRUNK} strokeWidth="4" strokeLinecap="round" />
          <Leaf x={90} y={140} angle={-25} size={1.2} />
          <Leaf x={110} y={132} angle={25} size={1.2} />
          <Leaf x={90} y={120} angle={-35} size={1.2} />
          <Leaf x={110} y={113} angle={35} size={1.2} />
          <Leaf x={100} y={104} angle={90} size={1.1} />
        </>
      );
    case "young_tree":
      return (
        <>
          <path d="M100 170 V100 M100 128 L82 112 M100 120 L118 104" stroke={TRUNK} strokeWidth="6" strokeLinecap="round" />
          <Crown
            circles={[
              [80, 100, 22, LEAF],
              [120, 96, 24, LEAF],
              [100, 78, 28, LEAF_LIGHT],
              [100, 104, 18, LEAF_DARK],
            ]}
          />
        </>
      );
    case "thriving":
      return (
        <>
          <path d="M100 170 V96 M100 130 L74 106 M100 118 L128 96" stroke={TRUNK} strokeWidth="9" strokeLinecap="round" />
          <Crown
            circles={[
              [68, 96, 26, LEAF],
              [132, 92, 28, LEAF],
              [100, 64, 34, LEAF_LIGHT],
              [78, 70, 24, LEAF],
              [124, 66, 24, LEAF],
              [100, 100, 22, LEAF_DARK],
            ]}
          />
          {[
            [76, 92],
            [122, 76],
            [98, 52],
            [134, 104],
            [90, 106],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="4" fill={FRUIT} />
          ))}
        </>
      );
  }
}

/** Watering markers: shown, but they never change the stage. */
function Drops({ count }: { count: number }) {
  const shown = Math.min(count, 10);
  return (
    <>
      {Array.from({ length: shown }, (_, i) => {
        const x = 30 + i * 15.5;
        return <path key={i} d={`M${x} 184 q-4 6 0 8 q4 -2 0 -8z`} fill="#5b8fb9" opacity="0.85" />;
      })}
    </>
  );
}

export function GrowthTree({ stage, waterings, label }: { stage: Stage; waterings: number; label: string }) {
  return (
    <svg viewBox="0 0 200 200" role="img" aria-label={label} className="mx-auto h-auto w-full max-w-[240px]">
      <ellipse cx="100" cy="172" rx="70" ry="10" fill={SOIL} />
      <StageArt stage={stage} />
      <Drops count={waterings} />
    </svg>
  );
}
