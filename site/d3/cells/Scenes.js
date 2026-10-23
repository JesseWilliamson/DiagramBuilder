// Five shapes with labels. Shuffle reorders them, Add drops a new one in,
// Remove first lets the leftmost one fall away, Recolour changes every colour.
//
// The d3 idea is the *key function* in selection.data(items, d => d.id).
// d3 matches each datum to an existing element by id, so a join gives you three
// selections for free:
//   update  the id was there before and still is  -> it slides to its new slot
//   enter   a new id                              -> we create it and fade it in
//   exit    an id that is gone                    -> we fade it out, then remove it
// Without the key function d3 would match by position, and Shuffle would
// repaint every shape in place instead of moving them.

const tones = ['active', 'accent', 'success', 'danger', 'visited'];
let nextId = 5;
const make = (id) => ({ id, shape: id % 2 ? 'circle' : 'square', tone: tones[id % tones.length] });
let items = d3.range(5).map(make);

const W = 400, H = 110;
const slot = (i) => 40 + i * 64; // x of the i-th shape's centre

const fig = kit.figure(W, H);
const layer = fig.svg.append('g');

function draw(animate = true) {
  // the first draw just places things; later ones animate
  const go = (sel) => (animate ? kit.tr(sel) : sel.interrupt());
  layer
    // `:not(.leaving)` hides shapes that are fading out: pressing Remove twice
    // quickly must not join them again
    .selectAll('g.item:not(.leaving)')
    .data(items, (d) => d.id)
    .join(
      (enter) => {
        // new item: start above its slot and invisible; the transition below brings it in
        const g = enter.append('g').attr('class', 'item')
          .attr('transform', (d, i) => `translate(${slot(i)},${animate ? -50 : 0})`)
          .style('opacity', animate ? 0 : 1);
        g.append('g').attr('class', 'shape').attr('transform', 'translate(0,40)').each(function (d) {
          const s = d3.select(this);
          if (d.shape === 'circle') s.append('circle').attr('r', 22);
          else s.append('rect').attr('x', -22).attr('y', -22).attr('width', 44).attr('height', 44).attr('rx', 6);
        });
        g.append('text').attr('class', 'muted').attr('text-anchor', 'middle').attr('y', 90).style('font-size', '12px').text((d) => `#${d.id}`);
        return g;
      },
      (update) => update,
      (exit) =>
        // leaving: fall 90px below and fade; remove the node when the transition ends
        kit.tr(exit.classed('leaving', true))
          .attr('transform', function () { return this.getAttribute('transform').replace(/,[^)]*\)/, ',90)'); }) // keep x, change y
          .style('opacity', 0)
          .remove(),
    )
    // colour is not animated here at all: swapping the tone class changes the CSS
    // variables, and `.solid` has a CSS transition on fill and stroke
    .each(function (d) { d3.select(this).select('.shape > *').attr('class', `solid tone-${d.tone}`); })
    // every item that is in `items` (entered or updated) goes to its slot
    .call((g) => go(g).attr('transform', (d, i) => `translate(${slot(i)},0)`).style('opacity', 1));
}

fig.add(kit.row(
  kit.button('Shuffle', () => { items = d3.shuffle([...items]); draw(); }),
  kit.button('Add', () => { if (items.length < 6) { items = [...items, make(nextId++)]; draw(); } }),
  kit.button('Remove first', () => { items = items.slice(1); draw(); }),
  kit.button('Recolour', () => { items = items.map((d) => ({ ...d, tone: tones[Math.floor(Math.random() * tones.length)] })); draw(); }),
));
draw(false);
return fig.el;
