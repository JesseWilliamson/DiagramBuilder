import { RunAround } from '../figures/RunAround';
import { markDone } from '../progress';
import { Fact } from '../ui/blocks';

export default function Shunting() {
  return (
    <div className="prose">
      <p className="lede">Not every movement is a train going somewhere. In yards and terminals, vehicles are sorted, attached, detached and turned around at walking pace. That's shunting, and it has its own rules because its dangers are different.</p>

      <h2>Shunt movements are not trains</h2>
      <p>
        A train on the running line is protected by signals, interlocking or authorities that keep the line ahead clear. A <span className="term">shunt movement</span>{' '}
        usually isn't. It may be going into a siding with wagons already in it, or up to a stop block, or onto a vehicle to couple to it. Ahead of it the line is
        often <em>not</em> clear, on purpose. So shunt movements run slowly, at a speed at which they can stop within the distance that is seen to be clear, and
        they are controlled by people on the ground, not by the track.
      </p>
      <p>From a controller's point of view, the useful distinctions are:</p>
      <ul>
        <li>
          <b>Where.</b> Inside a yard, movements may be run by a yard controller or the shunting crew under the yard's local instructions. Where a shunt crosses
          or uses a running line, the network controller or signaller authorises it, often by a <span className="term">shunt signal</span>, the small signal you
          met in the hardware lesson.
        </li>
        <li>
          <b>Who directs it.</b> A qualified shunter (in some places, the driver) directs the movement by handsignals or radio, and is the person the driver
          watches and listens to.
        </li>
        <li>
          <b>Which way.</b> A loco pulling vehicles behind it can see where it is going. A loco <span className="term">propelling</span> (pushing) vehicles
          can't. The driver may be hundreds of metres from the leading end.
        </li>
      </ul>

      <h2>Propelling and the distance call</h2>
      <p>
        When propelling, the shunter rides or walks at the leading end, where they can see, and talks the driver in. Over radio this is commonly a countdown of
        the distance left, often in wagon lengths, for example "ten wagons… five… three… two… one… stop". The driver brakes to that countdown, not to anything
        they can see. That is why the rules are strict about it. If the calls stop, the driver stops. Silence never means "keep going".
      </p>

      <Fact kind="watch out" q="A driver is propelling to a shunter's countdown. The radio goes quiet at 'three wagons'. What should the driver do, and why?">
        <p>
          Stop, at once. The driver can't see the leading end, so the countdown is their only information about the distance left. A dead battery, a radio
          shadow or an injured shunter all sound the same: silence. Treating silence as "keep going" turns a radio fault into a collision. Treating it as "stop"
          turns it into a short delay.
        </p>
      </Fact>

      <h2>A run-around</h2>
      <p>
        A train arrives at a terminal with its loco at the front. To leave the way it came, the loco has to get to the other end. If there is no turntable or
        triangle, the loco <span className="term">runs around</span> the train through a loop. It's the most basic shunt there is, and it has a safe order that
        is easy to get wrong:
      </p>
      <ol>
        <li><b>Secure the vehicles before uncoupling.</b> Once the loco is uncoupled, the wagons' air brakes start leaking off. Handbrakes (or chocks, or both, by local instructions) hold them.</li>
        <li><b>Set the points before moving over them.</b> A loco that runs over points set against it damages them, and in the facing direction can derail.</li>
        <li><b>Couple before releasing the handbrakes.</b> Until the loco is coupled and the brake pipe is charged, the handbrakes are the only thing holding the wagons.</li>
        <li><b>Brake test before departing,</b> with the handbrakes off. Any time the brake pipe has been broken and remade, the brakes must be proven to work through to the last vehicle.</li>
      </ol>

      <RunAround onDone={() => markDone('shunting')} />

      <Fact q="Why does the loco stop short of the wagons before coupling, rather than just running into them slowly?">
        <p>
          Stopping short lets the shunter check that the couplers are lined up and that nobody is between the vehicles, and lets the driver judge the last metre
          precisely. Couplers that meet off-centre won't engage. And "slowly" running into a heavy rake still moves it, and the wagons it shoves can shove others
          further down the siding.
        </p>
      </Fact>

      <h2>Where the controller comes in</h2>
      <p>
        Most of a run-around is invisible to a network controller. What they see is the edges. The train arrives and its authority is fulfilled. The crew may
        ask for points or shunt signals worked if the loop is controlled from the board. Then the crew reports the run-around done, the brake test complete and the
        train ready, and asks for an authority to depart. The controller relies on that report. They can't see whether the brake test was done properly, any more
        than they could see whether 9MB2 was complete at Coolabah. Much of rail safety is people at the two ends of a radio trusting each other to have done the
        part the other can't see.
      </p>
    </div>
  );
}
