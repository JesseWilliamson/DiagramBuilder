import { BlockingCheck } from '../figures/BlockingCheck';
import { markDone } from '../progress';
import { Check, Fact } from '../ui/blocks';

const methods = [
  { name: 'Local Possession Authority', short: 'LPA', rule: 'NWT 302', how: 'A defined portion of track is closed to normal traffic for a period. The Protection Officer in charge of the possession controls everything inside it, including work trains.', controller: 'Issues it, and keeps every train out of the limits until it is given back.' },
  { name: 'Track Occupancy Authority', short: 'TOA', rule: 'NWT 304', how: 'The work group has exclusive occupancy of the track between two locations for a set time. Trains are kept out, and can enter only with the Protection Officer\'s agreement under the rules.', controller: 'Issues it only when no train or other authority is in the limits; protects the limits with signals, blocking or by not issuing authorities.' },
  { name: 'Absolute Signal Blocking', short: 'ASB', rule: 'NWT 308', how: 'Signals protecting the worksite are held at stop and blocking facilities applied, so they cannot be cleared. Trains still run on adjacent lines.', controller: 'Proves the track between the protecting signal and the worksite is clear, blocks the signals, and issues a number the Protection Officer records.' },
  { name: 'Lookout Working', short: 'LW', rule: 'NWT 310', how: 'No authority at all. Lookouts watch for trains and warn the workers, who must be able to reach a safe place in time.', controller: 'Usually not involved. That is the point, and the weakness: nothing stops a train.' },
];

export default function Protection() {
  return (
    <div className="prose">
      <p className="lede">People work on and near the track every day: inspecting it, fixing it, rebuilding it. The controller's job is to make sure no train arrives where they are. How they do that depends on what the work group has asked for.</p>

      <h2>The methods, strongest first</h2>
      <p>
        Under NSW-derived rules (ARTC's and Sydney Trains' rulebooks share this structure, with ARTC prefixing its rule numbers <code>ANWT</code> and Sydney Trains
        using <code>NWT</code>), the Protection Officer in charge of the work chooses a method that suits the work and the location. The general rule is to use
        the most protective method that's practicable. The methods differ in one thing: <b>what physically stops a train reaching the workers?</b>
      </p>
      <div className="figure" style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13.5, lineHeight: 1.5 }}>
          <thead>
            <tr style={{ textAlign: 'left', background: 'var(--muted)' }}>
              {['Method', 'How the work is protected', 'The controller'].map((h) => <th key={h} style={{ padding: '8px 12px', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {methods.map((m) => (
              <tr key={m.short}>
                <td style={{ padding: '10px 12px', verticalAlign: 'top', borderBottom: '1px solid var(--border)', minWidth: 150 }}>
                  <b>{m.name}</b><br /><span className="readout">{m.short} · {m.rule}</span>
                </td>
                <td style={{ padding: '10px 12px', verticalAlign: 'top', borderBottom: '1px solid var(--border)' }}>{m.how}</td>
                <td style={{ padding: '10px 12px', verticalAlign: 'top', borderBottom: '1px solid var(--border)' }}>{m.controller}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ fontSize: 13.5 }}>Rule numbers as in Sydney Trains' current rules. Names, numbers and details differ between networks and change over time; there are others too, such as the Track Work Authority.</p>

      <h2>Blocking a signal is only half the job</h2>
      <p>
        With Absolute Signal Blocking, the protection is a signal at stop. That signal protects the worksite from trains <em>behind</em> it. It does nothing about
        a train that has already passed it. So before blocking, the controller must prove there is no train between the protecting signal and the worksite.
      </p>
      <p>
        This is not a hypothetical. In 2015 in the Hunter Valley, blocking was issued to protect a worksite while a train was already between the protecting
        signal and the work. The ATSB found that the rule and procedure then in use (Controlled Signal Blocking, since reworked into Absolute Signal Blocking) did
        not make sure enough information about the worksite's location was exchanged before the blocking was acted on.{' '}
        <a href="https://www.atsb.gov.au/sites/default/files/2024-02/ro-2015-021_final-report.pdf" target="_blank" rel="noreferrer">Read the ATSB report (RO-2015-021)</a>.
      </p>

      <BlockingCheck onSafe={() => markDone('protection')} />

      <Fact q="In the figure, why is blocking refused while the train is between S12 and S14, even though it hasn't reached the protecting signal yet?">
        <p>
          The driver passed S12 when it showed a proceed aspect, because S14 was clear. Putting S14 back to stop now gives them less than a full block to stop in,
          which may not be enough. Waiting for the train to pass through costs a minute or two. Putting a signal back in a driver's face can cause a signal to be
          passed at stop.
        </p>
      </Fact>

      <Fact kind="watch out" q="A TOA is in place between Bellbird and Coolabah. A Protection Officer at a different worksite asks for a TOA that overlaps it by one section. What do you do?">
        <p>
          The same as for train authorities: two authorities must never cover the same track. Refuse the overlap, and offer the part that doesn't overlap or a
          time when the first TOA will be fulfilled. Under the rules a TOA can adjoin a Local Possession Authority if the possession's Protection Officer agrees. Adjoining is
          arranged and recorded. It is never an overlap that nobody noticed.
        </p>
      </Fact>

      <Check
        q="Why is Lookout Working considered the least protective method?"
        options={[
          { text: 'Because lookouts are less experienced than Protection Officers.', why: "It isn't about the people. Lookouts are trained and accredited for that role." },
          { text: 'Because nothing stops a train: safety depends on seeing it in time and everyone reaching a safe place before it arrives.', right: true, why: 'Every other method keeps trains away from the worksite. Lookout Working relies on warning time alone, so the rules limit where and when it can be used.' },
          { text: 'Because it is only used at night.', why: "Lookout Working isn't limited to night, and darkness actually makes it harder." },
        ]}
      />
    </div>
  );
}
