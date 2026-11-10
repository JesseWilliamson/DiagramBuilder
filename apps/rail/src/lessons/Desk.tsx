import { TrainGraph } from '../figures/TrainGraph';
import { markDone } from '../progress';
import { Check, Fact } from '../ui/blocks';

export default function Desk() {
  return (
    <div className="prose">
      <p className="lede">A network controller has two jobs that pull against each other: keep the trains moving, and never let two of them, or a train and a person, be in the same place at once.</p>

      <p>
        The safety half is mostly done by systems: signals and interlocking where they exist, and written or electronic <span className="term">authorities</span>{' '}
        where they don't. The controller drives those systems. The other half, deciding <em>who goes first</em>, is judgement, and the tool for it is the{' '}
        <span className="term">train graph</span>.
      </p>

      <h2>The train graph</h2>
      <p>
        A train graph plots every train as a line: time across, distance down (or up) the page. Where two lines cross, two trains are at the same place at the same
        time. On double track that's fine, because they pass on different lines. On a <span className="term">single line</span> it can only happen at a{' '}
        <span className="term">crossing loop</span>, a short stretch of second track where one train stands clear while the other passes.
      </p>
      <p>
        So on a single line, the controller's question is <em>which loop?</em> The one where the two trains would meet anyway costs least. Pick a loop too early and
        the first train waits there a long time for the other. And a train can only stand in a loop that is longer than it is.
      </p>

      <TrainGraph />

      <Fact q="With the up train leaving at 06:00, the trains would meet near Coolabah. Why is Bellbird the best plan, and not Coolabah?">
        <p>
          Coolabah's loop is 1,200 m, and both trains are longer than that (1,500 m and 1,650 m). Whichever train went into the loop would leave its tail on the main
          line, fouling it, so the other could not pass. Of the loops they do fit, Bellbird costs about 50 minutes of delay and Dunmore about 58, so Bellbird wins, narrowly. This is a
          real constraint: train lengths have grown faster than loops on parts of the network, and loop length often decides how long a train can be.
        </p>
      </Fact>

      <h2>Plans change all day</h2>
      <p>
        Now move the up train's departure later. Its line slides right, 1MP5 gets further before they meet, the meeting point moves towards Emu Flat, and somewhere after 06:05 the best loop flips from Bellbird to Dunmore. A real board does
        this constantly. A train runs late, a loop is booked for track work, a crew is short of hours. The controller re-plans as it happens, and the crossings,
        holds and orders all come from the graph.
      </p>
      <p>
        The graph is a planning tool, not the safety system. A badly chosen crossing costs time. A crossing <em>authorised</em> badly could put two trains on the
        same section of single line. The next lessons are about the systems that stop that happening.
      </p>

      <Fact q="On a train graph, what does a perfectly horizontal (flat) part of a train's line mean?">
        <p>The train is at the same distance for a span of time, so it is standing still: held at a signal, crossing another train in a loop, or stopped at a platform.</p>
      </Fact>

      <Check
        q="The up train now leaves Emu Flat at 06:40. Where should the two trains cross?"
        onAnswered={(r) => r && markDone('desk')}
        options={[
          { text: 'Bellbird', why: '1MP5 would reach Bellbird at about 06:34 and wait there until 2PM4 arrives at about 08:01: roughly 90 minutes. Try it on the graph.' },
          { text: 'Coolabah', why: 'Neither train fits the 1,200 m loop, whatever the timing.' },
          { text: 'Dunmore', right: true, why: 'With the up train 40 minutes later, the meeting point moves towards Emu Flat. 2PM4 reaches Dunmore at about 07:12 and waits about 18 minutes for 1MP5; 1MP5 is not delayed at all.' },
        ]}
      />
    </div>
  );
}
