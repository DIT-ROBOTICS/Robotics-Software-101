---
page: Topic
where: 在「Topic 監控工具」之後、「Turtlesim」之前
title: QoS (Quality of Service)
gap: 1
---
@@note run

### 什麼是 QoS ?

ROS 2 的每個 publisher 和 subscriber 都有一組 QoS 設定，決定訊息「怎麼送」。最常用的兩個：

| 設定 | 選項 | 意思 |
|---|---|---|
| Reliability | `RELIABLE` | 掉了會重送，保證送到（預設） |
|  | `BEST_EFFORT` | 掉了就算了，適合高頻感測器資料 |
| Durability | `VOLATILE` | 只收得到「訂閱之後」才發的訊息（預設） |
|  | `TRANSIENT_LOCAL` | publisher 會保留最後幾筆，晚加入的 subscriber 也收得到 |

> ⚠️ 兩邊的 QoS 不相容時，**完全收不到任何訊息**，而且程式不會報錯，只會在 log 印一行 warning：
> - subscriber 要 `RELIABLE`，publisher 只給 `BEST_EFFORT` → 收不到
> - subscriber 要 `TRANSIENT_LOCAL`，publisher 只給 `VOLATILE` → 收不到

`create_subscription(..., 10)` 裡的 `10` 其實就是一組 QoS：`RELIABLE` + `VOLATILE`，佇列長度 10（C++ 寫成 `rclcpp::QoS(10)`）。

### 「Latched」topic：只發一次的資料

地圖、設定這類資料通常只發一次。如果 subscriber 比 publisher 晚啟動，用預設 QoS 就永遠收不到。這時兩邊都要用 `TRANSIENT_LOCAL`：

- Python：`QoSProfile(depth=1, reliability=ReliabilityPolicy.RELIABLE, durability=DurabilityPolicy.TRANSIENT_LOCAL)`
- C++：`rclcpp::QoS(1).reliable().transient_local()`

1. 程式碼：同一個檔案有三種模式，`pub` 發布一次，`sub_default` 用預設 QoS 訂閱，`sub_latched` 用 latched QoS 訂閱

:::toggle Python：qos_demo.py
@@code qos_demo.py
:::

:::toggle C++：qos_demo.cpp（依賴 rclcpp、std_msgs）
@@code qos_demo.cpp
:::

2. **Terminal 1** 先發布（只發一次，之後保持開著）

```bash
python3 qos_demo.py pub
# C++：ros2 run <你的 package> qos_demo pub
```

3. **Terminal 2** 用預設 QoS 訂閱：什麼都收不到

```bash
python3 qos_demo.py sub_default
# C++：ros2 run <你的 package> qos_demo sub_default
```

4. **Terminal 2** 改用 latched QoS 訂閱：馬上收到

```bash
python3 qos_demo.py sub_latched
# C++：ros2 run <你的 package> qos_demo sub_latched
```

應該會輸出：

```bash
[INFO] [map_listener]: got map: warehouse
```

### 查看 topic 的 QoS

```bash
ros2 topic info -v /map_name
```

會列出每個 publisher / subscriber 的 QoS，其中：

```bash
Node name: map_publisher
  Reliability: RELIABLE
  Durability: TRANSIENT_LOCAL
```

用 `ros2 topic echo` 看 latched topic 時，也要指定 QoS：

```bash
ros2 topic echo --once --qos-durability transient_local --qos-reliability reliable /map_name
```

> 收不到訊息時，第一件事就是 `ros2 topic info -v` 比對兩邊的 QoS。
