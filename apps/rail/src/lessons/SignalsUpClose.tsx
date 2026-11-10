import { LampProving } from '../figures/LampProving';
import { Trainstop } from '../figures/Trainstop';
import { markDone } from '../progress';
import { Check, Fact } from '../ui/blocks';

export default function SignalsUpClose() {
  return (
    <div className="prose">
      <p className="lede">A signal looks like a set of traffic lights on a pole. It is built to a much harsher standard, because a driver can't stop on sight and there is no one at the intersection to sort it out.</p>

      <h2>What's on the post</h2>
      <p>
        A colour-light signal is a <span className="term">head</span> (a housing with one lamp per colour) on a post or gantry, placed so a driver can see it in
        good time from the approach. Each part is there for a reason:
      </p>
      <ul>
        <li><b>Lamps.</b> Older signals used filament lamps with lenses. Most new and renewed signals use LED modules, which last far longer and fail more gracefully, one LED at a time instead of all at once.</li>
        <li><b>Hoods</b> over each lamp keep low sun off the lens. Sunlight on an unlit lens can make it look lit. This is called <em>phantom</em> aspect, and it is a real hazard.</li>
        <li><b>A backboard</b> (the dark surround) gives the lamps contrast against sky and scenery.</li>
        <li><b>An identification plate</b> carries the signal's number. That number is how drivers and controllers name it in every safety-critical conversation.</li>
      </ul>
      <p>
        Why one lamp per colour, rather than one lamp with changing filters? Separate lamps can each be proved separately, and a lamp that fails takes out
        one aspect, not all of them. Many networks also use more than one head on a signal, to tell the driver about speed as well as occupancy. NSW, for
        example, signals the speed of a diverging route with the combination of heads. The details are network-specific, and their rulebooks set them out.
      </p>

      <h2>Lamp proving</h2>
      <p>
        The interlocking doesn't assume a lamp is lit because it switched it on. It <span className="term">proves</span> it, by detecting current actually
        flowing through the lamp. That matters most for the red. A signal that should be at stop but is dark tells the driver nothing, and in fog or at night a
        driver may not spot an unlit signal at all.
      </p>
      <p>
        So the system plans for it. If a less restrictive lamp fails, the signal falls back to the next more restrictive one it can prove. If the red fails, the
        signal can't show stop, so the <em>signal in rear</em> is held at stop. The driver is then approaching the dark signal at a speed they can stop from.
        The rules back this up: a dark signal, or one showing an unclear aspect, is treated as at stop and reported.
      </p>

      <LampProving />

      <Fact q="B should be at Clear but its green lamp has failed. Why does it show Caution, and not Stop?">
        <p>
          Caution is the next more restrictive aspect it can prove, and it is still safe. The signal in rear is told B is at caution, and the driver is warned to
          be ready to stop at the signal after B. Dropping straight to Stop would also be safe, but it would stop every train for a lamp fault. Failing to the
          nearest safe state, rather than the most restrictive one, keeps trains moving without giving away any safety.
        </p>
      </Fact>

      <h2>Route indicators and shunt signals</h2>
      <p>
        At a junction, the main signal says whether the train may go and how fast, but the driver also needs to know <em>which way</em> it is going. A{' '}
        <span className="term">route indicator</span> beside or above the signal lights up for a diverging route. Depending on the network it is a row of
        lights angled the way the route goes, or an alphanumeric display showing a platform or line. The driver checks it matches the route they expect. If it
        doesn't, they stop and ask.
      </p>
      <p>
        <span className="term">Shunt signals</span> (also called subsidiary or low-speed signals, depending on the network) are small signals, often at ground
        level or below a main signal. They authorise slow movements: into a siding, into a platform that already has a train in it (to couple up), or around a
        yard. A shunt signal's proceed aspect means the route is set and locked. It does not mean the line ahead is clear. The driver must be able to stop short
        of anything on the track.
      </p>

      <Fact kind="watch out" q="A shunt signal shows proceed into a platform. The driver can see another train standing in it. Has something gone wrong?">
        <p>
          No, that is what shunt signals are for. A main signal clearing into an occupied section would be a serious failure. A shunt signal may clear into one,
          because the driver is moving at a speed where they can stop short. Confusing the two kinds of signal is what makes this dangerous, so they look very
          different on purpose.
        </p>
      </Fact>

      <h2>Trainstops</h2>
      <p>
        Signals rely on the driver obeying them. On Sydney's suburban network, many signals are backed up by a mechanical <span className="term">trainstop</span>:
        an arm beside the rail that is raised whenever the signal is at stop. If a train passes the signal at stop, the arm strikes a <span className="term">trip
        cock</span> under the leading car. That opens the brake pipe to air and puts the train into emergency braking.
      </p>

      <Trainstop />

      <p>
        A trainstop is simple and robust, but it only acts after the signal has been passed. The train still needs room to stop, so the overlap beyond the signal
        has to cover an emergency stop from the speed trains approach at. It also can't do anything about a train that is going too fast <em>before</em> a
        signal. That is the gap modern train protection fills, with balises and braking curves, in the <a href="#/lesson/train-protection">train protection lesson</a>.
        When a driver is authorised to pass a signal at stop, the rules cover how they pass the raised trainstop and recover from a trip.
      </p>

      <Check
        q="Signal B should be at stop, but its red lamp has failed and it is dark. What does the interlocking do with signal A, in rear of it?"
        onAnswered={(r) => r && markDone('signal-hardware')}
        options={[
          { text: 'Shows Caution at A, as it would for B at stop.', why: "Caution says \"be ready to stop at the next signal\". But the next signal is dark, and the driver may not see it. That isn't safe enough." },
          { text: 'Holds A at stop, so no train approaches the dark signal at speed.', right: true, why: "B's red can't be proved, so the protection moves back a signal. Drivers are stopped at A, and then approach B knowing to treat a dark signal as at stop." },
          { text: 'Nothing: the driver will treat the dark signal as at stop anyway.', why: "The rule says they should, but it relies on them seeing it. The interlocking doesn't rely on that alone." },
        ]}
      />
    </div>
  );
}
