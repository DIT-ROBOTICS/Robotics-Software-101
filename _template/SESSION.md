# Session plan: Waiting inside a callback

For the presenter. Members never see this file: the worksheet shows no times. (The repo is public,
so anyone can still read it on GitHub. Keep it to timing and teaching notes.)

The session is about 4 hours. The core Parts below fill about 1 h 40 min in this short example; a
real course aims at about 3 hours, which leaves the rest for the hands-on, breaks and questions.

| Part | Time | What happens |
|---|---|---|
| 1 · A node that goes silent | 15 min | Show the log. Everyone writes down a guess (the "Before you read on" box). |
| 2 · One thread, many callbacks | 25 min | The executor loop figure. Think-first cards. The "On a robot" box. |
| 3 · Waiting for a reply that cannot arrive | 25 min | Walkthrough 1 on the projector, steps 1–7. Before pressing E, ask the room what happens next. Go back to the guesses from Part 1. |
| 4 · Two ways out | 35 min | Walkthrough steps 8–11, then Fix 2 and the comparison table. Try it: 10 min. |
| 5 · Inside `call()` and `spin()` | (not in the session) | Go deeper. Say it exists and what it is for. |
| Take home | 5 min | Members tick the list; ask two of them to explain one item each. |

Core total: 1 h 45 min, not counting breaks and questions.

## Notes

- The walkthrough is in both languages: press L to switch. Use whichever the room follows best.
- If time runs short, cut Fix 2 to the table and point to the worksheet. Keep the walkthrough.
