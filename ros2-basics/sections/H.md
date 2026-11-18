---
page: ROS2 tools
where: 在「ros2 bag」之後、「rqt plugin」之前
title: 用程式讀 bag
gap: 8
---
@@note run

錄好的 bag 除了播放，也可以用程式讀出來分析（算次數、時間、畫圖）。

1. 錄一個 bag：先讓兩個 topic 有人發（QoS 那節的 `qos_demo.py pub` 發 `/map_name`，另一個 terminal 用指令發 `/chatter`），再開始錄，幾秒後按 Ctrl+C 停止

```bash
# Terminal 1
python3 qos_demo.py pub
# Terminal 2
ros2 topic pub -r 5 /chatter std_msgs/msg/String "{data: hello}"
# Terminal 3：錄幾秒後按 Ctrl+C
ros2 bag record -o demo_bag /chatter /map_name
```

2. 程式碼：印出每個 topic 的第一筆訊息和總筆數

:::toggle Python：read_bag.py（任何訊息型態都能讀）
@@code read_bag.py
:::

:::toggle C++：read_bag.cpp（依賴 rclcpp、std_msgs、rosbag2_cpp；要先知道型態才能解開）
@@code read_bag.cpp
:::

3. 執行

```bash
python3 read_bag.py demo_bag
# C++：ros2 run <你的 package> read_bag demo_bag
```

```bash
first message on /map_name at 1793385688.30 s: std_msgs.msg.String(data='warehouse')
first message on /chatter at 1793385688.30 s: std_msgs.msg.String(data='hello')
{'/map_name': 1, '/chatter': 17}
```

C++ 版本只解開 `/chatter`，輸出像這樣：

```bash
first message on /chatter at 1793462279.75 s: hello
/chatter: 18
/map_name: 1
```

> 印出的時間是 bag **錄到**訊息的時間（真實時間）。用 sim time 的系統，訊息內容裡的 `header.stamp` 才是 sim time；分析時要清楚自己用的是哪一個。
