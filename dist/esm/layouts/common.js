export function resolveTone(spec, key, value) {
    if (!spec)
        return undefined;
    return typeof spec === 'function' ? spec(key, value) : spec[String(key)];
}
export const show = (v) => (v === null || v === undefined ? '' : String(v));
