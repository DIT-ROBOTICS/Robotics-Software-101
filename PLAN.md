# DIT software courses (plan)

Eight courses of at most 4 hours each, plus one hands-on debug clinic. All introductory: the
goal is a mental map of the whole robot software stack, not mastery of any one part.

Our robot's subsystems and the courses that serve them:

| Subsystem | Courses |
|---|---|
| Localization | State Estimation |
| Vision | ML with Robotics |
| Nav | Control Systems (and the planning part of Decision-Making) |
| Firmware/hardware | OS‑2 (I/O, interrupts), Robot Software Landscape |
| Main | Decision-Making |
| Everything | OS‑1, OS‑2, Networking & Virtualization, Debug Clinic |

Suggested order: OS‑1 → OS‑2 → Networking & Virtualization → State Estimation → Control →
Decision-Making → ML → Landscape. Run the Debug Clinic any time after OS‑2.

---

## 1. OS - 1: Files and Processes
- file, permission, user, group
  - link, symlink
  - ROS tie-in: why `/dev/ttyUSB0` needs the `dialout` group; udev rules; device access in Docker
- process, fork, exec
  - daemon
  - what an executable and a shared library are; why "undefined symbol" happens
- IPC, pipe, signal
  - ROS tie-in: why Ctrl+C on `ros2 launch` sometimes leaves orphan nodes
- scheduling
  - ROS tie-in: control-loop jitter; what PREEMPT_RT is for
- tools: `ps`, `top`, `strace`, `/proc`

**Why it matters:** every node is a Linux process. Permission errors, nodes that won't stop,
and "works on my machine" library problems are the most common things that block members, and
all of them are OS problems, not ROS problems.

## 2. OS - 2: Memory, Concurrency and Devices
- exception, interrupt
- I/O, device
- virtual memory
  - ROS tie-in: shared memory and zero-copy transport in DDS
- multi-threading
- synchronization: mutex, deadlock, race condition
  - ROS tie-in: executors and callback groups; why a blocking service call inside a callback
    hangs a single-threaded executor
- short detour: CPU caches, CPU vs GPU, why we use a Jetson-class computer
- tools: `py-spy dump`, gdb `thread apply all bt` to see where a hung program is stuck

**Why it matters:** concurrency bugs in ROS (deadlocked executors, callbacks that never run,
data races between timers and subscriptions) are hard to reason about without this model. It
is also the bridge to firmware: interrupts and device I/O are where Linux meets the MCU.

## 3. Networking & Virtualization
- the layering of networks
- IP, UDP vs TCP, ports
- walk through each layer
- unicast, broadcast, multicast
- VM vs container
- Docker
  - Docker networks: bridge vs `network_mode: host`
- finale: why ROS 2 breaks on campus Wi‑Fi
  - DDS discovery over multicast, `ROS_DOMAIN_ID`, Cyclone DDS config, firewalls

**Why it matters:** robots talk to laptops over Wi‑Fi, and our whole dev setup runs in Docker.
"I can't see the topic" is the networking problem members will actually debug, and it can't be
solved by guessing.

## 4. State Estimation
- coordinate frames, rotations, quaternions (what TF is actually computing)
- odometry and why it drifts
- probability for robots: noise, uncertainty, Bayes filter intuition
- Kalman filter, EKF
- particle filter (AMCL is one)
- sensor fusion: odometry + IMU + lidar/beacons
- SLAM: the idea, not the math

**Why it matters:** this is the theory behind the localization group, and it's the biggest gap
in a CS background: CS courses rarely teach it. Without it, TF and Nav2 configuration is
copy-paste. Everything downstream (nav, main) trusts the pose estimate.

## 5. Control Systems
- open loop vs feedback
- PID: what each term does, tuning by intuition
- discretization: control at a fixed rate in software, what happens when the loop is late
- feedforward
- a quick look at MPC
- how ros2_control and Nav2 controllers fit in

**Why it matters:** control is algorithms, not hardware. It's how the nav group turns a path
into wheel commands, and how firmware holds motor speed. It also explains why timing (OS‑1
scheduling) matters.

## 6. Decision-Making
- finite state machines
- behavior trees (BehaviorTree.CPP; Nav2 uses them)
- task scheduling under a deadline: the match timer, points vs time
- failure handling: timeouts, retries, fallbacks when an action fails
- planning intro: graph search, A*, costmaps (how Nav2's planner fits in)

**Why it matters:** this is the main group's subject, and no other course covers it. Main is
where every subsystem's failures land, so it decides whether the robot scores when something
goes wrong mid-match.

## 7. Machine Learning with Robotics
**(basic terms and intuition), source CS231n and beyond**
- basics of neural networks, the training loop
- CNN
  - YOLO
- camera model and calibration (what vision needs besides a network)
- Transformer
- one slide each: RNN, self-supervised learning, generative models (autoregressive, diffusion)
- robot learning now: diffusion policy, VLAs (π0, Gemini Robotics, GR00T), reinforcement learning
- World (Action) Models
  - pixel space vs latent space
  - JEPA
- deployment: ONNX/TensorRT, quantization, latency on edge hardware; why a 30 FPS model with
  200 ms latency is a problem in a control loop

**Why it matters:** the vision group uses detection models directly, and learning is where the
field is moving fastest. Deployment is the part that decides whether a model is usable on the
robot, and it's rarely taught.

## 8. Robot Software Landscape
- anatomy of a robot stack: sense → perceive → estimate → decide → plan → control → actuate,
  plus middleware, simulation, data, tooling
- our robot on that map: localization, vision, nav, firmware/hardware, main; what each reads,
  publishes and assumes about the others
- each layer in depth: problem, inputs/outputs, classical vs learned method, failure modes,
  standard tools
- firmware boundary: MCU vs Linux computer, main loop vs RTOS, UART/CAN as protocols, micro-ROS
- simulation and sim-to-real
- the real world now: self-driving (modular vs end-to-end), warehouse AMRs, humanoids, robot
  foundation models; trends (data as the bottleneck, teleop data collection, sim-to-real)
- exercise: draw the stack of a real robot and guess its failure modes; map job roles to layers

**Why it matters:** this is the course that ties the others together. Afterwards a member can
place any subsystem, ours or industry's, on one map and see where their work fits. Best taught
last. The industry section goes stale fastest: refresh it each year.

---

## Debug Clinic (workshop, not a course)
- members get a broken ROS 2 workspace (build errors, wrong QoS, deadlocked executor, bad TF,
  crash) and fix it with help
- tools picked up along the way: reading compiler/linker errors, colcon, gdb, `strace`,
  `ros2 doctor`, `ros2 topic info -v`, rosbag replay
- the Part B broken-workspace generator is a model for the format; use different faults

**Why it matters:** debugging is learned by doing, not from slides. It's the skill that makes a
member productive on the team, and a workshop works even when no one on the teaching side is an
expert.
