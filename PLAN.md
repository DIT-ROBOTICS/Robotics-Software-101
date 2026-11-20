# DIT software courses (plan)

Eight courses of at most 4 hours each, plus one hands-on debug clinic. All introductory: the
goal is a mental map of the whole robot software stack, not mastery of any one part.

Every course has two sides. It starts from what our robots really do, so members see why it
matters, and then goes beyond our robots to the broad robotics knowledge behind it, so it still
makes sense on any robot or in industry. Examples are small programs of our own, run in the
club's Humble container; "On a robot" boxes describe common situations (SSH into the robot,
containers, devices with custom names, an MCU agent) without tying the course to one group's
code. The robot repos are private and this site is public, so worksheets never quote them.

| Course | On our robot | Beyond our robot |
|---|---|---|
| OS‑1 | how every group starts, stops and debugs its software | any Linux system: servers, phones, cars |
| OS‑2 | executors, firmware, the robot computer and its GPU | how any computer works, from an MCU to a data centre |
| Networking & Virtualization | robots, laptops and containers talking over Wi‑Fi | the internet's layers; containers and VMs in industry |
| State Estimation | localization (beacons, odometry, IMU, cameras); vision's poses | GPS, SLAM, self-driving perception |
| Control Systems | nav's controllers, firmware's motor loops, mechanisms | arms, drones, cars: feedback and kinematics everywhere |
| Decision-Making and Planning | main's strategy, nav's planner | task allocation in warehouses; planning in games and logistics |
| ML with Robotics | vision's detectors on the robot computer | modern deep learning and robot learning |
| Robot Software Landscape | how our groups fit together | how industry's robots are built |

Suggested order: OS‑1 → OS‑2 → Networking & Virtualization → State Estimation → Control →
Decision-Making and Planning → ML → Landscape. Run the Debug Clinic any time after OS‑2.

## How each course is planned

Every course below has the same five pieces:

- **Through-line:** one question the whole session answers. Every Part moves it forward; if a
  Part doesn't, it belongs in Go deeper.
- **Running example:** one small program or setup of our own that every Part comes back to.
- **Core:** six Parts, about 3 hours (OS‑1 has seven: it opens with a short computer-architecture
  intro that every later course relies on). Part 1 is always a puzzle: something goes wrong in the
  running example, members guess why, and the rest of the session explains it. Puzzles stay
  candidates until they are reproduced in the container.
- **Go deeper:** ideas that take longer to sink in, for after the session.
- **Why it matters:** why a member should spend 4 hours on it.

And every course keeps the balance above: at least one Part or box that goes beyond our robots.

---

## 1. OS‑1: Files and Processes

**Through-line:** how robot software actually runs on a Linux computer, from `ros2 launch` to the
moment you try to stop it.

**Running example:** a small stack of our own (a launch file, two nodes, a fake serial device),
run in the Humble container.

**Core:**
1. **Puzzle:** Ctrl+C is the normal way to stop a launch, but one day its terminal is out of
   reach (a start-up script, a teammate's tmux, a dropped SSH session), so you `kill` it from
   another terminal. The launch is gone, but its nodes are still in `ros2 node list`.
2. **Inside the computer** (intro level): CPU, cores and registers; cache, RAM and SSD as one
   hierarchy, with latencies measured on a real laptop (1.7 ns L1 to 65 µs SSD); the kernel as
   the program that shares cores, RAM and devices. OS‑2 goes deeper.
3. **A node is a process:** a program is a file on the SSD; running it makes a process in RAM.
   PID, parent, the process tree; fork + exec; `ps --forest`, `/proc`. A container's processes
   are ordinary processes with their own view: they show up in `ps` on the host.
4. **Stopping a process:** signals. Ctrl+C = SIGINT, `docker stop` = SIGTERM then SIGKILL after
   the grace period, a closed SSH session = SIGHUP, SIGKILL can't be caught. Why a launcher must
   pass signals on to its children, and what is left behind when it can't (orphans).
5. **Daemons:** a process with no terminal that keeps running in the background. Keeping work
   alive after SSH drops (tmux, `nohup`); daemons members meet: the Docker daemon, `ros2 daemon`
   (stale node lists), an agent that owns a device (`micro_ros_agent`). How to find, inspect and
   stop one.
6. **Who may touch this file** (kept simple): every file has an owner and a group; your process
   runs as a user (`id`); read r and w in `ls -l`. Examples: a `build/` folder owned by root
   after building as root in a container (why compose files pass the user ID); `/dev/...` is a
   file, often a symlink with a friendly name; what a privileged container skips.
7. **Code you didn't compile:** executable vs shared library, plugins loaded at runtime, `ldd`,
   "undefined symbol" / "plugin failed to load"; sourcing an overlay on top of an underlay, and
   why the wrong `setup.bash` loads the wrong version of a package.

**Go deeper:** udev rules (how a device gets a stable name), the full permission bits, the
`dialout` group; systemd services (starting software at boot); `strace`, `top`, more of
`/proc`.

**Why it matters:** every node is a Linux process. Nodes that won't stop, things that die when
SSH drops, permission errors and "works on my machine" library problems are what block members
most, and all of them are OS problems, not ROS problems.

## 2. OS‑2: Memory, Concurrency and Devices

**Through-line:** what the computer is really doing while your node runs: where its data lives,
who gets the CPU when, and how bytes arrive from a device.

**Running example:** one node with a timer, a subscription and a serial reader, run first with a
single-threaded and then with a multi-threaded executor.

**Core:**
1. **Puzzle:** the node is fine with one thread. Switch to a multi-threaded executor "to make it
   faster" and a counter shared by two callbacks comes out wrong, or the node freezes.
2. **Inside the computer:** builds on OS‑1's intro. What happens at this level when a program
   starts and runs: instructions, the program counter, a function call and the stack; why data
   layout and access patterns decide speed (cache lines, the pointer-chasing benchmark again). CPU vs GPU, and
   why a robot carries a Jetson-class computer.
3. **Virtual memory:** every process gets its own address space; pages; why a bad pointer is a
   segfault in your process and not a corrupted neighbour. Shared memory between processes: how
   DDS can pass large messages without copying (and why containers set `ipc: host`).
4. **Threads, the scheduler and executors:** process vs thread; the OS scheduler decides which
   thread runs (time slices, priorities), and why a busy CPU makes a timer late; what the
   executor loop does inside one process; single- vs multi-threaded executors; callback groups
   (mutually exclusive vs reentrant).
5. **Synchronization:** race conditions, mutexes, deadlock. A blocking service call inside a
   callback (the example worksheet) as the deadlock members actually hit.
6. **Exceptions, interrupts and devices:** how the CPU stops what it's doing (exceptions,
   interrupts); polling vs interrupts vs DMA; how bytes get from a UART to a node, on the MCU
   side and the Linux side. The same ideas on an MCU: an RTOS with tasks, priorities and timer
   interrupts (FreeRTOS).

**Go deeper:** real-time scheduling on Linux (`nice`, real-time priorities, PREEMPT_RT) and why
hard real-time loops still go on the MCU; cache lines and why data layout matters; page faults
and the out-of-memory killer; priority inversion; seeing where a hung program is stuck (`py-spy
dump`, gdb `thread apply all bt`).

**Why it matters:** concurrency bugs in ROS (deadlocked executors, callbacks that never run, data
races between timers and subscriptions) are hard to reason about without this model, and every
"why is this slow on the robot?" question starts from the memory hierarchy. It is also the
bridge to firmware: interrupts and device I/O are where Linux meets the MCU.

## 3. Networking & Virtualization

**Through-line:** the trip a message takes from one node to another (same machine, another
container, another computer over Wi‑Fi), and what can stop it at each step.

**Running example:** a talker and a listener, moved step by step: one container, two containers,
two laptops on the same Wi‑Fi.

**Core:**
1. **Puzzle:** talker and listener on two laptops on the same Wi‑Fi; the topic shows up in
   `ros2 topic list` on both, but no message arrives. (Or: the listener receives another robot's
   messages.)
2. **Layers:** application, transport, IP, link; addresses and ports; one packet walked through
   each layer. Tools: `ip addr`, `ping`, `ss`.
3. **UDP vs TCP; unicast, broadcast, multicast:** what each costs and guarantees; what DDS uses
   and why. ROS 2 QoS as DDS's own guarantees on top of UDP: reliable vs best effort, durability
   (why a node that starts late never gets the map), and what happens when two sides disagree.
4. **How ROS 2 nodes find each other:** DDS discovery over multicast; `ROS_DOMAIN_ID` (one per
   robot) and the ports it picks; why discovery fails on campus Wi‑Fi and through firewalls;
   giving Cyclone DDS a list of peers.
5. **VM vs container:** what each isolates; a container is processes with their own view
   (namespaces, back to OS‑1); images and layers.
6. **Docker networks:** bridge vs `network_mode: host`, NAT and port mapping; why ROS containers
   usually run on the host network; bridging DDS across networks that don't carry multicast
   (e.g. Zenoh).

**Go deeper:** watching DDS traffic with `tcpdump` / Wireshark; clocks on two computers (NTP /
chrony) and the TF errors a clock offset causes; large
messages and fragmentation; DNS and mDNS; ROS 2 security (SROS2).

**Why it matters:** robots talk to laptops over Wi‑Fi, and our whole dev setup runs in Docker.
"I can't see the topic" is the networking problem members will actually debug, and it can't be
solved by guessing.

## 4. State Estimation

**Through-line:** where is the robot? Every sensor gives a wrong answer, each in its own way;
combining them gives a better one, and knowing *how* wrong is half the job.

**Running example:** a 2D robot simulated in a short Python script, with wheel odometry, an IMU,
range readings to fixed beacons and a camera that sees a marker, plotted against the true path.

**Core:**
1. **Puzzle:** the robot drives a square and stops where it started, but odometry says it is
   30 cm away, and every lap is worse.
2. **Frames and transforms:** a 2D pose; rotating and translating; composing transforms; what TF
   computes and why frames form a tree (map, odom, base, sensors, camera). Quaternions only as
   far as reading them.
3. **Odometry:** dead reckoning from wheels and the IMU; why small errors grow without bound.
4. **Uncertainty:** noise, the Gaussian, covariance drawn as an ellipse; the Bayes filter idea:
   predict (uncertainty grows), then update (it shrinks).
5. **Kalman filter:** worked through in 1D; then the EKF as the same idea for the 2D pose,
   fusing odometry, IMU and beacons (the idea and the robot_localization-style setup, not the
   matrix algebra).
6. **Absolute fixes: beacons and cameras:** finding the robot from beacon distances
   (trilateration, the same idea as GPS); a camera as a sensor: the pinhole model, intrinsics and
   calibration, and a known marker (ArUco) giving a pose through solvePnP. Each fix goes into
   the filter from Part 5.

**Go deeper:** a particle filter as the other approach (AMCL is one); depth cameras and lidar
scan matching; tracking another robot (motion models and switching between them: IMM, the
idea); rejecting outliers (gating); sensor timing and synchronisation; SLAM, the idea not the
math.

**Why it matters:** this is the theory behind the localization group, and the biggest gap in a CS
background: CS courses rarely teach it. Without it, TF and Nav2 configuration is copy-paste.
Everything downstream (nav, main) trusts the pose estimate.

## 5. Control Systems

**Through-line:** turning a wanted motion into motor commands, and keeping it right while the
world pushes back.

**Running example:** a simulated motor, a simulated omni-wheel base and a two-joint arm, in
Python, with a controller members tune live.

**Core:**
1. **Puzzle:** PID gains that work well at 100 Hz make the robot shake at 20 Hz, or when the
   loop is sometimes late.
2. **Open loop vs feedback:** the block diagram; error; why open loop drifts.
3. **PID:** what P, I and D each do; tuning by intuition; integral windup; feedforward.
4. **Control in discrete time:** a loop at a fixed rate; `dt`; what a late or jittery loop does
   to the result (back to the scheduler in OS‑2).
5. **Kinematics: from where you want to be to what each motor does:** forward vs inverse
   kinematics. The base: `cmd_vel` to wheel speeds (inverse) and wheel speeds back to odometry
   (forward, back to State Estimation), for a differential drive and an omni-wheel robot. An arm:
   a two-joint arm solved by hand with geometry, then, briefly, why that stops working with more
   joints (numerical IK, more than one answer, targets out of reach, singularities) and what
   solvers do for you (KDL, TRAC-IK, MoveIt, given a URDF).
6. **Following a path:** a simple path-tracking controller (pure pursuit); where Nav2
   controllers fit; MPC at a glance, and why cars and drones use it.

**Go deeper:** IK in more depth (the Jacobian, joint limits, motion planning for arms in
MoveIt); MPC in more depth; ros2_control; stability and why some gains oscillate; cascaded loops
(current, speed, position: the firmware's side); system identification.

**Why it matters:** control is algorithms, not hardware. It's how the nav group turns a path
into wheel commands, how a mechanism reaches a target, and how firmware holds motor speed. It
also explains why timing matters.

## 6. Decision-Making and Planning

**Through-line:** a match lasts 100 seconds: what should the robot do next, where should it go,
and what should it do when that fails?

**Running example:** a toy match in simulation: a start signal, a match timer, tasks worth points
spread over a field, a rival robot, and actions that sometimes fail or never return, run by a
behavior tree (BehaviorTree.CPP).

**Core:**
1. **Puzzle:** the robot keeps retrying a failed grab until the match ends, scoring nothing
   else. (Or: it "completes" a task that never happened, because it waited a fixed time instead
   of checking.)
2. **A match from start to finish:** the robot's own life cycle as a state machine: bring-up (ROS
   2 lifecycle nodes: configure, activate), every subsystem reports ready, wait for the start
   signal, the match timer, end of match and stop everything. Where state machines work well (a
   few fixed phases) and why they explode when used for the strategy itself.
3. **Behavior trees:** ticks; Success / Failure / Running; sequence, fallback, reactive nodes,
   decorators; the blackboard; subtrees, and one tree per plan or starting side. Reading a tree
   written in XML.
   A short detour into general software: stateless vs stateful. A stateless function gives the
   same answer for the same input; a stateful one remembers (a counter, "which step am I on").
   Why state makes code harder to test, restart and run twice; where it belongs (the blackboard,
   one owner) and where it hides (globals, a node that restarts and forgets). In BT terms: a
   condition that just checks vs an action that is still Running.
4. **Asking another node to do something, and knowing if it worked:** ROS 2 actions (goal,
   feedback, result, cancel); halting a running node; did the action really succeed (waiting a
   fixed time vs checking with a sensor); timeouts, retries, fallbacks.
5. **Choosing what to do next:** a world model (what is on the field, what is done, where the
   rival is); scoring candidate tasks (points, distance, risk near the rival) and picking the
   best; greedy vs planned; replanning as the clock runs down. The same question at a different
   scale: how an OS scheduler picks the next process (round robin, priorities, deadlines).
6. **Planning a path:** the field as a graph; BFS, Dijkstra, A*; costmaps and inflation; how a
   Nav2 planner sits under the tree.

**Go deeper:** real-time scheduling (earliest deadline first, rate-monotonic); goal-oriented and
HTN planning; coordinating two robots, and task allocation for a warehouse fleet; sampling-based
planners (RRT) for arms and large spaces; testing decision logic with
mock subsystems and in simulation; inside Nav2's BT navigator.

**Why it matters:** this is the main group's subject, and no other course covers it. Main is
where every subsystem's failures land, so it decides whether the robot scores when something
goes wrong mid-match.

## 7. Machine Learning with Robotics

Basic terms and intuition; sources: CS231n and beyond.

**Through-line:** from pixels to something the robot can act on: a detection it can trust, in
time to use it, and where learning goes beyond detection.

**Running example:** a small object detector: fine-tune it, run it on camera images, and time the
whole chain. (Turning a detection into a position in the world is camera geometry, taught in
State Estimation.)

**Core:**
1. **Puzzle:** the model scores 95 % on its validation set but misses the object on the robot,
   or finds it after the robot has already moved on.
2. **Neural networks and the training loop:** loss, gradients, train / validation / test;
   overfitting, and why the puzzle's 95 % lied.
3. **CNNs and detection:** convolution; what YOLO outputs (boxes, scores, non-max suppression).
4. **Deployment:** ONNX / TensorRT, quantization, the GPU (back to OS‑2); latency vs FPS: why a
   30 FPS model with 200 ms latency is a problem in a control loop.
5. **Beyond CNNs:** Transformers; one slide each on RNN, self-supervised learning, generative
   models (autoregressive, diffusion).
6. **Learning to act:** robot learning now: reinforcement learning, diffusion policy, VLAs (π0,
   Gemini Robotics, GR00T); world (action) models, pixel vs latent space, JEPA.

**Go deeper:** collecting and labelling data; augmentation; evaluation metrics (mAP); training
on simulated data.

**Why it matters:** the vision group uses detection models directly, and learning is where the
field is moving fastest. Deployment is the part that decides whether a model is usable on the
robot, and it's rarely taught.

## 8. Robot Software Landscape

**Through-line:** one robot, end to end: follow one action from the sensor reading to the motor
and back, then place every part (and industry's robots) on the same map.

**Running example:** a typical competition robot drawn layer by layer, and the trace of one
scoring action through it.

**Core:**
1. **Puzzle:** the robot misses one scoring action. Five layers could be to blame: which one, and
   how would you tell?
2. **Anatomy of a robot stack:** sense → perceive → estimate → decide → plan → control →
   actuate, plus middleware, simulation, data and tooling. The hardware at each end: sensors
   (encoders, IMU, lidar, cameras) and actuators (DC and brushless motors, servos, steppers,
   motor drivers), and what each is good and bad at.
3. **Each layer in turn:** the problem, inputs and outputs, classical vs learned methods,
   failure modes, standard tools; which earlier course covered it.
4. **The firmware boundary and safety:** MCU vs Linux computer, main loop vs RTOS, UART/CAN as
   protocols; micro-ROS: a node on the MCU, an agent on the computer. What happens when the link
   drops or a node dies: watchdogs, stopping on silence, the emergency stop.
5. **Simulation and data:** simulation and sim-to-real; logging and replaying runs (rosbag).
6. **The real world now:** self-driving (modular vs end-to-end), warehouse AMRs, humanoids, robot
   foundation models; trends (data as the bottleneck, teleop data collection, sim-to-real).
   Exercise: draw the stack of a real robot, guess its failure modes, map job roles to layers.

**Go deeper:** a reading list per layer.

**Why it matters:** this is the course that ties the others together. Afterwards a member can
place any subsystem, ours or industry's, on one map and see where their work fits. Best taught
last. The industry section goes stale fastest: refresh it each year.

---

## Debug Clinic (workshop, not a course)

**Through-line:** a method, not a list of fixes: reproduce, read the error, narrow it down, check
one assumption at a time.

**Running example:** a broken ROS 2 workspace per member or pair.

**Format:**
- members get a broken workspace (build errors, wrong QoS, deadlocked executor, bad TF, crash,
  a node that won't stop) and fix it with help
- tools picked up along the way: reading compiler/linker errors, colcon, gdb, `strace`,
  `ros2 doctor`, `ros2 topic info -v`, rosbag replay
- faults are written for the clinic; never reuse anything from the recruiting exam

**Why it matters:** debugging is learned by doing, not from slides. It's the skill that makes a
member productive on the team, and a workshop works even when no one on the teaching side is an
expert.
