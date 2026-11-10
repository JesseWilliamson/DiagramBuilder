// The course outline: the one list the sidebar, home page and pager read.
import type { ComponentType } from 'react';
import Desk from './Desk';
import Signals from './Signals';
import Interlocking from './Interlocking';
import SingleLine from './SingleLine';
import Protection from './Protection';
import Comms from './Comms';
import SignalsUpClose from './SignalsUpClose';
import Points from './Points';
import Detection from './Detection';
import TrainProtection from './TrainProtection';
import LevelCrossings from './LevelCrossings';
import Turntables from './Turntables';
import Shunting from './Shunting';

export type Lesson = { slug: string; title: string; blurb: string; Body: ComponentType };
export type Section = { title: string; lessons: Lesson[] };

export const sections: Section[] = [
  {
    title: 'The desk',
    lessons: [{ slug: 'desk', title: 'What a network controller does', blurb: 'The train graph, and deciding where two trains cross.', Body: Desk }],
  },
  {
    title: 'Keeping trains apart',
    lessons: [
      { slug: 'signals', title: 'Blocks and automatic signals', blurb: 'Track circuits, aspects, and why a failure shows red.', Body: Signals },
      { slug: 'interlocking', title: 'Routes and interlocking', blurb: 'Setting routes at a junction, and the locking that stops you setting a bad one.', Body: Interlocking },
      { slug: 'single-line', title: 'Authorities on single lines', blurb: 'Where there are no signals, the controller hands out the track itself.', Body: SingleLine },
    ],
  },
  {
    title: 'Infrastructure',
    lessons: [
      { slug: 'signal-hardware', title: 'Signals up close', blurb: 'Heads, lamps, lamp proving, route indicators, shunt signals and trainstops.', Body: SignalsUpClose },
      { slug: 'points', title: 'Points and point machines', blurb: 'Blades, crossings, and how a machine moves, locks and proves a set of points.', Body: Points },
      { slug: 'detection', title: 'Detecting trains', blurb: 'Track circuits and axle counters in detail, and what each can get wrong.', Body: Detection },
      { slug: 'train-protection', title: 'Balises and train protection', blurb: 'Trainstops, ETCS balises, braking curves, and what happens when a driver gets it wrong.', Body: TrainProtection },
      { slug: 'level-crossings', title: 'Level crossings', blurb: 'Lights, bells and booms, and why warning time depends on train speed.', Body: LevelCrossings },
      { slug: 'turntables', title: 'Turntables and turning', blurb: 'Turning locomotives and vehicles: turntables, triangles and balloon loops.', Body: Turntables },
    ],
  },
  {
    title: 'People on the track',
    lessons: [{ slug: 'protection', title: 'Protecting work on track', blurb: 'Possessions, TOAs, blocking, lookouts, and the gap that caught someone out.', Body: Protection }],
  },
  {
    title: 'Shunting and yards',
    lessons: [{ slug: 'shunting', title: 'Shunting', blurb: 'Moving vehicles in yards: shunt movements, handsignals, propelling, run-arounds and securing vehicles.', Body: Shunting }],
  },
  {
    title: 'Talking',
    lessons: [{ slug: 'comms', title: 'Safety-critical communication', blurb: 'Repeat-back, and authorising a train past a signal at stop.', Body: Comms }],
  },
];

export const lessons: Lesson[] = sections.flatMap((s) => s.lessons);
