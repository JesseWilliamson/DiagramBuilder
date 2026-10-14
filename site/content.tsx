import { ReactNode } from 'react';
import { M } from './M';

/**
 * The course catalogue. A lesson is a list of steps; a step is a prompt, an
 * optional interactive (a file in demos/), and an optional question with one
 * right answer. The player walks through them one screen at a time.
 */
export interface Question {
  ask: ReactNode;
  options: string[];
  answer: string;
  /** Shown after checking (right or wrong). */
  explain: ReactNode;
  layout?: 'pills' | 'cards';
}

export interface Step {
  title: ReactNode;
  body?: ReactNode;
  demo?: string;
  question?: Question;
}

export interface Lesson {
  id: string;
  title: string;
  blurb: string;
  steps: Step[];
}

export interface Course {
  id: string;
  kicker: string;
  title: string;
  blurb: string;
  tone: 'blue' | 'yellow' | 'green' | 'purple' | 'orange' | 'red';
  isNew?: boolean;
  lessons: Lesson[];
}

export const courses: Course[] = [
  {
    id: 'algorithms',
    kicker: 'Computer science',
    title: 'Algorithms & Data Structures',
    blurb: 'Search, sort, traverse and tabulate, one frame at a time.',
    tone: 'blue',
    isNew: true,
    lessons: [
      {
        id: 'binary-search',
        title: 'Binary search',
        blurb: 'Find anything in a sorted list in a handful of questions.',
        steps: [
          {
            title: "I'm thinking of a number from 1 to 100.",
            body: <p>Drag the marker to aim, then press <b>Guess</b>. I'll tell you if you're too high or too low. Try to find it in as few guesses as you can.</p>,
            demo: 'GuessNumber',
            question: {
              ask: 'If you always guess the middle of what’s left, what’s the most guesses you could ever need?',
              options: ['5', '7', '10', '50'],
              answer: '7',
              explain: <>Each guess halves the range: 100 → 50 → 25 → 13 → 7 → 4 → 2 → 1. That’s 7 guesses, because <M>{'2^7 = 128 \\ge 100'}</M>.</>,
            },
          },
          {
            title: 'That strategy has a name: binary search.',
            body: <p>Step through it. The highlighted line is the one that just ran, and the shaded window is everything that could still be the answer.</p>,
            demo: 'BinarySearch',
            question: {
              ask: 'Searching for 30: which index does mid land on first?',
              options: ['0', '5', '6', '11'],
              answer: '5',
              explain: <>lo = 0, hi = 11, so mid = 0 + (11 − 0) // 2 = 5. Always the middle of the live range, whatever the target.</>,
            },
          },
          {
            title: 'Why is it so fast?',
            body: <p>Every step throws away half of what’s left. Drag the slider: each notch doubles the array.</p>,
            demo: 'WhyFast',
            question: {
              ask: 'Double the size of the array. How many extra steps does binary search need?',
              options: ['1', '2', 'Twice as many'],
              answer: '1',
              explain: 'One more halving undoes one doubling. That’s what logarithmic means: a million values take 21 steps, two million take 22.',
            },
          },
        ],
      },
      {
        id: 'sorting',
        title: 'Sorting and identity',
        blurb: 'Watch bubble sort, and see why keys decide what moves.',
        steps: [
          {
            title: 'Bubble sort compares neighbours and swaps them.',
            body: <p>Press play. Then turn <b>stable keys</b> off and step again.</p>,
            demo: 'BubbleSort',
            question: {
              ask: 'With stable keys off, what happens on a swap?',
              options: ['The tiles slide past each other', 'The numbers change in place'],
              answer: 'The numbers change in place',
              layout: 'cards',
              explain: 'Without keys, cell 2 is always cell 2, so only its number changes. Give each value a key and the renderer knows it’s the same tile, so it moves.',
            },
          },
        ],
      },
      {
        id: 'pointers',
        title: 'Lists and trees',
        blurb: 'Reverse a linked list; grow a binary search tree.',
        steps: [
          {
            title: 'Reverse a linked list in place.',
            body: <p>Three pointers walk along the list. Watch each arrow swing round when <code>curr.next = prev</code> runs.</p>,
            demo: 'LinkedList',
            question: {
              ask: 'When the loop ends, which pointer is the new head?',
              options: ['prev', 'curr', 'nxt'],
              answer: 'prev',
              explain: 'curr has walked off the end (it’s None), and prev is the last node it visited: the old tail, now the head.',
            },
          },
          {
            title: 'A binary search tree keeps everything in order.',
            body: <p>Smaller values go left, bigger go right. Insert a few values, or click a node to search for it.</p>,
            demo: 'Bst',
            question: {
              ask: 'In the starting tree, where does 45 end up?',
              options: ['Left of 40', 'Right of 40', 'Right of 35'],
              answer: 'Right of 40',
              layout: 'cards',
              explain: '45 < 50, go left to 30; 45 > 30, go right to 40; 45 > 40, go right. That spot is empty, so 45 goes there.',
            },
          },
        ],
      },
      {
        id: 'graphs',
        title: 'Graphs',
        blurb: 'Breadth-first, depth-first, and a colouring puzzle.',
        steps: [
          {
            title: 'Two ways to explore a graph.',
            body: <p>Step through BFS, then switch to DFS. You can drag the nodes around, and click one to start from there.</p>,
            demo: 'Graph',
            question: {
              ask: 'Which one visits the graph in rings around the start, closest first?',
              options: ['BFS', 'DFS'],
              answer: 'BFS',
              explain: 'BFS uses a queue: everything one edge away comes out before anything two edges away. DFS uses a stack and dives down one path first.',
            },
          },
          {
            title: 'Colour the graph so no neighbours match.',
            body: <p>Click a node to change its colour.</p>,
            demo: 'GraphColoring',
            question: {
              ask: 'Could you do it with just 2 colours?',
              options: ['Yes', 'No'],
              answer: 'No',
              explain: 'A, B and F all touch each other. A triangle needs three different colours, so two can never work.',
            },
          },
        ],
      },
      {
        id: 'dp',
        title: 'Dynamic programming',
        blurb: 'Fill a table so every answer reuses smaller ones.',
        steps: [
          {
            title: 'The longest common subsequence.',
            body: <p>Each cell is the answer for two prefixes. Watch which neighbour each value comes from, then follow the traceback.</p>,
            demo: 'Lcs',
            question: {
              ask: 'How long is the LCS of ABCBDAB and BDCABA?',
              options: ['3', '4', '5', '6'],
              answer: '4',
              explain: 'The bottom-right cell holds the answer for the whole strings: 4 (for example BCBA).',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'calculus',
    kicker: 'Math',
    title: 'Calculus, Visually',
    blurb: 'Slopes you can drag and areas you can count.',
    tone: 'purple',
    lessons: [
      {
        id: 'slopes',
        title: 'Slopes and tangents',
        blurb: 'The derivative as the slope under your finger.',
        steps: [
          {
            title: 'Drag the point along the curve.',
            body: <p>The yellow line is the tangent. Its slope is the derivative <M>{"f'(x)"}</M>. Turn on <b>show f′</b> to see every slope plotted as a height.</p>,
            demo: 'Tangent',
            question: {
              ask: <>For <M>{'\\sin x'}</M>, where is the tangent flat (slope 0)?</>,
              options: ['x = 0', 'x = ±π/2', 'x = ±π'],
              answer: 'x = ±π/2',
              explain: <>The peaks and troughs of <M>{'\\sin x'}</M> are at <M>{'\\pm\\pi/2'}</M>, and that’s exactly where <M>{'\\cos x'}</M> (its slope) crosses zero.</>,
            },
          },
        ],
      },
      {
        id: 'area',
        title: 'Area under a curve',
        blurb: 'Rectangles that add up to an integral.',
        steps: [
          {
            title: 'Fill the area with rectangles.',
            body: <p>Drag <M>a</M> and <M>b</M>, change the number of rectangles, and switch the rule.</p>,
            demo: 'Riemann',
            question: {
              ask: 'Double the number of rectangles. Roughly what happens to the error of the left rule?',
              options: ['It halves', 'It quarters', 'It stays the same'],
              answer: 'It halves',
              layout: 'cards',
              explain: 'The left rule’s error shrinks in proportion to the width of each rectangle. The midpoint and trapezoid rules do better: their error shrinks with the width squared.',
            },
          },
        ],
      },
      {
        id: 'vectors',
        title: 'Vectors',
        blurb: 'Add, subtract and project arrows.',
        steps: [
          {
            title: 'Grab the tips of u and v.',
            body: <p>Try all three modes. Projection shows how much of u points along v.</p>,
            demo: 'Vectors',
            question: {
              ask: <>If <M>{'u \\cdot v = 0'}</M>, the angle between u and v is…</>,
              options: ['0°', '45°', '90°', '180°'],
              answer: '90°',
              explain: <><M>{'u \\cdot v = |u||v|\\cos\\theta'}</M>, and <M>{'\\cos\\theta = 0'}</M> means <M>{'\\theta = 90°'}</M>: the vectors are perpendicular.</>,
            },
          },
        ],
      },
    ],
  },
  {
    id: 'probability',
    kicker: 'Math',
    title: 'Probability',
    blurb: 'Count outcomes, shade regions, and trust the simulation.',
    tone: 'yellow',
    isNew: true,
    lessons: [
      {
        id: 'outcomes',
        title: 'Counting outcomes',
        blurb: 'Two dice, 36 equally likely outcomes.',
        steps: [
          {
            title: 'Every cell is one way two dice can land.',
            body: <p>Click a cell or a bar to pick a sum, and count the highlighted cells.</p>,
            demo: 'Dice',
            question: {
              ask: 'What is the probability of rolling a sum of 7?',
              options: ['1/12', '1/6', '7/36', '1/2'],
              answer: '1/6',
              explain: '6 of the 36 cells sum to 7 (one on each diagonal step), and 6/36 = 1/6. No other sum has as many.',
            },
          },
        ],
      },
      {
        id: 'monty-hall',
        title: 'The Monty Hall problem',
        blurb: 'Should you switch doors?',
        steps: [
          {
            title: 'A car is behind one door, goats behind the other two.',
            body: <p>Pick a door. The host, who knows where the car is, opens a goat door. Then you can stay or switch. Play a few rounds.</p>,
            demo: 'MontyHall',
            question: {
              ask: 'After the host opens a goat door, should you switch?',
              options: ['Stay', 'Switch', 'It doesn’t matter'],
              answer: 'Switch',
              explain: 'Your first pick is right 1 time in 3. Switching wins exactly when it was wrong: 2 times in 3. Simulate to see it settle.',
            },
          },
        ],
      },
      {
        id: 'venn',
        title: 'Events as regions',
        blurb: 'Venn diagrams where area is probability.',
        steps: [
          {
            title: 'Each circle is an event; its area is its probability.',
            body: <p>Drag the circles, and click regions to shade them.</p>,
            demo: 'Venn',
            question: {
              ask: 'Which region is A ∪ B but not A ∩ B?',
              options: ['A − B', 'A △ B', '(A ∪ B)ᶜ'],
              answer: 'A △ B',
              explain: 'The symmetric difference A △ B is in exactly one of the two: both crescents, without the lens.',
            },
          },
        ],
      },
      {
        id: 'bayes',
        title: "Bayes' rule",
        blurb: 'Why a positive test can still mean probably fine.',
        steps: [
          {
            title: 'A test for a rare disease.',
            body: <p>Follow each path and multiply. Then compare the two <b>+</b> leaves.</p>,
            demo: 'Bayes',
            question: {
              ask: 'With these settings, if you test positive, how likely are you to be sick?',
              options: ['About 99%', 'About 95%', 'About 17%', 'About 1%'],
              answer: 'About 17%',
              explain: 'Out of everyone who tests positive, only 0.0099 / (0.0099 + 0.0495) ≈ 17% are actually sick. The disease is rare, so most positives are false alarms.',
            },
          },
        ],
      },
      {
        id: 'large-numbers',
        title: 'Randomness at scale',
        blurb: 'Galton boards and the law of large numbers.',
        steps: [
          {
            title: 'Drop balls through the pegs.',
            body: <p>Each peg is a coin flip. Drop a lot of balls, and try tilting the board.</p>,
            demo: 'Galton',
            question: {
              ask: 'With 10 rows of pegs and a fair board, which bin fills fastest?',
              options: ['The edges', 'The middle', 'They fill evenly'],
              answer: 'The middle',
              explain: <>There are <M>{'\\binom{10}{5} = 252'}</M> paths to the middle bin, but only 1 to each edge.</>,
            },
          },
          {
            title: 'Roll a die again and again.',
            body: <p>Turn on <b>auto</b> and watch the bars and the running average.</p>,
            demo: 'LargeNumbers',
          },
        ],
      },
    ],
  },
  {
    id: 'geometry',
    kicker: 'Math',
    title: 'Geometry',
    blurb: 'Drag the corners and watch what never changes.',
    tone: 'green',
    lessons: [
      {
        id: 'triangles',
        title: 'Triangles',
        blurb: 'Angles, centres and special cases.',
        steps: [
          {
            title: 'Drag the corners of the triangle.',
            body: <p>Turn on the extra lines one at a time. Can you make a right angle?</p>,
            demo: 'Triangle',
            question: {
              ask: 'Make one angle exactly 90°. Where is the circumcentre?',
              options: ['Inside the triangle', 'On the longest side', 'Outside the triangle'],
              answer: 'On the longest side',
              layout: 'cards',
              explain: 'In a right triangle the hypotenuse is a diameter of the circumcircle (Thales), so the centre sits at its midpoint.',
            },
          },
        ],
      },
      {
        id: 'circles',
        title: 'Angles in circles',
        blurb: 'The inscribed angle theorem.',
        steps: [
          {
            title: 'Drag P around the circle.',
            body: <p>Keep it on the far side from the arc AB, then try moving A and B.</p>,
            demo: 'Inscribed',
            question: {
              ask: 'If the arc AB is 140°, what is the angle APB?',
              options: ['35°', '70°', '140°', '280°'],
              answer: '70°',
              explain: 'An inscribed angle is half the arc it stands on: 140° / 2 = 70°.',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'systems',
    kicker: 'Computer science',
    title: 'How Computers Work',
    blurb: 'Who gets the CPU, and where your variables really live.',
    tone: 'orange',
    lessons: [
      {
        id: 'scheduling',
        title: 'CPU scheduling',
        blurb: 'Five processes, four policies.',
        steps: [
          {
            title: 'Five processes share one CPU.',
            body: <p>Switch between the policies and compare the average wait.</p>,
            demo: 'Scheduling',
            question: {
              ask: 'Which policy gives the lowest average waiting time here?',
              options: ['FCFS', 'SJF', 'SRTF', 'Round robin'],
              answer: 'SRTF',
              explain: 'Always running whatever has the least work left gets short jobs out of the way fastest, which minimises total waiting. The catch: long jobs can starve.',
            },
          },
        ],
      },
      {
        id: 'memory',
        title: 'Names and memory',
        blurb: 'Aliasing in Python, pointer arithmetic in C.',
        steps: [
          {
            title: 'Python names point at objects.',
            body: <p>Step through the code and watch the arrows.</p>,
            demo: 'PythonMemory',
            question: {
              ask: <>After <code>b = a</code> and <code>b.append(3)</code>, what is <code>a</code>?</>,
              options: ['[1, 2]', '[1, 2, 3]', '[3]'],
              answer: '[1, 2, 3]',
              explain: 'b = a copies the arrow, not the list. Both names point at the one list, so appending through b changes what a sees.',
            },
          },
          {
            title: 'In C, a pointer is just an address.',
            body: <p>Switch the element type and move <code>k</code>.</p>,
            demo: 'Pointers',
            question: {
              ask: <>An <code>int *p</code> holds 0x1000. What is <code>p + 3</code>?</>,
              options: ['0x1003', '0x100c', '0x1030'],
              answer: '0x100c',
              explain: 'Pointer arithmetic counts in elements: 3 ints × 4 bytes = 12 = 0xc bytes, so 0x1000 + 0xc = 0x100c.',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'dsviz',
    kicker: 'Under the hood',
    title: 'How these diagrams work',
    blurb: 'State in, scene out, and the renderer animates the difference.',
    tone: 'red',
    lessons: [
      {
        id: 'idea',
        title: 'Scenes and ids',
        blurb: 'The one rule behind all the animation.',
        steps: [
          {
            title: 'Every diagram here is a list of shapes with ids.',
            body: <p>When the state changes, shapes with the same id glide to their new place, new ids fade in, and missing ones fade out. Click a box. Open <b>{'</>'}</b> at the top right to see and edit the code.</p>,
            demo: 'Pipeline',
            question: {
              ask: 'A shape keeps its id but changes position. What does the renderer do?',
              options: ['Fades it out and in', 'Tweens it to the new spot', 'Nothing'],
              answer: 'Tweens it to the new spot',
              layout: 'cards',
              explain: 'Same id means same thing: it moves from wherever it is on screen right now to its new position.',
            },
          },
          {
            title: 'Shapes can morph, too.',
            body: <p>Paths with different numbers of points are resampled by arc length so they can tween into each other.</p>,
            demo: 'Morph',
          },
        ],
      },
    ],
  },
];

export const findLesson = (courseId: string, lessonId: string) => {
  const course = courses.find((c) => c.id === courseId);
  const lesson = course?.lessons.find((l) => l.id === lessonId);
  return course && lesson ? { course, lesson } : null;
};
