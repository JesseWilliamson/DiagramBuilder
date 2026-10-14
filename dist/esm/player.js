/**
 * Step through an algorithm frame by frame.
 *
 * Pattern: write your algorithm as a generator that `yield`s a SNAPSHOT of its
 * state at each interesting moment. The player runs it to completion up front
 * and keeps every frame, which is what makes "previous step" and a scrubber
 * possible — you can't run a generator backwards, but you can index an array.
 *
 *   function* binarySearch(a, target) {
 *     let lo = 0, hi = a.length - 1;
 *     while (lo <= hi) {
 *       const mid = (lo + hi) >> 1;
 *       yield { lo, hi, mid };              // ← snapshot
 *       ...
 *     }
 *   }
 *
 * ⚠ Yield COPIES of mutable data (`[...arr]`, `structuredClone(x)`). If you
 * yield the same array you keep mutating, every stored frame points at the
 * same final array and the animation looks frozen.
 */
export function createPlayer(source, o = {}) {
    let interval = o.interval ?? 700;
    const max = o.maxFrames ?? 10000;
    let frames = [];
    let index = 0;
    let timer = null;
    const subs = new Set();
    if (o.onFrame)
        subs.add(o.onFrame);
    const collect = (src) => {
        const out = [];
        for (const f of src) {
            out.push(f);
            if (out.length >= max) {
                console.warn(`[dsviz] player stopped collecting at ${max} frames`);
                break;
            }
        }
        return out;
    };
    const notify = () => {
        if (!frames.length)
            return;
        for (const fn of subs)
            fn(frames[index], index, player);
    };
    const tick = () => {
        if (index >= frames.length - 1) {
            if (!o.loop)
                return pause();
            index = -1;
        }
        index++;
        notify();
        timer = setTimeout(tick, interval);
    };
    function pause() {
        if (timer)
            clearTimeout(timer);
        timer = null;
        notify(); // so UIs can update their play/pause button
    }
    const player = {
        get frames() {
            return frames;
        },
        get index() {
            return index;
        },
        get frame() {
            return frames[index];
        },
        get playing() {
            return timer !== null;
        },
        get atEnd() {
            return index >= frames.length - 1;
        },
        next() {
            if (index < frames.length - 1)
                (index++, notify());
        },
        prev() {
            if (index > 0)
                (index--, notify());
        },
        seek(i) {
            const j = Math.max(0, Math.min(frames.length - 1, Math.round(i)));
            if (j !== index)
                (index = j, notify());
        },
        play() {
            if (timer)
                return;
            if (index >= frames.length - 1)
                index = -1; // restart from the top
            timer = setTimeout(tick, 0);
        },
        pause,
        toggle() {
            timer ? pause() : player.play();
        },
        load(src) {
            if (timer)
                clearTimeout(timer);
            timer = null;
            frames = collect(src);
            index = 0;
            notify();
        },
        setInterval(ms) {
            interval = ms;
        },
        subscribe(fn) {
            subs.add(fn);
            return () => subs.delete(fn);
        },
        destroy() {
            if (timer)
                clearTimeout(timer);
            timer = null;
            subs.clear();
        },
    };
    frames = collect(source);
    queueMicrotask(notify); // let the caller finish wiring up before the first frame
    return player;
}
