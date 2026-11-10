import { AuthorityDesk } from '../figures/AuthorityDesk';
import { markDone } from '../progress';
import { Fact } from '../ui/blocks';

export default function SingleLine() {
  return (
    <div className="prose">
      <p className="lede">Much of Australia's long-distance network has no lineside signals between stations at all. There, nothing on the track keeps trains apart. The controller does it, by deciding who may occupy which piece of line.</p>

      <h2>An authority is a piece of the line</h2>
      <p>
        In <span className="term">train order</span> territory (and the older single-line systems it replaced, like the electric staff), a train may only enter a
        section if it holds an <span className="term">authority</span> for it. The authority names a train, a start and an end. The controller issues it, the driver
        reads it back, and from then on that stretch of track belongs to that train until the authority is <span className="term">fulfilled</span>, handed back once
        the whole train is clear of it.
      </p>
      <p>
        Track workers get authorities too. A <span className="term">Track Occupancy Authority (TOA)</span> gives a work group's Protection Officer exclusive use of the
        track between two points, so no train may enter it. All of these come from the same pool. That makes the controller's rule very simple, and it is the same
        rule the interlocking enforced in the last lesson:
      </p>
      <p style={{ fontSize: 17, fontWeight: 600 }}>No two authorities may ever cover the same section of track.</p>
      <p>
        On ARTC's train order lines that check is increasingly done by software. Its control system will refuse to issue an overlapping authority, and electronic
        authorities can be sent to the locomotive over radio. The principle is the controller's to own either way. Here is a shift's worth of calls.
      </p>

      <AuthorityDesk onFinish={() => markDone('single-line')} />

      <h2>What made those calls right</h2>
      <ul>
        <li><b>Check the whole extent, not the end points.</b> "Emu Flat to Ardmore" sounds like one request but covers four sections, two of them already held.</li>
        <li><b>Crossings are planned with authorities.</b> Two opposing authorities that both end at a crossing loop are how two trains cross on a single line.</li>
        <li><b>Fulfilment needs proof the train is complete.</b> A train that has lost its rear vehicles is still occupying the section, and "I'm at Coolabah" doesn't say whether it has.</li>
        <li><b>Say why when you refuse.</b> Drivers and Protection Officers plan around your answer.</li>
      </ul>

      <Fact q="Why does the driver read an authority back, word for word, before it takes effect?">
        <p>
          Because the authority only exists as words: on a form, a screen, or the radio. If the driver writes "Coolabah" where you said "Bellbird", the train will
          run to Coolabah. The read-back is the only chance to catch the difference before it becomes a train in the wrong section. The last lesson is about
          exactly this.
        </p>
      </Fact>

      <Fact kind="watch out" q="A train holds an authority to Coolabah, and the driver radios that they've arrived. What's the trap?">
        <p>
          "Arrived" is about the front of the train. The authority can be fulfilled only when the <em>whole</em> train is clear of the section. If a coupling has
          parted, the rear half could still be standing in the section with nothing to show it's there: no track circuits, no signals. That's why the rules
          require the train's completeness to be confirmed before fulfilment.
        </p>
      </Fact>
    </div>
  );
}
