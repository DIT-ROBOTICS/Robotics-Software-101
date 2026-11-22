# Session plan: OS‑1, Files and Processes ("Ctrl+C Is Not Enough")

For the presenter. Members never see this file: the worksheet shows no times. (The repo is public,
so anyone can still read it on GitHub. Keep it to timing and teaching notes.)

The session is about 4 hours. The core below is about 3 h 45 min, which is long: see "If time runs
short" before the session. Have the container running before the session starts (see "Before the session").

| Part | Time | What happens |
|---|---|---|
| 1 · You stopped it. It's still running. | 15 min | Say first that Ctrl+C is the normal way, and that the puzzle is the day T1 is out of reach (a start-up script, a teammate's tmux, a dropped SSH session). Then run it live: launch in T1, `ps` and `kill` in T2, then `ros2 node list`. Point at the PPID column changing to 1. Everyone writes down a guess. |
| 2 · Inside the computer | 20 min | CPU, cores and registers; the four levels. Run `memory_latency` live and read the figure together: ask the room to guess the RAM number first. The kernel as the one who shares it all. |
| Try it 0 | 5 min | `memory_latency`, `lscpu`, `free -h`. Skip `ssd_latency.py` in the session (it writes 1 GiB). |
| 3 · A node is a process | 30 min | The program-to-process figure. Ask the room what a shell is before showing the answer. Compile and run `tiny_shell.c` live, then trace its PIDs with the room; many members have never seen `fork`. Then `ps --forest` on the launch, and one look at `/proc/<driver>/status`. Show the same processes from the host. Quiz cards. |
| 4 · Stopping a process: signals | 40 min | Signal table. Walkthrough 1 on the projector: before each step, ask the room what happens next. Go back to the guesses from Part 1. `loop_driver`: the bare `except:` and its fix, then the `docker stop` box. |
| Try it 1 | 10 min | Orphans, then Ctrl+C, then `loop_driver` and its one-word fix. |
| 5 · Daemons | 35 min | SSH drop kills everything. Going to the background: run `heartbeat.c` live, close the terminal, show it still beating, then `kill` it. tmux survives (show the before/after trees). Stale `ros2 node list`. `docker exec` keeps running after the client is gone. The serial-port box. |
| Try it 2 | 10 min | tmux, `fuser`, stale daemon. |
| 6 · Who may touch this file | 20 min | Read `ls -l` together. Permission denied as `member`, then the group fix. The root-owned `build/` folder. Privileged containers box. |
| 7 · Code you didn't compile | 20 min | `ldd`, then the same program with `env -i`. The three variables. Overlay order with `ros2 pkg prefix`. Plugins: one paragraph, no demo. |
| Try it 3 | 10 min | Permission denied, then `ldd` and `env -i`. |
| 8 · Go deeper | (not in the session) | Say it exists: zombies and `--init`, strace, udev, permission bits, systemd, top. |
| Take home | 5 min | Members tick the list; ask two of them to explain one item each. |

Core total: 3 h 45 min, not counting breaks and questions.

## Presenting

Open the worksheet, press P, then "Start live" and show the PIN. Students press P and join with it.
← → or a clicker move; K is the laser. Opening walkthrough 1 from its slide takes everyone with you.

## Before the session

Ask everyone to do the one-time setup on the home page ("Before you start") at home: the build
downloads about 1 GB and can't happen on the room's Wi‑Fi. Then check, from the top of the repo:

```bash
git pull
docker run -it --rm --name os1 -v "$PWD/os-1/code":/code dit-course bash
which tmux fuser strace gcc
```

## Notes

- PIDs on the page come from our runs; yours will differ. Say so once, in Part 1.
- `pkill -f` matches your own shell if the pattern appears in its command line. Use
  `pkill -f '^python3 /code/'`, as the worksheet does.
- Ctrl+C in Humble prints a `KeyboardInterrupt` traceback for every Python node. It is normal;
  say so before it scrolls past.
- If time runs short (it will, unless the room is quick): move Try it 0 and Try it 3 to
  homework, show the `docker stop` box from its outputs, without running it, and cut Part 7's plugin paragraph to
  one sentence. That brings the core back to about 3 h 20 min. Keep walkthrough 1 and the tmux
  before/after.
- The walkthrough is in both languages: press L to switch.
