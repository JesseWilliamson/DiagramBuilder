import { AutoSignals } from '../figures/AutoSignals';
import { markDone } from '../progress';
import { Check, Fact } from '../ui/blocks';

export default function Signals() {
  return (
    <div className="prose">
      <p className="lede">A heavy train can need well over a kilometre to stop, and the driver can't see far enough ahead to stop short of whatever is there. So the line is cut into blocks, and a signal tells the driver whether the block ahead is free.</p>

      <h2>One train per block</h2>
      <p>
        A <span className="term">block section</span> is a length of track that only one train may be in at a time. Each block has a signal at its entrance. The
        railway needs to know whether the block is occupied, and on most signalled lines it finds out with a <span className="term">track circuit</span>: a small
        current sent down one rail and back up the other, through a relay. When a train's wheels and axles bridge the two rails, they short the circuit, the relay
        drops, and the block reads as occupied. Some lines use <span className="term">axle counters</span> instead, which count axles in and out at each end of a
        section.
      </p>
      <p>
        On plain line between junctions, signals are usually <span className="term">automatic</span>. Nobody sets them. They show whatever the track circuits tell
        them to. In this three-aspect example:
      </p>
      <ul>
        <li><b>Stop</b> (red): the block ahead is occupied.</li>
        <li><b>Caution</b> (yellow): the block ahead is clear, but the next signal is at stop, so be ready to stop there.</li>
        <li><b>Clear</b> (green): at least two blocks ahead are clear.</li>
      </ul>

      <AutoSignals />

      <h2>Failing to the safe side</h2>
      <p>
        Now fail the track circuit at S8. Nothing is there, but S8 shows Stop and S6 shows Caution, exactly as if a train were in the block. That is the point. A
        track circuit is built so that almost anything that goes wrong (a broken rail, a lost power feed, a failed relay) <em>drops</em> the relay, which reads
        as occupied. The system can't tell a fault from a train, so it assumes a train. This is called <span className="term">fail-safe</span> design. Its cost is
        delay: a failure stops traffic until someone deals with it.
      </p>
      <p>
        The controller deals with it. The track diagram on their screen shows the block occupied with no train there. Drivers report the signal at stop. The
        controller calls out the signal maintainers. Trains have to get past the failed block, but the rulebook still treats it as possibly occupied. A rail may
        really be broken. So any train passed through runs at restricted speed, able to stop short of an obstruction.
      </p>

      <Fact q="Why does the signal show Caution, and not Clear, when only the block after next is occupied?">
        <p>
          A driver passing a Clear signal may be running at line speed. If the next signal were at Stop, they might not be able to stop in the distance between
          the two. The Caution aspect gives them a whole block to brake in. Block lengths are set by braking distance for that reason: one block must be long
          enough to stop the worst-braking train from line speed.
        </p>
      </Fact>

      <h2>Two details the real system adds</h2>
      <p>
        <span className="term">Overlaps.</span> A driver might misjudge and stop a little past a red signal. So the signal in rear doesn't clear until the train
        ahead is some distance beyond the next signal. That distance, the overlap, is a safety margin past every stop signal.
      </p>
      <p>
        <span className="term">Automatic versus controlled signals.</span> Automatic signals clear by themselves. <span className="term">Controlled</span> signals
        at junctions and loops only clear when the controller sets a route (next lesson). The rules for passing them at stop differ. On NSW networks, automatic
        signals carry an "A" plate, and the rules let a driver pass one at stop under set conditions, at restricted speed. A controlled signal at stop is
        absolute: it can only be passed with the controller's authority. The comms lesson goes through that conversation.
      </p>

      <Check
        q="A driver calls: S8 is at stop, and as far as they can see the line ahead is empty. Your screen shows S8's track circuit occupied with no train in it. What is true?"
        onAnswered={(r) => r && markDone('signals')}
        options={[
          { text: "The track circuit has failed. The driver can carry on at normal speed, since you can see there's no train.", why: 'A failed track circuit can mean a broken rail, and "no train on my screen" is exactly what the failed equipment is no longer able to tell you. You can\'t rely on it.' },
          { text: 'Treat the block as possibly occupied. Arrange for the train to pass the signal under the rules, at a speed that lets it stop short of any obstruction, and report the fault.', right: true, why: 'The signal is doing its job by failing safe. The train can be moved past it, but under the rules, cautiously, because the fault could be a real obstruction.' },
          { text: 'Nothing can move until the maintainers fix the fault.', why: "Trains can be authorised past a failed signal, but cautiously. Stopping everything for hours isn't the only safe answer." },
        ]}
      />
    </div>
  );
}
