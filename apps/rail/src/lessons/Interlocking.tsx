import { LoopPanel } from '../figures/LoopPanel';
import { markDone } from '../progress';
import { Check, Fact } from '../ui/blocks';

export default function Interlocking() {
  return (
    <div className="prose">
      <p className="lede">At junctions and loops the signals don't clear by themselves. The controller sets a route, and a machine checks every route against every other before it lets a signal clear.</p>

      <h2>Routes, not levers</h2>
      <p>
        A controller doesn't move points and clear signals one at a time. They ask for a <span className="term">route</span>: from an entrance signal to an exit.
        The <span className="term">interlocking</span> then does the rest, in a fixed order:
      </p>
      <ol>
        <li>Check that no other route already holds any of the track this one needs.</li>
        <li>Move the points the route needs, and prove they have moved and locked.</li>
        <li>Lock the points and reserve the track, so nothing else can be set over it.</li>
        <li>Check the track is clear, then clear the entrance signal.</li>
      </ol>
      <p>
        Older interlockings did this with mechanical locking bars between levers, then with relays. Modern ones run software. The idea hasn't changed since the
        lever frame. It is impossible, not just forbidden, to clear a signal for a route that conflicts with one already set. The controller can ask for a
        dangerous route, and the interlocking will refuse it.
      </p>

      <LoopPanel />

      <h2>Crossing two trains</h2>
      <p>
        Here is Coolabah from the first lesson, as a controller sees it. To cross a down train and an up train, set <code>S1 → main</code> and{' '}
        <code>S2 → loop</code>. They share no track, so both can be set at once. Now try <code>S2 → main</code>: it needs the main line, which S1's route holds.
        Refused. This is how a head-on collision is ruled out at a loop.
      </p>
      <p>
        Notice S1 shows <b>Caution</b>, not Clear. The route leads to S3 or S5, which are still at stop until you set a departure route. The aspect a signal shows
        depends on the signal ahead, just like on plain line.
      </p>

      <h2>Approach locking</h2>
      <p>
        Suppose S1 is clear for the main and a train is bearing down on it. The controller changes their mind and cancels the route. S1 goes back to stop at once.
        But the driver may already be too close to stop, and has seen a proceed aspect. If the interlocking freed the points straight away, someone could swing
        them under the train.
      </p>
      <p>
        So when a train is approaching, cancelling the route puts the signal to stop but keeps the route locked. It stays locked until a timer runs out (often a
        couple of minutes) or the train is proven to have stopped or passed. Turn on the approaching train and try it.
      </p>

      <Fact q="Why would a controller ever cancel a route a train is approaching?">
        <p>
          Something changed. A track worker reports something on the line, another train has a problem, or the controller realises they have set the wrong route.
          Putting a signal back to stop in an emergency is always allowed. Approach locking makes sure it can't create a new danger while it does it.
        </p>
      </Fact>

      <Fact kind="watch out" q="If the interlocking refuses bad routes, why do signallers still have rules about checking the panel before acting?">
        <p>
          The interlocking only knows what its inputs tell it. Most incidents involve something it can't see: a worker on the track, a signal being passed at stop
          under authority, a failed track circuit worked around under the rules, or equipment disconnected for maintenance. In all of those the safety comes from
          people following procedure, and the interlocking can no longer stop a mistake.
        </p>
      </Fact>

      <Check
        q="S1 → main is set and a train is approaching S1. You cancel the route. What happens?"
        onAnswered={(r) => r && markDone('interlocking')}
        options={[
          { text: 'S1 goes to stop, and the route and points are freed immediately.', why: 'That would let points move in front of a train that may not be able to stop. That is exactly what approach locking prevents.' },
          { text: 'S1 stays clear until the train has passed it.', why: 'A signal can always be put back to stop. What is held is the route behind it, not the aspect.' },
          { text: 'S1 goes to stop, but the route stays locked until a timer runs out or the train is proven stopped or past.', right: true, why: 'The aspect changes at once. The locking is released only when it is safe to.' },
        ]}
      />
    </div>
  );
}
