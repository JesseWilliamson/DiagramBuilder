import { BrakingCurve } from '../figures/BrakingCurve';
import { markDone } from '../progress';
import { Check, Fact } from '../ui/blocks';

export default function TrainProtection() {
  return (
    <div className="prose">
      <p className="lede">Everything so far keeps trains apart by telling the driver what to do. Train protection is for the moment the driver doesn't do it.</p>

      <h2>Why signals aren't enough</h2>
      <p>
        A red signal doesn't stop a train. The driver does, after seeing it, recognising it, and braking in time. Drivers are good at this, millions of times a
        year. But a tired, distracted or mistaken driver can pass a signal at stop. That is a <span className="term">SPAD</span> (signal passed at danger), and it
        is one of the most watched safety measures on any railway. The overlap beyond the signal gives a margin for a small misjudgement. It isn't enough for a
        driver who hasn't seen the signal at all.
      </p>
      <p>
        <span className="term">Automatic train protection (ATP)</span> closes that gap. Something other than the driver checks that the train is going to stop
        where it must, and applies the brakes if it isn't.
      </p>

      <h2>The trainstop: protection at the signal</h2>
      <p>
        The oldest form is mechanical. Sydney's suburban network has long used <span className="term">trainstops</span>: an arm beside the rail at each signal,
        raised when the signal is at stop. A train that passes it strikes a trip valve on the bogie, which vents the brake pipe and makes an emergency brake
        application. (The <a href="#/lesson/signal-hardware">signals up close</a> lesson shows one.) It is simple and robust, and its limit is in where it acts:{' '}
        <em>at</em> the signal. A fast train tripped there stops some way beyond it, so the overlap has to be long enough, and it can't help with overspeed
        anywhere else.
      </p>

      <h2>ETCS: protection along the whole approach</h2>
      <p>
        The <span className="term">European Train Control System (ETCS)</span> moves the check into a computer on the train, the <span className="term">EVC</span>,
        which knows two things at all times: how far the train is allowed to go, and how fast it is going. From those it works out, continuously, whether the
        train can still stop in time.
      </p>
      <h3>Balises</h3>
      <p>
        On ETCS Level 1, the train learns where it is and how far it may go from <span className="term">balises</span>. These are flat transponders fixed between
        the rails, usually in groups of two or more so the train can tell which way it is passing over them. A balise has no battery. An antenna under the train
        powers it by radio as it passes overhead, and the balise answers with a short <span className="term">telegram</span>. A <span className="term">fixed</span>{' '}
        balise always sends the same data: its identity and position, gradients, speed limits. A <span className="term">switchable</span> balise is wired to a
        lineside electronic unit (LEU) that reads the signal it belongs to and changes the telegram with it. That telegram carries the{' '}
        <span className="term">movement authority</span>: how far the train may go, usually to the next signal at stop.
      </p>
      <p>
        Between balises, the EVC measures how far it has travelled from wheel rotation and other sensors, and resets its position each time it passes a balise.
        That is how it knows the distance left to the end of its authority.
      </p>

      <h3>Braking curves</h3>
      <p>
        From the end of authority and its own braking ability, the EVC draws a set of <span className="term">braking curves</span>: for every point on the
        approach, the highest speed from which it can still stop in time. The physics is the formula from school: stopping from speed v at deceleration a takes
        d = v² / 2a. So with d metres to go, the limit is v = √(2ad). The EVC supervises several curves. A warning sounds when the driver gets close. Then there
        is the permitted speed. Then, at the <span className="term">intervention</span> curve, the computer stops waiting and applies the brakes itself.
      </p>

      <BrakingCurve onSaved={() => markDone('train-protection')} />

      <p>
        Try braking at 1,300 m without ETCS: the driver brakes, but not hard enough soon enough, and passes the signal. Turn ETCS on and run it again. The train
        crosses the red curve, the brakes go on, and it stops short. That is the whole value of ATP: it doesn't need the driver to have noticed.
      </p>
      <p>
        The real curves are less tidy than these. The EVC adds the time a driver takes to react and the time the brakes take to build up, allows for gradients
        and for how well this particular train brakes, and keeps a margin for error in its own position. All of these push the curves earlier.
      </p>

      <Fact q="On Level 1 the movement authority only changes when the train passes a switchable balise. What goes wrong if the signal clears just after the train has passed one?">
        <p>
          The train still holds the old authority, to the signal at stop, so the EVC keeps braking it towards a signal that is now clear. It learns otherwise only
          at the next balise group, perhaps at the signal itself. That wastes time and capacity. <span className="term">Infill</span> balises (or a radio infill)
          placed further back on the approach give the train an update sooner. <span className="term">Level 2</span> does away with the problem: the train gets
          its authority continuously by radio from a control centre, and balises are used only as fixed position references.
        </p>
      </Fact>

      <h2>In Australia</h2>
      <p>
        Train protection is being rolled out in stages and in different forms. Sydney Trains has been fitting ETCS Level 1 on parts of its network, and its
        Digital Systems program plans ETCS Level 2 for the busiest lines. Brisbane's Cross River Rail project is introducing ETCS Level 2 in the new tunnel and the
        lines around it. ARTC, on the interstate network, developed a different system (ATMS) that is built on satellite positioning and data radio, not on
        lineside signals and balises. These programs change, so check where any of them stands now. The principle is the same in all of them: know where the
        train may go, know where it is, and brake for the driver if it won't stop in time.
      </p>

      <Fact kind="watch out" q="If ETCS will stop the train anyway, does it matter if a driver relies on it?">
        <p>
          Yes. Protection systems are a last line of defence, not the way the railway is meant to work. An intervention is an emergency brake application, hard on
          the train, the passengers and the track, and it is treated as an incident. Equipment can also be isolated, faulty, or not fitted on part of the route.
          From the controller's side, a train working with its protection isolated is one more thing to know about, because the rules for it are more
          restrictive.
        </p>
      </Fact>

      <Check
        q="A driver approaching a signal at stop is still at line speed when the train crosses the intervention curve. What does ETCS do?"
        onAnswered={(r) => r && markDone('train-protection')}
        options={[
          { text: 'Sounds a warning and waits for the driver to brake.', why: 'The warning came earlier, at the gentler curve. The intervention curve is the point after which waiting is no longer safe.' },
          { text: 'Applies the brakes itself, early enough to stop before the end of authority.', right: true, why: 'The intervention curve is drawn so that braking from any point on it still stops the train in time, allowing for reaction and brake build-up. Above it, the computer acts.' },
          { text: 'Nothing until the train reaches the signal, then trips the brakes.', why: "That's how a trainstop works: at the signal. ETCS supervises the whole approach, so it can act before the train gets there." },
        ]}
      />
    </div>
  );
}
