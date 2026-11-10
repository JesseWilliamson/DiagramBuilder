import { Turnout } from '../figures/Turnout';
import { markDone } from '../progress';
import { Check, Fact } from '../ui/blocks';

export default function Points() {
  return (
    <div className="prose">
      <p className="lede">Points (switches, in other countries) are the only part of the track that moves. Most of a signalling system's care goes into proving they have moved, all the way, and will stay put.</p>

      <h2>The parts of a turnout</h2>
      <p>
        A <span className="term">turnout</span> lets a train take one of two routes. Following a train through one from the toe:
      </p>
      <ul>
        <li><b>Stock rails</b> are the fixed outer rails. One runs straight through, the other follows the diverging route.</li>
        <li><b>Switch blades</b> (tongues) are the two tapered rails that move. They are tied together by stretcher bars, so when one closes against its stock rail the other opens away from its own. The closed blade catches the wheel flanges and steers the train.</li>
        <li>The blades pivot or flex at the <b>heel</b>, and <b>closure rails</b> carry on to the crossing.</li>
        <li>The <b>crossing</b> is where one route's rail cuts across the other's. A flange can't pass through a solid rail, so there is a gap (the throat) and a <b>V</b> (the nose), with <b>wing rails</b> either side.</li>
        <li><b>Check rails</b> sit opposite the crossing. As a wheel crosses the gap at the nose, nothing is guiding it on that side. The check rail holds the <em>other</em> wheel of the axle by its flange, so the axle can't drift and drop the wheel onto the wrong side of the nose.</li>
      </ul>
      <p>
        <span className="term">Normal</span> and <span className="term">reverse</span> are the two positions. Normal is usually the main or straight route, and
        it is the position the points are left in when nothing else is needed.
      </p>

      <h2>Facing and trailing</h2>
      <p>
        A train meeting the points from the toe end is taking them <span className="term">facing</span>: the blades choose its route. A train coming from the
        crossing end takes them <span className="term">trailing</span>: both routes merge, and the wheels arrive at the blades from behind.
      </p>
      <p>
        Facing points are the dangerous direction. If the closed blade isn't tight against its stock rail, a wheel flange can get between them and split the
        points: one wheel goes each way, and the vehicle derails. So signals reading over facing points demand the most proof. Trailing the wrong way is less
        catastrophic but still damaging. The wheels force the blades over, a <span className="term">run-through</span>, which can bend the stretcher bars and
        the drive. Run-through points must be examined before they are used again. One deliberate exception is <span className="term">spring points</span>,
        used at some country crossing loops. A spring holds them normal, trains leaving the loop trail through them, and the spring returns them.
      </p>

      <h2>Move, lock, prove</h2>
      <p>
        A <span className="term">point machine</span> beside the track drives the blades. Whenever it moves the points, it runs the same cycle:
      </p>
      <ol>
        <li><b>Unlock.</b> Detection drops first, so anything reading over the points goes to stop, then the lock is withdrawn.</li>
        <li><b>Move</b> both blades across.</li>
        <li><b>Lock</b> them over. A facing point lock holds the closed blade against its stock rail against vibration and the forces of passing trains. The lock can only enter if the blades have gone fully over.</li>
        <li><b>Detect.</b> Contacts prove the closed blade is home, the open blade is far enough away for a flange to pass, and the lock is in.</li>
      </ol>
      <p>A signal reading over the points may clear only after step 4. The order is the point: nothing is believed until it has been proved.</p>

      <Turnout />

      <Fact q="Why does detection check the open blade, and not just the closed one?">
        <p>
          The wheel flange on that side runs between the open blade and its stock rail. If the open blade has bent, or a bar has broken so that it sits close to
          its stock rail, a flange can strike its tip and climb it, even though the closed blade is perfectly home. Both blades must be where the route needs them.
        </p>
      </Fact>

      <h2>When the points won't come</h2>
      <p>
        From the controller's chair, the stone in the figure looks like this. The points were called reverse, the indication never arrived, and the panel shows
        them <span className="term">out of correspondence</span> (no detection). Every signal reading over them stays at stop. The controller can try them back
        and forth, which sometimes clears a stone or ice. If that fails, they call out the signal maintainers.
      </p>
      <p>
        Trains don't have to wait for the repair. Under the rules, someone qualified can go to the points, check them, and <em>secure</em> them in the position
        needed, clipped and locked by hand. Trains can then be authorised past the signal at stop, over the secured points, typically at restricted speed. Once
        the clip is on, the safety comes from the person who fitted it and the authority they give, not from the interlocking.
      </p>

      <Fact kind="watch out" q="Points are out of correspondence. A driver at the signal asks to be authorised past it. What must be true first?">
        <p>
          Someone must have confirmed the points are in the right position for the route and secured them there. The interlocking can no longer prove it, so
          a person has to. Authorising a train over unsecured, undetected facing points is how a train splits a set of points.
        </p>
      </Fact>

      <Check
        q="Points 21 have been called reverse. The machine moved, but detection never came. What is true of signal S21, which reads over them facing?"
        onAnswered={(r) => r && markDone('points')}
        options={[
          { text: 'It can clear: the machine moved the points, so they must be reverse.', why: 'Moving is step 2 of 4. Without the lock in and detection proving the blades home, the interlocking does not know where they are.' },
          { text: 'It stays at stop until the points are detected, or until they are secured under the rules and the train is authorised past it.', right: true, why: "The signal's clearance depends on proof. If the machine can't give that proof, a person checking and securing the points takes its place." },
          { text: 'It shows Caution, so drivers go slowly over the points.', why: "There is no aspect for \"the points might not be there\". Undetected points mean the signal stays at stop." },
        ]}
      />
    </div>
  );
}
