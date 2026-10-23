// Two Sum with a hash map: for each value, look for its complement among the
// values already seen, then remember this one. The map on the right is a table
// with one row per entry, keyed by the map's own key, so a new entry drops in as
// its own row and rows leave when you step backwards.
//
// The d3 ideas:
//  - A keyed join whose key is the *data's* key (the number stored in the map),
//    not its position. Entering rows slide down from above and fade in; exiting
//    rows fade out; rows that stay are untouched. d3.join() takes one function
//    each for enter / update / exit, which is how each gets its own animation.
//  - Frames hold an immutable copy of the Map; drawing is [...map] -> rows.

const nums = [3, 8, 1, 6, 4, 9];

function* twoSum(target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const want = target - nums[i];
    yield { i, seen: new Map(seen), want, hit: seen.has(want), msg: `nums[${i}] = ${nums[i]} needs ${want}. ${seen.has(want) ? `Seen at index ${seen.get(want)}: done.` : 'Not seen yet.'}` };
    if (seen.has(want)) return;
    seen.set(nums[i], i);
  }
  yield { i: -1, seen, want: NaN, hit: false, msg: 'No pair adds up to the target.' };
}

// geometry (the same as dsviz: 40px array cells, a 56 + 72 wide table of 32px rows)
const CELL = 40, STEP = 46, KW = 56, VW = 72, RH = 32;
const MX = 300; // the table's left edge
const W = MX + KW + VW, H = nums.length * RH; // room for six rows

const fig = kit.figure(W, H, { pad: 16 });
const { svg } = fig;

// the array, drawn once; only its tones change
const arr = svg.append('g');
arr.selectAll('g.cell').data(nums.map((v, i) => ({ v, i }))).join((enter) => {
  const g = enter.append('g').attr('class', 'cell').attr('transform', (d) => `translate(${d.i * STEP},0)`);
  g.append('rect').attr('width', CELL).attr('height', CELL).attr('rx', 6);
  g.append('text').attr('class', 'value').attr('x', CELL / 2).attr('y', CELL / 2).attr('dy', '.35em').attr('text-anchor', 'middle').style('font-size', '16px').text((d) => d.v);
  g.append('text').attr('class', 'muted').attr('x', CELL / 2).attr('y', CELL + 14).attr('dy', '.35em').attr('text-anchor', 'middle').style('font-size', '12px').text((d) => d.i);
  return g;
});

// the table: a caption, an "empty" placeholder row, and the entry rows
const table = svg.append('g').attr('transform', `translate(${MX},0)`);
table.append('text').attr('class', 'muted').attr('y', -13).attr('dy', '.35em').style('font-size', '12px').style('letter-spacing', '.02em').text('seen: value → index');
const rows = table.append('g');
const empty = table.append('g').style('opacity', 0);
empty.append('rect').attr('class', 'solid ghost').attr('x', 0).attr('y', 2).attr('width', KW + VW).attr('height', RH - 4).attr('rx', 5);
empty.append('text').attr('class', 'muted').attr('x', (KW + VW) / 2).attr('y', RH / 2).attr('dy', '.35em').attr('text-anchor', 'middle').style('font-size', '12px').text('empty');

function draw(f) {
  arr.selectAll('g.cell rect').attr('class', (d) => kit.cls('solid', kit.tone(d.i === f.i ? (f.hit ? 'success' : 'active') : null)));

  kit.tr(empty, 250).style('opacity', f.seen.size ? 0 : 1);

  const entries = [...f.seen].map(([k, v], i) => ({ k, v, i, tone: f.hit && k === f.want ? 'success' : k === f.want ? 'muted' : null }));
  const y = (d) => d.i * RH;
  const place = (d) => `translate(0,${y(d)})`;
  rows.selectAll('g.row').data(entries, (d) => d.k).join(
    (enter) => {
      // enter 0.6 of a row above where it will sit, transparent, then drop in
      const g = enter.append('g').attr('class', 'row').attr('transform', (d) => `translate(0,${y(d) - RH * 0.6})`).style('opacity', 0);
      g.append('rect').attr('class', 'key').attr('x', 1).attr('y', 2).attr('width', KW - 2).attr('height', RH - 4).attr('rx', 5);
      g.append('text').attr('class', 'mono').attr('x', KW / 2).attr('y', RH / 2).attr('dy', '.35em').attr('text-anchor', 'middle').style('font-size', '13px').text((d) => d.k);
      g.append('rect').attr('class', 'val').attr('x', KW + 1).attr('y', 2).attr('width', VW - 2).attr('height', RH - 4).attr('rx', 5);
      g.append('text').attr('class', 'value').attr('x', KW + VW / 2).attr('y', RH / 2).attr('dy', '.35em').attr('text-anchor', 'middle').style('font-size', '13px').text((d) => d.v);
      return g;
    },
    (update) => update,
    (exit) => kit.tr(exit, 300).style('opacity', 0).attr('transform', (d) => `translate(0,${y(d) - RH * 0.6})`).remove(),
  ).call((g) => {
    // one transition per element: a second one started on the same element would cancel the first
    kit.tr(g, 400).style('opacity', 1).attr('transform', place);
    // keys sit on muted fill, values on the surface; a tone replaces both (the value at 55% strength)
    g.select('rect.key').attr('class', (d) => kit.cls('solid key', kit.tone(d.tone ?? 'muted')));
    g.select('rect.val').attr('class', (d) => kit.cls('solid val', kit.tone(d.tone)))
      .style('fill', (d) => (d.tone && d.tone !== 'muted' ? 'color-mix(in srgb, var(--cf) 55%, var(--surface))' : null));
  });

  status.set(f.msg);
}

let target = 10;
const status = kit.status();
const player = kit.player([...twoSum(target)], { interval: 1100, onFrame: draw, invalidation });
const stepper = kit.stepper({ label: 'Target', value: target, min: 2, max: 18, onInput: (v) => { target = v; player.pause(); player.replace([...twoSum(target)]); } });

fig.el.prepend(stepper);
fig.add(status);
fig.add(kit.transport(player));
return fig.el;
