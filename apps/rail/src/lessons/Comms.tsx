import { PassAtStop } from '../figures/PassAtStop';
import { markDone } from '../progress';
import { Check, Fact } from '../ui/blocks';

export default function Comms() {
  return (
    <div className="prose">
      <p className="lede">Every system in this course has an edge where it stops and people take over: a failed track circuit, a signal passed under authority, a worksite, a train order. At that edge, the safety system is a conversation.</p>

      <h2>Safety-critical communication</h2>
      <p>
        A message is <span className="term">safety-critical</span> if acting on a misunderstanding of it could hurt someone: an authority, a protection
        arrangement, an instruction to pass a signal, a report that a train is complete. Australian rail has industry-wide practice for these (RISSB publishes a
        code of practice), and each network's rules set out the details. They come down to a few habits:
      </p>
      <ul>
        <li><b>Identify yourself and the thing you're talking about.</b> Train number, location, signal number, line. Not "the train at the loop".</li>
        <li><b>Use set phrases and the phonetic alphabet.</b> 7SP3 is "Seven Sierra Papa Three", because over a scratchy radio "S" and "F" sound alike.</li>
        <li><b>Repeat back,</b> in full, every safety-critical message you receive.</li>
        <li><b>Confirm or correct the repeat-back.</b> The sender says "that is correct" or says what was wrong and gives the whole message again.</li>
        <li><b>If in doubt, ask.</b> Don't fill a gap with what you expected to hear.</li>
      </ul>

      <h2>Passing a signal at stop</h2>
      <p>
        The conversation the controller has most often is authorising a train past a controlled signal at stop: a failure, a route that can't be set, a train
        being moved towards a worksite under the rules. Step through it. The arrows are simple, and the words in each step carry the safety.
      </p>

      <PassAtStop />

      <Fact q='Why is "that is correct" a separate step, and not assumed when the driver finishes reading back?'>
        <p>
          A repeat-back is only a check if somebody checks it. If the driver's version is taken as final the moment they finish speaking, a wrong signal number
          becomes the authority. The confirmation makes the controller listen to the repeat-back and decide it is right. Investigations keep finding repeat-backs
          that were said, heard, and not compared.
        </p>
      </Fact>

      <h2>Spot the problem</h2>

      <Check
        q={<>You say: "Seven Sierra Papa Three, you are authorised to pass signal S14 at stop. Proceed at restricted speed to the next signal." The driver replies: "Yep, authorised past the signal, restricted speed." What do you do?</>}
        options={[
          { text: 'Say "that is correct": the meaning is all there.', why: 'The signal number and the train number are both missing. If there are two trains and two signals nearby, that reply would fit the wrong one just as well.' },
          { text: 'Tell the driver the repeat-back was incomplete, give the whole message again, and wait for a full repeat-back.', right: true, why: "A repeat-back has to let you tell this authority apart from any other. Without the signal and train, it can't." },
          { text: 'Repeat just the signal number so they can add it.', why: 'Patching one piece invites a stitched-together authority. Give the whole message again and get the whole message back.' },
        ]}
      />

      <Check
        q={<>A Protection Officer asks for blocking at S14. Your panel shows the blocking applied at S16. You read back the ASB number and the signal as "S14" from memory. What has gone wrong?</>}
        onAnswered={(r) => r && markDone('comms')}
        options={[
          { text: 'Nothing: the Protection Officer heard S14, which is what they asked for.', why: 'The worksite is protected by whatever is applied on the panel, not by what was said. The words and the panel disagree, and the words won.' },
          { text: 'The read-back should come from what is actually on the panel or form, not from what you expect. Here it would have revealed S16.', right: true, why: 'Reading back from the source, not from memory, is what makes a repeat-back catch the mistake. Repeat-backs said from expectation are how errors like this get through.' },
          { text: 'The Protection Officer should have used the phonetic alphabet.', why: 'Phonetics help with letters, but both of you said "S14". The mismatch is between the words and the panel.' },
        ]}
      />

      <h2>Where to go from here</h2>
      <p>
        Everything here is general. If you're training for a controller or signaller role, your network's rules, procedures and local instructions are the real
        thing, and they change. Read the current versions, and treat the <a href="#/glossary">glossary</a> as a map of the words, not the rules.
      </p>
    </div>
  );
}
