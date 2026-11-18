---
page: Parameter
where: 在「撰寫 YAML 檔」之後、「Reference」之前
title: use_sim_time 與 /clock
gap: 4
---
@@note run

### 什麼是 sim time ?

模擬器（Gazebo、自己寫的模擬器）或播放 rosbag 時，「時間」由模擬器決定，可能比真實時間快、慢、或暫停。模擬器把目前的時間發在 `/clock` topic 上。

每個 node 都有一個 parameter `use_sim_time`：

| `use_sim_time` | node 的時間（Python `get_clock().now()`、C++ `now()`） | timer 跟著 |
|---|---|---|
| `false`（預設） | 電腦的時間（wall time） | 真實時間 |
| `true` | `/clock` 上的時間（sim time） | `/clock` |

> ⚠️ 用了 sim time，程式裡就**不要用**真實時間來算時間或等待（Python 的 `time.time()`、`time.sleep()`，C++ 的 `std::chrono::system_clock`、`sleep_for`）：模擬器跑 4 倍速時，這些還是照真實時間走。
> - Python：用 `self.get_clock().now()` 和 `create_timer()`
> - C++：用 `now()` 和 `rclcpp::create_timer(this, get_clock(), ...)`。**`create_wall_timer` 永遠是真實時間**，不會跟著 sim time。

### 實作

1. 程式碼：每秒（ROS time）印出 ROS time 和真實時間

:::toggle Python：sim_time_demo.py
@@code sim_time_demo.py
:::

:::toggle C++：sim_time_demo.cpp（依賴 rclcpp）
@@code sim_time_demo.cpp
:::

2. 不用 sim time：兩個時間一樣

```bash
python3 sim_time_demo.py
# C++：ros2 run <你的 package> sim_time_demo
```

```bash
[INFO] [time_demo]: ROS time 1793385680.5 s, wall time 1793385680.5 s
```

3. 用 sim time，但沒有人發 `/clock`：**timer 完全不會觸發**（時間停在 0）

```bash
python3 sim_time_demo.py --ros-args -p use_sim_time:=true
# C++：ros2 run <你的 package> sim_time_demo --ros-args -p use_sim_time:=true
```

4. **Terminal 2** 自己假裝是模擬器，發 `/clock`

```bash
ros2 topic pub -r 10 /clock rosgraph_msgs/msg/Clock "{clock: {sec: 100}}"
```

Terminal 1 就會開始印，而且 ROS time 是 `/clock` 給的 100 秒：

```bash
[INFO] [time_demo]: ROS time 100.0 s, wall time 1793385675.9 s
```

### 在 YAML 裡設定

每個 node 都要設，寫在該 node 的 `ros__parameters` 底下：

```yaml
time_demo:
  ros__parameters:
    use_sim_time: true
```

確認有沒有設到：

```bash
ros2 param get /time_demo use_sim_time
```

```bash
Boolean value is: True
```
