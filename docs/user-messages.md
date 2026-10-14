# Jesse's messages from the claude.ai session (verbatim, oldest first)

These are the owner's own words. Where they conflict with anything else in this repo, these win,
and the latest message wins over earlier ones.

## 1. Original request

> I love brilliant.org's diagrams. They presented a talk on a custom library called diagrammar I
> think, and there is this too which can maybe do similar stuff. https://diagramatics.photon-ray.xyz/
>
> I want you to make me a custom library for this, using svg, focused on interactive computer science
> diagrams (DSA stuff for now). I also want animations, but maybe we can use something like framer
> motion on top of this in the application importing this library. Also make me a web page like the
> diagramatics one demonstrating its use

(Standing preference: "Focus on teaching me and helping me improve rather than just vibe coding".)

## 2.

> give me an in-chat/in-browser demo

## 3.

> decent first try, but you didn't match the aesthetic of brilliant or diagramatic at all.

(This led to the three themes: plain, brilliant and textbook.)

## 4. The current brief: build this next

> Only keep one theme. Brillinat is my favourite of those, but rihgt now it goes a bit overboard.
> Bring it closer in line with the textbook theme. It can also be a react library if that makes it
> easier. Also, support other kinds of diagrams, like maths graphs, probability and geometry graphs,
> scheduling and memory graphs, and other kinds of interactive (or static) diagrams for a
> brilliant-like website. Also, the interactions here kinda suck. Especially the slider and
> dropdowns. Maybe we should import shadcn or something?

## 5. Where it's going (sent with the three screenshots in `getbetter-screens/`)

> this is the website it's going into and some of the diagrams it's going to replace (not the camera
> 3d one yet)

- `getbetter-screens/binary-search-editorial-1.png`: binary search stepper with code tracing. Replace this.
- `getbetter-screens/binary-search-editorial-2.png`: "why it is fast" slider, halving chips and bar comparison. Replace this.
- `getbetter-screens/webgl-course-camera.png`: the 3D camera diagram. Don't replace it yet; it's here to show the course layout and control style.

## 6. Why the work moved to Claude Code

> can I move this session to claude code? can I download it? or what?

> because I need you to access npm obviously

(The claude.ai sandbox couldn't reach the npm registry, so shadcn, Radix and Motion couldn't be
installed there. Install them here.)
