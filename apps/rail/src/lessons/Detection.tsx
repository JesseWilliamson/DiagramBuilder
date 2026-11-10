import { AxleCounterFig } from '../figures/AxleCounterFig';
import { TrackCircuitFig } from '../figures/TrackCircuitFig';
import { markDone } from '../progress';
import { Check, Fact } from '../ui/blocks';

export default function Detection() {
  return (
    <div className="prose">
      <p className="lede">Signals and interlockings only know where trains are because something on the track tells them. There are two common ways to do it, and both fail in particular ways that a controller has to understand.</p>

      <h2>Track circuits</h2>
      <p>
        A <span className="term">track circuit</span> uses the rails as wires. At one end a <span className="term">feed</span> puts a small voltage across the two rails;
        at the other end a <span className="term">relay</span> is connected across them. With nothing on the track, current flows down one rail, through the relay
        coil, and back along the other. The relay is held up.
      </p>
      <p>
        A wheelset is a solid steel axle with a wheel on each rail, so it short-circuits the two rails. Current takes that easy path instead of the relay, which
        drops. The interlocking reads <b>relay up as clear</b> and <b>relay down as occupied</b>.
      </p>
      <p>
        That choice of direction is the whole design. Almost every fault you can think of (the feed loses power, a wire breaks, a rail breaks, the relay coil
        burns out) stops current reaching the relay. The relay drops, and the track reads as occupied. To get a false <em>clear</em>, something has to keep the
        relay up when it shouldn't, which is much harder to happen by accident.
      </p>

      <TrackCircuitFig />

      <h3>Right-side and wrong-side failures</h3>
      <p>
        Railway engineers sort failures by which way they fail. A <span className="term">right-side failure</span> makes the system more restrictive than it
        should be: a clear track reading as occupied, a signal stuck at stop. It costs delays, never safety. A <span className="term">wrong-side failure</span> makes
        it less restrictive: an occupied track reading clear. That is the one that can kill, and signalling is designed so that it is as rare as possible.
      </p>

      <h3>When a vehicle doesn't shunt</h3>
      <p>
        The weak point of a track circuit is the contact between wheel and rail. The wheels have to <span className="term">shunt</span> the circuit: their resistance
        has to be low enough to pull the relay down. Heavy trains running often keep the railhead bright, and their weight cuts through dirt. But on lightly used
        track the railhead rusts. Leaves, sand or contamination can insulate it. A light vehicle, such as a hi-rail road-rail vehicle, a track trolley or a
        single light railcar, may not press hard enough to break through. The relay stays up, and the track reads clear with a vehicle on it. That is a wrong-side
        failure, and you just made one in the figure.
      </p>
      <p>
        That is why the rules treat track vehicles differently from trains. They usually work under an authority such as a TOA, so their protection never
        depends on a track circuit seeing them. It is also why a line that has been out of use may need its railhead cleaned, or trains run over it, before its
        track circuits can be trusted again.
      </p>

      <Fact q="Track circuits come in DC, AC and audio-frequency types. Why would you need anything but the simplest, DC?">
        <p>
          On electrified lines the rails also carry the traction return current back to the substation, which would swamp a DC track circuit, so AC or
          coded circuits are used that the relay can tell apart from traction current. <span className="term">Audio-frequency</span> track circuits go further: each
          section uses its own frequency, so neighbouring sections can be separated electrically, with tuned circuits, instead of with insulated joints cut into
          the rail. That gives jointless, continuously welded rail, with fewer weak spots and less maintenance.
        </p>
      </Fact>

      <h2>Axle counters</h2>
      <p>
        An <span className="term">axle counter</span> takes a completely different approach. Instead of watching the whole section, it watches its ends. A{' '}
        <span className="term">counting head</span> clamped to the rail at each boundary detects each wheel as it passes, and works out which way it is moving. An
        evaluator compares the axles counted in with the axles counted out. Equal means clear. Anything else means occupied.
      </p>
      <p>
        Axle counters don't care about rust, leaves or wheel–rail contact, and one pair of heads can cover a long section without any track circuit equipment
        between them. That makes them popular for long sections and rusty or lightly used lines. But they have a weakness of their own. The evaluator has no idea
        what is <em>in</em> the section. It only knows the numbers. If something upsets the count (a power interruption, a head disturbed by track work, an axle
        missed or double-counted) the section is left showing occupied, and it stays that way until someone <span className="term">resets</span> it.
      </p>

      <AxleCounterFig onProved={() => markDone('detection')} />

      <h2>A reset is a safety decision</h2>
      <p>
        Resetting an axle counter tells the system "trust me, the section is empty", and from then on it does. If you are wrong, you have made a wrong-side
        failure by hand: a vehicle in a section that the signals believe is clear. So the rules wrap resets in procedure. The controller or signaller must have
        good reason to believe the section is clear before resetting, and is typically required to prove it. That might mean having it examined, or (common on
        many systems) having the first train after a reset pass through at restricted speed, ready to stop short of anything in its way. Some axle counter
        systems build that in and only show the section fully clear after a train has run through it following the reset.
      </p>

      <Fact kind="watch out" q="Your panel shows an axle counter section occupied. The last train through reported nothing unusual and arrived complete at the next station. Is it safe to reset?">
        <p>
          It's good evidence, but check what it actually proves. A train confirmed complete at the next station tells you nothing about a vehicle that entered the
          section some other way, or about track machines and road-rail vehicles that were on-tracked inside it. Before a reset, the controller thinks about
          everything that could be in there, not just the last train, and then follows the network's reset procedure.
        </p>
      </Fact>

      <Check
        q="Which of these is a wrong-side failure?"
        onAnswered={(r) => r && markDone('detection')}
        options={[
          { text: 'A track circuit drops because its feed loses power, holding a signal at stop with no train present.', why: "That's a right-side failure: more restrictive than reality. Trains are delayed, nobody is put at risk." },
          { text: 'A light track vehicle on a rusty rail fails to shunt the track circuit, which keeps reading clear.', right: true, why: 'The system shows clear while a vehicle is there. That is less restrictive than reality, which is exactly the failure signalling is designed to make rare, and the reason the rules protect track vehicles with authorities rather than track circuits.' },
          { text: 'An axle counter section stays occupied after a power dip, until it is reset.', why: "Right-side again: it shows occupied when it may well be clear. The danger comes later, if it is reset without proving it clear." },
        ]}
      />
    </div>
  );
}
