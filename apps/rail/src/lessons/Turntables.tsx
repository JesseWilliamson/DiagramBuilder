import { TriangleTurn } from '../figures/TriangleTurn';
import { TurntableFigure } from '../figures/TurntableFigure';
import { markDone } from '../progress';
import { Check, Fact } from '../ui/blocks';

export default function Turntables() {
  return (
    <div className="prose">
      <p className="lede">A train can't do a U-turn. Most of the time that doesn't matter, but some vehicles only work one way round, and the railway has three ways of turning them: a turntable, a triangle and a loop.</p>

      <h2>Why turn anything?</h2>
      <p>
        Many locomotives have a cab at one end only. Run one "long end leading" and the driver is looking down the length of the engine rather than at the track,
        so on most networks it's avoided or restricted. Steam locomotives are worse, with the tender in front and the crew's view blocked. Some passenger vehicles
        are directional too: observation cars and power cars belong at one end of a train, and seats may face one way. And whole trains sometimes need turning,
        which is a different problem again.
      </p>
      <p>
        Modern trains often dodge the question. A loco at each end, a cab at each end of a multiple unit, or a push-pull set with a driving trailer can simply drive
        back the other way. Turning still matters for single-cab freight locos, heritage operations, and the big bulk terminals.
      </p>

      <h2>The turntable</h2>
      <p>The classic answer, still found at loco depots and heritage sites. It has a few parts:</p>
      <ul>
        <li><b>The pit:</b> a circular hole in the ground the bridge turns in.</li>
        <li><b>The bridge</b> (or girder), carrying a single track across the pit. It rotates on a <b>centre pivot</b> that takes most of the weight. Wheels at each
          end run on a circular rail around the bottom of the pit and steady it.</li>
        <li><b>Radial roads:</b> tracks leading off the pit like spokes, to the main line and often to the stalls of a roundhouse.</li>
        <li><b>Locking bolt:</b> a latch at the end of the bridge that drops into a socket at each road. It lines the rails up exactly and stops the bridge moving.</li>
      </ul>
      <p>
        The turntable has rules of its own. The bridge must not move while anything is rolling on or off it, and nothing must roll on or off unless the bridge is
        locked to that road. Otherwise a wheel finds a gap with no rail and drops into the pit. The loco is also stopped at the <span className="term">balance
        point</span>, its weight centred over the pivot, so the bridge turns easily and the end wheels aren't overloaded. It's an interlocking again, on a
        smaller scale.
      </p>

      <TurntableFigure />

      <Fact q="You turned the bridge 180° with the loco on it. Why is the loco now facing the other way, when it never moved along the track?">
        <p>
          It rotated with the bridge. Coming off onto the same road it came from, the end that was nearest the table is now the far end. On this table, turning it
          to any road changes where the cab points by exactly the angle the bridge turned.
        </p>
      </Fact>

      <h2>The triangle</h2>
      <p>
        A <span className="term">triangle</span> (or wye) turns vehicles with nothing but track and points. Three tracks meet in a triangle, usually with a short
        tail track beyond the apex. Go forward up one leg, reverse down the other, and go forward again. You come out facing the way you came. Triangles were often
        built where junctions already made most of one, and a long enough tail turns a whole train.
      </p>

      <TriangleTurn />

      <h2>Balloon loops</h2>
      <p>
        At the biggest terminals, trains don't stop to turn at all. A <span className="term">balloon loop</span> takes the line round in a long loop and back onto
        itself, so a train runs round it and leaves the way it arrived. Australian bulk freight depends on them. Coal and grain trains can be well over a kilometre
        long, and at many mines and port terminals they are loaded or unloaded while creeping round the loop, never uncoupling and never reversing. The locos stay
        at the front throughout.
      </p>

      <Fact kind="watch out" q="A balloon loop turns the whole train. What does that mean for a train with wagons that all have their handbrakes at one end?">
        <p>
          After the loop, every wagon is facing the other way: handbrake wheels, brake equipment and any directional fittings are now on the opposite side. Staff
          working on the train afterwards have to expect that. It's a small example of why yards keep track of which way vehicles are facing.
        </p>
      </Fact>

      <Check
        q="A single-cab loco is on the turntable bridge, which is locked to a stall road. You want to turn it to the main-line road. What is the right order?"
        onAnswered={(r) => r && markDone('turntables')}
        options={[
          { text: 'Turn the bridge to the main-line road, then withdraw the bolt and drive off.', why: "The bridge can't turn with the bolt in, and once the bolt is out, nothing should drive off until the bridge is locked again." },
          { text: 'Withdraw the bolt, turn the bridge until it lines up with the main-line road, insert the bolt, then drive off.', right: true, why: 'Unlock, turn, lock, move. Movement on and off the bridge only ever happens with the bridge locked to that road.' },
          { text: 'Drive the loco off first so the bridge is lighter to turn.', why: "Then the loco hasn't been turned. And it's sitting on the stall road it started from." },
        ]}
      />
    </div>
  );
}
