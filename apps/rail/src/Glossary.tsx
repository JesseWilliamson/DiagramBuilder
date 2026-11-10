import { useMemo, useState } from 'react';

const terms: { term: string; abbr?: string; def: string; lesson?: string }[] = [
  { term: 'Absolute Signal Blocking', abbr: 'ASB', def: 'Worksite protection in which the signals protecting a worksite are held at stop with blocking facilities applied. Formerly Controlled Signal Blocking on some networks.', lesson: 'protection' },
  { term: 'Approach locking', def: 'Interlocking that keeps a route locked after its signal is put back to stop while a train is approaching, until a timer runs out or the train is proven stopped or past.', lesson: 'interlocking' },
  { term: 'Aspect', def: 'What a signal shows the driver, such as stop, caution or clear.', lesson: 'signals' },
  { term: 'Authority', def: 'Permission for a train or a work group to occupy a defined piece of track. Two authorities must never cover the same track.', lesson: 'single-line' },
  { term: 'Automatic signal', def: 'A signal that clears and returns to stop by itself, according to the track circuits ahead. In NSW, marked with an "A" plate.', lesson: 'signals' },
  { term: 'Axle counter', def: 'Train detection that counts axles into and out of a section. The section is clear when the counts match.', lesson: 'signals' },
  { term: 'Block section', def: 'A length of track that only one train may occupy at a time.', lesson: 'signals' },
  { term: 'Blocking facility', def: 'A control applied on the panel that stops a signal from being cleared or a set of points from being moved.', lesson: 'protection' },
  { term: 'Controlled signal', def: 'A signal that clears only when a route is set by the controller. At stop it is absolute: it may be passed only with authority.', lesson: 'interlocking' },
  { term: 'Crossing loop', def: 'A short length of second track on a single line where one train stands clear while another passes.', lesson: 'desk' },
  { term: 'Fail-safe', def: 'Designed so that a failure produces the most restrictive state, for example a failed track circuit reads as occupied.', lesson: 'signals' },
  { term: 'Fouling', def: 'Standing or extending close enough to a line that a train on it could strike you or your train.', lesson: 'desk' },
  { term: 'Fulfil', def: 'To hand back an authority once the train or work group is completely clear of it, so the track can be used again.', lesson: 'single-line' },
  { term: 'Interlocking', def: 'The equipment that controls points and signals so that conflicting routes cannot be set and signals cannot clear unless it is safe.', lesson: 'interlocking' },
  { term: 'Local Possession Authority', abbr: 'LPA', def: 'Closes a defined portion of track for a period, under the control of the Protection Officer in charge of the possession.', lesson: 'protection' },
  { term: 'Lookout Working', def: 'Work protected only by lookouts warning workers of approaching trains, so they can move to a safe place in time.', lesson: 'protection' },
  { term: 'Network Control Officer', abbr: 'NCO', def: 'ARTC\'s title for the person who controls train movements over a part of its network. Signaller is the usual equivalent on metropolitan networks.', lesson: 'desk' },
  { term: 'Overlap', def: 'A safety margin beyond a stop signal that must be clear (and locked, for a controlled signal) before the signal in rear can clear.', lesson: 'signals' },
  { term: 'Points', def: 'The movable rails that divert trains from one track to another. Normal and reverse are their two positions.', lesson: 'interlocking' },
  { term: 'Protection Officer', def: 'The qualified worker responsible for arranging and keeping protection for a work group on or near the track.', lesson: 'protection' },
  { term: 'Repeat-back', def: 'Reading a safety-critical message back to its sender in full, so they can confirm it was received correctly.', lesson: 'comms' },
  { term: 'Restricted speed', def: 'A speed at which a train can stop short of any obstruction within the distance the driver can see.', lesson: 'comms' },
  { term: 'Route', def: 'A path from an entrance signal to an exit, with the points it needs set and locked and the track it crosses reserved.', lesson: 'interlocking' },
  { term: 'Safety-critical communication', def: 'Any message where a misunderstanding could lead to harm: authorities, protection, passing signals, train completeness.', lesson: 'comms' },
  { term: 'Track circuit', def: 'An electrical circuit through the rails that detects a train by the short its wheels and axles make.', lesson: 'signals' },
  { term: 'Track Occupancy Authority', abbr: 'TOA', def: 'Gives a work group exclusive occupancy of the track between two locations for a period. Trains may not enter without the Protection Officer\'s agreement.', lesson: 'protection' },
  { term: 'Train graph', def: 'A time-distance chart of every train on a line, the controller\'s main planning tool.', lesson: 'desk' },
  { term: 'Train order working', def: 'A safeworking system for unsignalled lines in which trains run on authorities issued by the controller.', lesson: 'single-line' },
];

export function Glossary() {
  const [q, setQ] = useState('');
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? terms.filter((t) => `${t.term} ${t.abbr ?? ''} ${t.def}`.toLowerCase().includes(s)) : terms;
  }, [q]);
  return (
    <div>
      <div className="eyebrow">Reference</div>
      <h1>Glossary</h1>
      <p className="lede">The words used in this course, as they are used on NSW-derived rulebooks. Other networks use different names for some of the same ideas.</p>
      <input className="search" type="search" placeholder="Search terms…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search the glossary" />
      <dl className="gloss">
        {shown.map((t) => (
          <div key={t.term} style={{ display: 'contents' }}>
            <dt>{t.term}{t.abbr && <small>{t.abbr}</small>}</dt>
            <dd>{t.def}{t.lesson && <> <a href={`#/lesson/${t.lesson}`}>Lesson →</a></>}</dd>
          </div>
        ))}
      </dl>
      {shown.length === 0 && <p className="muted">Nothing matches "{q}".</p>}
    </div>
  );
}
