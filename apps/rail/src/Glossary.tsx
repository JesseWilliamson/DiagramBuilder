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
  { term: 'Wrong-side failure', def: 'A failure that makes the system less restrictive than reality, such as an occupied track reading clear. The dangerous kind.', lesson: 'detection' },
  { term: 'Right-side failure', def: 'A failure that makes the system more restrictive than reality, such as a clear track reading occupied. Costs delay, not safety.', lesson: 'detection' },
  { term: 'Shunt (a track circuit)', def: 'To bridge the two rails with a low enough resistance to drop the track relay, as a wheelset normally does. Rust or light vehicles can fail to shunt.', lesson: 'detection' },
  { term: 'Insulated joint', def: 'A rail joint that electrically separates two track circuits. Audio-frequency track circuits can do without them.', lesson: 'detection' },
  { term: 'Axle counter reset', def: 'Clearing a disturbed axle counter section so it shows clear again; a safety decision that requires the section to be proved clear first.', lesson: 'detection' },
  { term: 'Signal passed at danger', abbr: 'SPAD', def: 'A train passing a signal at stop without authority.', lesson: 'train-protection' },
  { term: 'Automatic train protection', abbr: 'ATP', def: 'Equipment that checks a train will stop or slow where it must and applies the brakes if the driver does not.', lesson: 'train-protection' },
  { term: 'European Train Control System', abbr: 'ETCS', def: 'A standard train protection system in which an onboard computer supervises speed against braking curves to the end of the movement authority.', lesson: 'train-protection' },
  { term: 'Balise', def: 'A transponder fixed between the rails, powered by a passing train, that sends it a telegram: position reference and, if switchable, the movement authority.', lesson: 'train-protection' },
  { term: 'Movement authority', abbr: 'MA', def: 'In ETCS, how far a train may go, usually to the next signal at stop, with the speeds that apply on the way.', lesson: 'train-protection' },
  { term: 'Braking curve', def: 'For each point on the approach, the highest speed from which a train can still stop by the end of authority: v = √(2ad), plus margins.', lesson: 'train-protection' },
  { term: 'Active level crossing', def: 'A level crossing that warns of trains itself, with flashing lights and bells, and often boom gates.', lesson: 'level-crossings' },
  { term: 'Passive level crossing', def: 'A level crossing protected by signs only (give way or stop); the road user must look for trains.', lesson: 'level-crossings' },
  { term: 'Strike-in', def: 'The point on the approach to a level crossing where a train starts the warning, usually the start of an approach track circuit or a treadle.', lesson: 'level-crossings' },
  { term: 'Island circuit', def: 'A short track circuit over the road at a level crossing. The warning ends (strike-out) only once the train has cleared it.', lesson: 'level-crossings' },
  { term: 'Constant warning time', abbr: 'CWT', def: "Level crossing equipment that measures an approaching train's speed and starts the warning so every train gets about the same warning time.", lesson: 'level-crossings' },
  { term: 'Turntable', def: 'A rotating bridge over a pit, on a centre pivot, used to turn locomotives and vehicles or move them between radial roads.', lesson: 'turntables' },
  { term: 'Balance point', def: "The position on a turntable bridge where a vehicle's weight is centred over the pivot, so the bridge turns easily.", lesson: 'turntables' },
  { term: 'Triangle', abbr: 'wye', def: 'Three tracks joined in a triangle, used to turn a vehicle or train with a forward, reverse, forward move.', lesson: 'turntables' },
  { term: 'Balloon loop', def: 'A loop of track that brings a line back onto itself, so a whole train turns without stopping; common at bulk loading and unloading terminals.', lesson: 'turntables' },
  { term: 'Lamp proving', def: 'Detecting that current actually flows through a signal lamp. If the red of a signal cannot be proved, the signal in rear is held at stop.', lesson: 'signal-hardware' },
  { term: 'Route indicator', def: 'An indicator lit beside or above a signal that shows the driver which way a diverging route goes, as an angled row of lights or a letter or number.', lesson: 'signal-hardware' },
  { term: 'Shunt signal', def: 'A small signal, also called subsidiary or low-speed, authorising slow movements over a set route that may be occupied, such as into a siding or an occupied platform.', lesson: 'signal-hardware' },
  { term: 'Trainstop', def: "An arm beside the rail, raised when its signal is at stop, which strikes a train's trip cock and applies the emergency brake if the signal is passed. Used on Sydney's suburban network.", lesson: 'signal-hardware' },
  { term: 'Switch blades', def: 'The two movable, tapered rails of a set of points, tied together by stretcher bars so that when one closes against its stock rail the other opens.', lesson: 'points' },
  { term: 'Crossing (of a turnout)', def: "The part of a turnout where one route's rail crosses the other's: a gap (the throat), a V-shaped nose and wing rails.", lesson: 'points' },
  { term: 'Check rail', def: 'A rail opposite a crossing that guides the other wheel of the axle, so the wheel crossing the gap cannot strike the wrong side of the nose.', lesson: 'points' },
  { term: 'Facing points', def: 'Points a train meets from the toe end, where the blades choose its route. The more dangerous direction, so the most proof is needed.', lesson: 'points' },
  { term: 'Trailing points', def: 'Points a train meets from the crossing end, where two routes merge. Trailing them the wrong way forces the blades over (a run-through).', lesson: 'points' },
  { term: 'Detection', def: 'Proof from the point machine that the closed blade is home, the open blade is clear and the lock is in. Signals over the points cannot clear without it.', lesson: 'points' },
  { term: 'Out of correspondence', def: 'Points not detected in the position they were called to. Every signal reading over them stays at stop.', lesson: 'points' },
  { term: 'Spring points', def: 'Points held normal by a spring, which trailing trains push through and which return by themselves. Used at some crossing loops.', lesson: 'points' },
  { term: 'Shunt movement', def: 'A low-speed movement of vehicles, usually in a yard or siding, directed by a shunter and made at a speed that can stop within the distance seen to be clear.', lesson: 'shunting' },
  { term: 'Propelling', def: 'A loco pushing vehicles ahead of it, so the driver cannot see the leading end and works to a shunter\'s directions.', lesson: 'shunting' },
  { term: 'Run-around', def: 'Moving a loco from one end of its train to the other through a loop, so it can lead the train back the way it came.', lesson: 'shunting' },
  { term: 'Brake test', def: 'Proving the air brakes apply and release on every vehicle to the last, required whenever the brake pipe has been broken and remade.', lesson: 'shunting' },
];

export function Glossary() {
  const [q, setQ] = useState('');
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (s ? terms.filter((t) => `${t.term} ${t.abbr ?? ''} ${t.def}`.toLowerCase().includes(s)) : terms).slice().sort((a, b) => a.term.localeCompare(b.term));
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
