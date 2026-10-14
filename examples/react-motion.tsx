/**
 * Rendering a dsviz Scene with React + Motion (formerly framer-motion).
 *
 * dsviz layouts produce plain data with stable ids, which is exactly what
 * React wants for `key` and what Motion's <AnimatePresence> needs to animate
 * enters and exits. So instead of dsviz's own createView(), you map nodes to
 * motion elements and let Motion's springs do the tweening.
 *
 * Written against the `motion` package (v11+, `motion/react`). With the older
 * `framer-motion` package, change the import path; the API is the same.
 * Not run in this repo (no React toolchain here) — treat it as a starting point.
 */
import { AnimatePresence, motion, useSpring, useTransform } from 'motion/react';
import { useEffect } from 'react';
import { ArrowNode, Scene, SceneNode, arrowPath, bounds, classFor } from 'dsviz';

const spring = { type: 'spring', stiffness: 260, damping: 30 } as const;

export function DiagramSVG({ scene, padding = 24, height = 280 }: { scene: Scene; padding?: number; height?: number }) {
  const b = bounds(scene);
  const viewBox = `${b.x - padding} ${b.y - padding} ${b.w + 2 * padding} ${b.h + 2 * padding}`;
  return (
    // Motion can animate the viewBox attribute directly.
    <motion.svg className="dv-root" style={{ width: '100%', height }} initial={false} animate={{ viewBox }} transition={spring}>
      <AnimatePresence initial={false}>
        {scene.nodes.map((n) => (
          <MotionNode key={n.id} node={n} />
        ))}
      </AnimatePresence>
    </motion.svg>
  );
}

function MotionNode({ node: n }: { node: SceneNode }) {
  // Note: on motion SVG elements, `x`/`y` mean CSS transforms; the SVG
  // x/y ATTRIBUTES are animated with `attrX`/`attrY`.
  const common = { className: classFor(n), 'data-id': n.id, transition: spring };
  const opacity = n.opacity ?? 1;
  switch (n.kind) {
    case 'circle':
      return (
        <motion.circle
          {...common}
          initial={{ cx: n.enter?.x ?? n.x, cy: n.enter?.y ?? n.y, r: n.r, opacity: 0 }}
          animate={{ cx: n.x, cy: n.y, r: n.r, opacity }}
          exit={{ opacity: 0, cx: n.exit?.x ?? n.x, cy: n.exit?.y ?? n.y }}
        />
      );
    case 'rect': {
      const tl = (x: number, y: number) => ({ attrX: x - n.w / 2, attrY: y - n.h / 2 });
      return (
        <motion.rect
          {...common}
          rx={n.rx ?? 0}
          initial={{ ...tl(n.enter?.x ?? n.x, n.enter?.y ?? n.y), width: n.w, height: n.h, opacity: 0 }}
          animate={{ ...tl(n.x, n.y), width: n.w, height: n.h, opacity }}
          exit={{ ...tl(n.exit?.x ?? n.x, n.exit?.y ?? n.y), opacity: 0 }}
        />
      );
    }
    case 'text':
      return (
        <motion.text
          {...common}
          fontSize={n.size ?? 16}
          fontWeight={n.weight}
          textAnchor={n.anchor ?? 'middle'}
          dominantBaseline="central"
          initial={{ attrX: n.enter?.x ?? n.x, attrY: n.enter?.y ?? n.y, opacity: 0 }}
          animate={{ attrX: n.x, attrY: n.y, opacity }}
          exit={{ opacity: 0 }}
        >
          {n.text}
        </motion.text>
      );
    case 'arrow':
      return <MotionArrow n={n} />;
  }
}

/**
 * Arrows can't just animate their `d` string: a straight line ("M…L…") and a
 * curve ("M…Q…") have different shapes of path data, so Motion can't
 * interpolate between them. Instead, spring the NUMBERS (endpoints + bend)
 * and rebuild the path every frame with dsviz's own arrowPath().
 */
function MotionArrow({ n }: { n: ArrowNode }) {
  const x1 = useSpring(n.enter?.x1 ?? n.x1, spring);
  const y1 = useSpring(n.enter?.y1 ?? n.y1, spring);
  const x2 = useSpring(n.enter?.x2 ?? n.x2, spring);
  const y2 = useSpring(n.enter?.y2 ?? n.y2, spring);
  const bend = useSpring(n.bend ?? 0, spring);
  useEffect(() => {
    x1.set(n.x1);
    y1.set(n.y1);
    x2.set(n.x2);
    y2.set(n.y2);
    bend.set(n.bend ?? 0);
  }, [n.x1, n.y1, n.x2, n.y2, n.bend]);
  const d = useTransform([x1, y1, x2, y2, bend], ([a, b, c, e, k]: number[]) =>
    arrowPath({ x: a, y: b }, { x: c, y: e }, k, n.head ?? true, n.width ?? 2),
  );
  return (
    <motion.path
      className={classFor(n)}
      data-id={n.id}
      d={d}
      strokeWidth={n.width ?? 2}
      initial={{ opacity: 0 }}
      animate={{ opacity: n.opacity ?? 1 }}
      exit={{ opacity: 0 }}
    />
  );
}

/*
Usage — your component owns the state, dsviz turns it into a Scene:

  function BinarySearchStep({ a, lo, hi, mid }) {
    const arr = array(a, { tones: { [mid]: 'active' } });
    const scene = combine(arr.window(lo, hi), arr, pointer({ id: 'mid', at: arr.top(mid), label: 'mid' }));
    return <DiagramSVG scene={scene} />;
  }

Remember to include dsviz's stylesheet once: injectStyles() in an effect, or
paste DEFAULT_CSS into your global CSS.
*/
