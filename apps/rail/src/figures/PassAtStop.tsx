// Authorising a train past a controlled signal at stop, as a sequence diagram you
// step through. The words matter more than the arrows, so the full transcript of
// each step sits under the diagram.
import { useMemo } from 'react';
import { fitViewBox } from 'dsviz';
import { Diagram, Transport, usePlayer } from 'dsviz/react';
import { sequence, type Message, type Participant } from 'dsviz/uml';
import { Figure } from '../ui/blocks';

const people: Participant[] = [
  { id: 'driver', label: 'Driver, 7SP3', kind: 'actor' },
  { id: 'nc', label: 'Network Control', kind: 'actor' },
];

const steps: Array<Message & { said: string; why: string }> = [
  { from: 'driver', to: 'nc', label: 'identify: train, signal, location', said: '"Network Control, this is the driver of Seven Sierra Papa Three. I\'m standing at signal S14 at stop, Up Main, Coolabah."', why: 'The driver says who they are, which train, and exactly where. A signal number with no location, or a location with no train number, is how wrong trains get authorised.' },
  { from: 'nc', to: 'driver', label: 'wait: checking', kind: 'return', said: '"Seven Sierra Papa Three, Network Control. Stand by, I\'m checking."', why: 'The controller does not answer from memory. They acknowledge, then look.' },
  { from: 'nc', to: 'nc', label: 'check route, track, blocking, worksites', said: '(No words: the controller checks why S14 is at stop, whether the line ahead is clear or has a fault, and that no blocking, worksite or other train is in the way.)', why: 'Any signal blocked for a worksite is there for a reason. Authorising a train past it would undo the protection. This check is where that gets caught.' },
  { from: 'nc', to: 'driver', label: 'authority: pass S14, restricted speed', said: '"Seven Sierra Papa Three, you are authorised to pass signal S14 at stop. Proceed at restricted speed to the next signal, prepared to stop short of any obstruction."', why: 'One authority, one signal, with the conditions that come with it. Restricted speed matters: the reason S14 is at stop might be on the track.' },
  { from: 'driver', to: 'nc', label: 'repeat back, word for word', kind: 'return', said: '"Authorised to pass signal S14 at stop. Proceed at restricted speed to the next signal, prepared to stop short of any obstruction. Seven Sierra Papa Three."', why: 'The driver repeats the whole message: signal, conditions, train. Not "yep, got it", and not a summary.' },
  { from: 'nc', to: 'driver', label: '"That is correct"', said: '"That is correct. Network Control."', why: 'Only now does the authority exist. Until the controller confirms the read-back, the driver must not move.' },
];

const draw = (i: number) => sequence(people, steps, { upTo: i, gap: 340, numbered: true });
const viewBox = fitViewBox(draw(steps.length - 1), 20);

export function PassAtStop() {
  const player = usePlayer(() => steps.map((_, i) => i), [], { interval: 2200 });
  const i = player.frame ?? 0;
  const scene = useMemo(() => draw(i), [i]);
  return (
    <Figure
      wide
      panel={
        <div style={{ flexBasis: '100%', display: 'grid', gap: 8 }}>
          <p style={{ margin: 0, fontSize: 15 }}>{steps[i].said}</p>
          <p className="readout" style={{ fontFamily: 'var(--font)', fontSize: 13.5 }}>{steps[i].why}</p>
          <Transport player={player} />
        </div>
      }
      caption="A pattern like the one in Sydney Trains' procedure for authorising rail traffic past an absolute signal at stop (NPR 746). The exact words differ between networks; the shape does not."
    >
      <Diagram scene={scene} viewBox={viewBox} label="Sequence of radio messages between a driver and network control to pass a signal at stop" />
    </Figure>
  );
}
