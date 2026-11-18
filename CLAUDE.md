# Agent context

Course materials for the DIT robotics club. Read `README.md` (format and teaching approach) and
`PLAN.md` (what each course covers) first.

- This repo is meant to be **public**. Never copy anything from `../recruit/staff/` (exam answer
  keys, hidden scenarios, seeded bugs) into it, and do not describe the exam beyond what
  `../recruit/candidate/EXAM_SPEC.md` already says publicly.
- Worksheets are **pure English**, plain and short. No Chinese pages, no bilingual versions.
  (`ros2-basics/` is the exception: it is the Chinese text pasted into the club's Notion.)
- The model is the NTHU OS26 worksheets (os26.sys-nthu.tw), adapted to a club: one 4-hour live
  session per course, a timed core, and "Go deeper" material for later. See README.md.
- The OS course is the model for **how we teach, not how the pages look**. The look is our own
  (navy, one teal signal colour, a left rail; see "The look" in README.md). Do not drift back
  towards the OS site's look: no cream paper, yellow marker or thick black rules. Keep it calm:
  dark fills only for the rail, the walkthrough header and terminals.
- Follow `_template/`. Shared look and behaviour live in `assets/`; do not copy CSS or JS into
  individual pages (page-specific panel styles in a walkthrough's `<style>` are fine).
- No ROS on the host. Run every example in a ROS 2 Humble container and show the output before
  claiming it works. Put real output in the worksheet.
- Render every page in headless Chrome and look at the screenshot before calling it done.
