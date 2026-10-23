// Keys decide what moves. Bubble sort on 8 numbers; turn "Stable keys" off and a
// swap changes the two numbers in place, turn it on and the two tiles slide past
// each other. Same algorithm, same frames, same drawing code: the only
// difference is the key function handed to .data().
//
// The d3 ideas:
//  - `.data(items, d => d.id)`: d3 matches data to existing elements by id. With
//    id = the value's own identity ("k3"), the element follows its value to the
//    new position and a transition on `transform` animates the trip. With
//    id = the array index, the element at slot 3 stays at slot 3 and only its
//    text changes. That is the whole lesson.
//  - The algorithm is a generator; each `yield` is a frame (a copy of the array,
//    since the player keeps every frame). Drawing is a pure function of a frame.
//  - The `j` pointer is keyed by its name, so it slides along the row.

// Carry each value's identity with it.
function* bubbleSort(input) {
  const items = input.map((value, i) => ({ value, key: `k${i}` }));
  for (let end = items.length - 1; end > 0; end--) {
    for (let j = 0; j < end; j++) {
      yield { items: [...items], j, end, swap: false };
      if (items[j].value > items[j + 1].value) {
        [items[j], items[j + 1]] = [items[j + 1], items[j]];
        yield { items: [...items], j, end, swap: true };
      }
    }
  }
  yield { items: [...items], j: -1, end: 0, swap: false };
}
const random = () => d3.range(8).map(() => 1 + Math.floor(Math.random() * 49));

const CELL = 40, STEP = CELL + 6, TOP = 42;
const W = 8 * STEP - 6, H = TOP + 62;

let input = [29, 10, 14, 37, 13, 5, 22, 41];
let useKeys = true;

const fig = kit.figure(W, H, { pad: 4 });
const { svg } = fig;
const mk = kit.markers(svg);
const root = svg.append('g').attr('transform', `translate(0,${TOP})`);
const cellLayer = root.append('g');
const pointerLayer = root.append('g');

// index labels are identified by position (index 3 is always index 3), so they are drawn once
root.append('g').selectAll('text').data(d3.range(8)).join('text').attr('class', 'muted')
  .attr('x', (i) => i * STEP + CELL / 2).attr('y', CELL + 14).attr('dy', '.35em').attr('text-anchor', 'middle')
  .style('font-size', '12px').text((i) => i);

function draw(f) {
  const tone = (i) => (f.j < 0 || i > f.end ? 'success' : i === f.j || i === f.j + 1 ? (f.swap ? 'danger' : 'active') : null);
  const cells = f.items.map((it, i) => ({ id: useKeys ? it.key : i, v: it.value, i, tone: tone(i) }));
  const place = (d) => `translate(${d.i * STEP},0)`;

  cellLayer.selectAll('g.cell').data(cells, (d) => d.id).join((enter) => {
    const g = enter.append('g').attr('class', 'cell').attr('transform', place);
    g.append('rect').attr('width', CELL).attr('height', CELL).attr('rx', 6);
    g.append('text').attr('class', 'value').attr('x', CELL / 2).attr('y', CELL / 2).attr('dy', '.35em').attr('text-anchor', 'middle').style('font-size', '16px');
    return g;
  }).call((g) => {
    g.select('rect').attr('class', (d) => kit.cls('solid', kit.tone(d.tone)));
    g.select('text').text((d) => d.v);
    kit.tr(g, 350).attr('transform', place); // keyed: the tile slides; unkeyed: i never changes, nothing moves
  });

  // the j pointer: 14px arrow above the cell, label above that
  const ps = f.j >= 0 ? [{ id: 'j', i: f.j }] : [];
  const at = (d) => `translate(${d.i * STEP + CELL / 2},-4)`;
  pointerLayer.selectAll('g.ptr').data(ps, (d) => d.id).join(
    (enter) => {
      const g = enter.append('g').attr('class', 'ptr tone-active').attr('transform', at).style('opacity', 0);
      g.append('line').attr('class', 'line').attr('marker-end', mk('arrow')).attr('y1', -14).attr('y2', 0).style('stroke-width', 2);
      g.append('text').attr('class', 'mono tone-active').attr('y', -27).attr('dy', '.35em').attr('text-anchor', 'middle').style('font-size', '13px').text((d) => d.id);
      return g;
    },
    (update) => update,
    (exit) => kit.tr(exit, 250).style('opacity', 0).remove(),
  ).call((g) => kit.tr(g, 350).style('opacity', 1).attr('transform', at)); // one transition: a second one on the same element would cancel the first

  status.set(f.j < 0 ? 'Sorted.' : f.swap ? `Swapped a[${f.j}] and a[${f.j + 1}].` : `Compare a[${f.j}] and a[${f.j + 1}].`);
}

const status = kit.status();
const player = kit.player([...bubbleSort(input)], { interval: 450, onFrame: draw, invalidation });

const keys = kit.toggle({
  label: 'Stable keys', value: useKeys,
  onInput: (v) => {
    useKeys = v;
    cellLayer.selectAll('g.cell').remove(); // a different key function matches nothing: start the join afresh
    draw(player.frame);
  },
});
const shuffle = kit.button('Shuffle', () => { input = random(); player.pause(); player.replace([...bubbleSort(input)]); });

fig.add(status);
fig.add(kit.transport(player));
fig.add(kit.row(keys, shuffle));
return fig.el;
