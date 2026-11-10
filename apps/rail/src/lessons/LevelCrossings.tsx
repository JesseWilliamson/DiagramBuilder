import { CrossingTimeline } from '../figures/CrossingTimeline';
import { markDone } from '../progress';
import { Check, Fact } from '../ui/blocks';

export default function LevelCrossings() {
  return (
    <div className="prose">
      <p className="lede">A level crossing is where the railway's safety system meets people who have never read a rulebook. A train can't stop for a car, so the crossing's whole job is to stop the car in time.</p>

      <h2>Passive and active</h2>
      <p>
        Australia has thousands of level crossings, and most of them, especially on country roads, are <span className="term">passive</span>: signs only, a give
        way or stop sign with a railway crossing sign. The motorist is the safety system. They have to look, see the train and judge its speed.
      </p>
      <p>
        <span className="term">Active</span> crossings warn of the train themselves. The basic form is flashing red lights and a bell. Busier or faster crossings add{' '}
        <span className="term">boom gates</span> across the road on the approach side. Some urban crossings have pedestrian gates as well. An active crossing has to
        answer one question correctly every time: <em>is a train coming?</em>
      </p>

      <h2>How the crossing knows</h2>
      <p>
        It uses the same train detection as signalling. On each approach, a set distance up the line, is a <span className="term">strike-in</span> point: the start
        of an approach track circuit, or a treadle or axle counter head. When a train reaches it, the crossing starts its warning. A short{' '}
        <span className="term">island</span> circuit covers the road itself. Once the train has passed over the island and cleared it, the crossing{' '}
        <span className="term">strikes out</span>: booms rise and the lights stop. The other approach's strike-in has to be ignored for a train going away, or every
        departing train would restart the warning. The logic latches the direction.
      </p>
      <p>
        The sequence is fixed: lights and bells first, so drivers already on the approach can stop or clear the crossing. Then after a few seconds the booms start
        down, and they stay down until the train is clear. Booms that dropped instantly would come down on cars already committed to the crossing.
      </p>

      <CrossingTimeline />

      <h2>Distance is not time</h2>
      <p>
        A strike-in point is a fixed <em>distance</em>, but drivers care about <em>time</em>. The approach is sized so the fastest train the line allows still gets
        enough warning. Every slower train then gets more, sometimes much more. A loaded grain train crawling at 25 km/h can hold a road shut for two minutes with
        nothing in sight. Long waits teach motorists that the lights "always go too early", and that's when people drive round booms.
      </p>
      <p>
        A <span className="term">constant warning time</span> predictor fixes the slow-train case. It measures how fast the train is approaching (from the changing
        electrical properties of the rails as the train gets closer) and starts the warning so every train gets about the same time. It can't fix the fast-train
        case: no warning can start before the train reaches the approach. A train faster than the design speed is short of warning whatever the electronics do.
        That's one reason raising line speed on a route means looking at every crossing on it.
      </p>

      <Fact q="Why does a crossing need its own island circuit over the road, if the approach circuits already know where the train is?">
        <p>
          The approach circuits say a train is <em>coming</em>. The island says a train is <em>on the road</em>. Strike-out has to wait until the island is clear
          behind the last vehicle, not until the front has passed. Otherwise a long, slow train could have the booms rising while its wagons are still crossing.
        </p>
      </Fact>

      <h2>When a crossing fails</h2>
      <p>
        Crossings are built to fail safe like signals: a fault should leave the lights flashing and the booms down. So a controller's most common crossing call is
        from police, the public or a driver: "the booms have been down for twenty minutes and there's no train." That one is a traffic problem and a maintenance
        call-out.
      </p>
      <p>
        The dangerous report is the opposite: a crossing that did <em>not</em> activate for a train, or lights out, or a boom broken off by a vehicle. Then the
        crossing can no longer be trusted. Until it is fixed, the controller passes instructions to every train approaching it. The rules typically require trains to
        approach prepared to stop, cross at walking pace or under protection, and sound the horn. Networks differ in the exact requirements, and sometimes someone
        is sent out to control the road traffic by hand.
      </p>

      <Fact kind="watch out" q="A motorist rings: the lights at a crossing are flashing but the booms are up, and a train is in sight. What has probably happened, and what matters most?">
        <p>
          Something has gone wrong with the boom mechanism (a broken boom arm is common: vehicles hit them). The crossing is giving only part of its protection.
          What matters most is the trains: get a message to any train approaching that crossing straight away, then call out the maintainers and, if needed, police
          for traffic control.
        </p>
      </Fact>

      <Check
        q="A crossing's approach is sized for 115 km/h trains. Most trains over it are slow coal trains at about 40 km/h. What will motorists experience, and what helps?"
        onAnswered={(r) => r && markDone('level-crossings')}
        options={[
          { text: 'Too little warning, fixed by a longer approach.', why: 'Slow trains take longer to cover the same distance, so they get more warning, not less. A longer approach makes that worse.' },
          { text: 'Long waits with no train in sight. A constant warning time predictor would give the slow trains the same warning as the fast ones.', right: true, why: 'At 40 km/h the train takes almost three times as long to reach the road. The predictor measures its speed and holds the warning back.' },
          { text: 'No difference: warning time is the same for all trains.', why: 'That is only true with a constant warning time predictor. With a fixed strike-in, warning time is distance divided by speed.' },
        ]}
      />
    </div>
  );
}
