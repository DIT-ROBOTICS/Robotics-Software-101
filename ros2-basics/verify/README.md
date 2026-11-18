# Try the tutorial yourself

A clean ROS 2 Humble machine with the Notion tutorial's examples, set up the way the tutorial
says:

- **Python files:** in `/root/tutorial`, run with `python3`.
- **C++ files:** in the package `my_pkg`, created with `ros2 pkg create --dependencies ...` and
  built with `colcon build`.
- **Where the code comes from:** `from_notion/`, extracted from the live Notion pages on
  2026-11-01. The exception is section F's `groups_client.py/.cpp`, which use the fixed version
  that still has to be pasted into Notion.

## Start it

```bash
cd ros2-basics/verify
docker build -t dit-ros2-tutorial:humble .
docker run -d --name ros2-tutorial dit-ros2-tutorial:humble
```

Open each terminal with:

```bash
docker exec -it ros2-tutorial bash
```

It starts in `/root/tutorial` with ROS and `my_pkg` already sourced.

## Section B: a blocking service call inside a callback

| | Python | C++ |
|---|---|---|
| Terminal 1 | `python3 slow_server.py` | `ros2 run my_pkg slow_server` |
| Terminal 2, wrong | `python3 blocking_client.py` | `ros2 run my_pkg blocking_client` |
| Terminal 2, right | `python3 async_client.py` | `ros2 run my_pkg async_client` |

What you should see:

- **Wrong:** `heartbeat` twice a second. After about 3 s you see `calling...`, and then nothing
  more.
  - Python: Ctrl+C stops it.
  - C++: Ctrl+C does not stop it (it prints `signal_handler(SIGINT/SIGTERM)` and stays stuck).
    Ctrl+\ does.
- **Right:** `sent 1 + 10`, heartbeats keep coming for the 2 s the server takes, then
  `result: 11`. Ctrl+C stops it.

## Section F: the same call with callback groups

With Terminal 1 still running `slow_server`, run `python3 groups_client.py` or
`ros2 run my_pkg groups_client` in Terminal 2. You see `calling...`, heartbeats during the wait,
then `result: 3` every 3 s. Ctrl+C stops it at any moment.

## Clean up

```bash
docker rm -f ros2-tutorial
```
