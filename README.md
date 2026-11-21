# DIT software courses

Course materials for the DIT robotics club software team. The plan is in [`PLAN.md`](PLAN.md):
eight introductory courses plus a debug clinic. This file is for whoever writes or teaches one.

Open any page directly in a browser. Nothing needs building, and the pages work offline.

## Languages

Every page is in **English and Traditional Chinese (繁體中文)**. English is the main text; a
button on every page (or the L key) switches to Chinese, and the choice is remembered in that
browser. A link can force one with `?lang=zh` or `?lang=en`.

Both languages live in the same file, next to each other, so they are written and changed
together:

```html
<p lang="en">The executor runs one callback at a time.</p>
<p lang="zh-Hant">executor 一次只跑一個 callback。</p>
```

Anything without a `lang` shows in both: code, terminal output, numbers. In a walkthrough's
script, write every visible text as `T('English', '中文')`. `assets/lang.js` does the work; every
page loads it first, in `<head>`.

Write the Chinese the way the club's ROS 2 tutorial does: plain and short, Taiwanese usage,
full-width punctuation, and ROS terms left in English (node, callback, executor, timer, service,
future), with 執行緒 for thread and 死結 for deadlock. Real output and code stay in English.

## What a course is

A course is **one session of about 4 hours**, taught live, with **one worksheet**: a web page that
the presenter shows on the projector while members follow on their laptops, and that members
keep as a reference afterwards.

The format follows NTHU's Operating Systems course (os26.sys-nthu.tw, for example
`worksheets/w8/`), which does this very well. But we are not a university course, and the
worksheets differ in what they aim for:

| | A university worksheet | Our worksheet |
|---|---|---|
| Goal | master a topic, then pass a quiz on it | leave with the right picture of a topic, in one sitting |
| Time | a week of self-study per worksheet | 4 hours, live, with breaks and questions |
| Readers | students who chose the subject | club members with mixed backgrounds, many new to the topic |
| Depth | everything that is examined | the core idea in the session; the deep parts kept for later |
| End check | the self-check is the quiz scope | "take home": what you could explain to a teammate |

So every worksheet has **two layers**:

- **Core.** The numbered Parts that the session covers. Together they fill about 3 hours, which
  leaves the rest of the 4 for the hands-on, breaks and questions. A member who only reads the
  core leaves with a correct mental model, and with no gaps they don't know about.
  **Times never appear on the page.** The timetable is for the presenter, in the course's
  `SESSION.md` (see `_template/SESSION.md`).
- **Go deeper.** Ideas that matter but take time to sink in: the real source code, the edge
  cases, the reason the design is the way it is. They are written with the same care as the
  core, not as footnotes. They sit in `details.deeper` boxes, or in whole Parts marked as Go
  deeper, and they are not in the session plan. Members come back to them after the
  session, or on the day they hit the problem for real.

## How a worksheet teaches

These are the habits that make the OS course work, adapted to a 4-hour session. Keep all of
them.

1. **Start with something surprising that members can see.** Not a definition: a node that
   goes silent, a topic that exists but prints nothing, a robot that drifts. Show real output.
   The explanation comes after the reader wants it.
2. **One idea per Part, and one running example through the whole worksheet.** The same node,
   the same numbers (0.5 s, 3 s, 2 s, 1 + 2 = 3), in the text, the figures and the walkthroughs.
   The reader learns the setup once.
3. **Show the simple idea first, and let it fail.** Give the design as an answer to a problem
   the reader has just seen.
4. **Ask before telling.** "Think first" cards, a pause before each walkthrough step while its
   explanation is still hidden, and "say what you expect" before every command in a Try-it box.
5. **Name who acts.** Your node, the executor, DDS, the kernel, the hardware: each has one fixed
   colour, used the same way in chips, figures and walkthroughs (see `assets/worksheet.css`).
6. **Real output, real code, real numbers.** Run every example and paste what it printed. Quote
   real source with its real line numbers. If a measurement doesn't show what you hoped, say so.
7. **Connect it to the robot.** At least one "On a robot" box per course. Don't invent details
   about our robot: describe the general situation, or check with the subsystem's group.
8. **Plain, short English.** Define each term the first time it appears, then never change it.
   Highlight (`<mark>`) the one sentence of a paragraph that matters most, and no more: reading
   only the highlights should give the summary.
9. **Leave things out.** If the core runs long, move a Part to Go deeper. A session that ends on
   time with one clear idea beats one that covers everything.

## Layout

```
courses/
├── PLAN.md            what each course covers and why
├── index.html         home page: every course
├── assets/            shared look and behaviour (no build step)
│   ├── lang.js                         English / 中文 switch, loaded by every page
│   ├── worksheet.css  worksheet.js     the worksheet page
│   └── walk.css       walk.js          the walkthrough engine
├── _template/         a complete example course: copy it to start one
│   ├── index.html     the worksheet
│   ├── SESSION.md     the presenter's timetable (not shown to members)
│   ├── walk/          its walkthroughs, one page each
│   └── code/          every example, tested
├── ros2-basics/       additions to the club's Notion ROS 2 tutorial (in 繁體中文, pasted into Notion)
└── <course>/          one folder per course: index.html, SESSION.md, walk/, code/, img/
```

Course folders use the names from `PLAN.md`: `os-1`, `os-2`, `networking`, `state-estimation`,
`control`, `decision-making`, `ml`, `landscape`, `debug-clinic`. Copying `_template/` to
`<course>/` keeps every relative path to `assets/` working.

## The look

The teaching approach comes from the OS course; the look is our own. Keep it the same on every
page, and change it only in `assets/`.

- **Navy ink on cool paper, and one signal colour (teal).** Teal means "look here": the stroke
  under a key sentence, the Part you are in, the current line of a walkthrough. To re-brand,
  change `--sig` and its tints at the top of `worksheet.css` and `walk.css`.
- **A navy rail on the left** holds the session map and marks the Part the reader is in. On a
  narrow screen it becomes a card under the masthead.
- **Questions are white cards with a navy outline**: "Before you read on" and "Think, then click". Dark fills are kept for the rail, the walkthrough header and
  terminal output, so a page never has many dark blocks at once.
- **Labels are small, monospace and uppercase.** Boxes are flat, with a thin line and a colour
  bar on the left: teal for "On a robot", green for "Try it", dashed purple for "Go deeper".
- **Actor colours are separate from all of this**, and never used for decoration.

## The worksheet page

Start from [`_template/index.html`](_template/index.html). Its pieces:

| Piece | Markup | Use it for |
|---|---|---|
| Masthead | `.kicker`, `h1`, `.lead`, `.howto` | what the session does, in 3 sentences; keep the `.howto` text |
| Session map | `<nav class="map" data-home="../index.html"></nav>` | filled in from the Parts; follows the reader |
| Part | `<h2 id="..."><small>Part 2 / 第 2 部分</small>Title / 標題</h2>` (each in its `lang` span) | one idea; no time |
| Go deeper Part | `<h2 id="..." class="deeper"><small>Part 5 · Go deeper</small>…` | a whole Part to read later |
| Go deeper box | `<details class="deeper"><summary>Go deeper: …</summary>` | one deep idea inside a core Part |
| Before you read on | `.think` | a question whose answer comes later in the worksheet |
| Think first | `.quiz` with `<button>question<span class="ans">answer</span></button>` | 2–3 short checks after an idea |
| Walkthrough link | `.callout.walk` with `<div class="glyph">W1</div>` | open a step-by-step walkthrough |
| On a robot | `.case.robot` | how it shows up on a robot |
| Real world | `.case` with a `.src` line | a story from outside, with its source |
| Try it | `.try` | hands-on in the container; ask for a prediction before each run |
| Actor chip | `<span class="who exec">executor</span>` | `a`, `b`, `exec`, `mw`, `os`, `hw` |
| Code | `<pre data-lang="py">` (or `cpp`, `sh`) | coloured automatically |
| Code note | `<span class="hl" data-note="..." data-note-zh="...">lines</span>` inside a `pre` | a one-sentence note on hover |
| Terminal | `<pre class="term">` with `.m`, `.a`, `.b`, `.ok`, `.cm` spans | real output |
| Figure | inline `<svg class="fig" role="img" aria-label="...">` in `figure.wide` | drawn on white, actor colours |
| Take home | `<ul class="goals"><li>I can …</li></ul>` (`li.deeper` for Go deeper items) | what to be able to explain |

Write figures as inline SVG by hand, in the actor colours, with an `aria-label` that says what
the figure shows. Render the page in a browser and look at it before publishing.

## Walkthroughs

A walkthrough is a full-window page in `walk/` that steps through one mechanism, like a
debugger: code on one side, the state of the system on the other, and an explanation at the
bottom that stays hidden until you press E. The presenter can ask the room "what happens next?"
before showing it. Keys: → Space PageDown, ← PageUp, Home End, E. Presentation clickers send
PageUp and PageDown, so they work too. Each step has its own URL (`blocking-call.html#7`), and
a click on a segment of the progress bar jumps to that step.

Copy [`_template/walk/blocking-call.html`](_template/walk/blocking-call.html). The engine
(`assets/walk.js`, documented at its top) asks the page for four things:

- `initialState()`: the **model**, plain data describing the whole picture.
- `STEPS`: each step has a `part` (a key of `PARTS`, below), a `title` that starts
  with who acts, a `narr`, and an `apply(s)` that changes the model and returns what to point at:
  `hot` ids, `arrows`, and a `call` line (`who`, `act`, `ret`, `note`).
- `renderPanels(s, H)`: draws every panel from the model, and nothing else.
- `PARTS`: the sections of the story, keyed by the step's `part` (`A`, `B`, `C`, `R`). Each has
  a `title`, a `kind` and a one-line `intro`. Kinds: `before` (the normal run, before the bug
  shows up: the bug is already in the code), `bug`, `fix`, `recap`. The kind colours a
  bar under the header (teal, red, green, navy), the progress bar and the header label, and the
  bar flashes on the first step of a new section, so nobody misses the move from the bug to the
  fix. Say in the intro what changed: "same moment, new code".

The engine shows step N by running `apply()` for steps 1 to N on a fresh model, so the panels
can't drift from the story. Helpers: `listing()` for code with real line numbers (coloured by
the file name's extension), `panel()`, `kv()`, `actor()`, and `T()` / `L()` from `lang.js`.
Every text a reader sees is `T('English', '中文')`; an arrow label is `['English', '中文']`.

Shape every walkthrough the same way: first the normal run, before the bug shows up, then where it breaks (the
presenter stops before the break and asks the room what happens next), then the fix if there is
one, and a last step titled "What you should have seen" that recaps in 4–6 bullets.

Walkthroughs have no guess cards or other quiz widgets: they distract from the panels. Questions
belong to the presenter, and the hidden explanation (E) gives them the moment to ask.

## Code

Each course keeps its examples in `code/`. All courses share one image, `dit-course`, built from
`docker/Dockerfile`; add a course's tools there rather than asking students to `apt-get` them.
**Run every example** in a ROS 2 Humble container
before publishing, paste the real output into the worksheet, and say in the credits when and on
what it was run. Code shown in a walkthrough is copied from `code/` with its real line numbers;
change both together.

## Publishing

The repo has no confidential content, so it can be public and served with GitHub Pages
(Settings → Pages → deploy from the main branch, root folder). Exam material lives in the
separate private `recruit` repo; never copy anything from its `staff/` folder here.
