---
page: Service 通訊
where: 在「在 callback 裡呼叫 service」（上一個加的段落）之後
title: Executor 與 Callback Group
gap: 6
---
@@note run

雜談 介紹過 executor 和 thread，這節實際寫一次。

### 觀念

- `spin(node)` 用的是 **SingleThreadedExecutor**：所有 callback 排隊，一次跑一個。一個 callback 卡住，整個 node 都停。
- **MultiThreadedExecutor** 可以同時跑多個 callback，但要搭配 **callback group** 決定哪些可以同時跑：

| Callback group | 同一個 group 內的 callback |
|---|---|
| MutuallyExclusive（預設） | 一次只跑一個 |
| Reentrant | 可以同時跑（包含同一個 callback 跑好幾份） |

- Python：`MutuallyExclusiveCallbackGroup()`、`ReentrantCallbackGroup()`，建立 timer / client / subscription 時傳 `callback_group=`
- C++：`create_callback_group(rclcpp::CallbackGroupType::MutuallyExclusive)`，建立時當作最後一個參數傳進去。⚠️ group 要存成**成員變數**：node 只保留 weak_ptr，如果存在 constructor 的區域變數裡，離開 constructor 就被釋放，裡面的 timer 和 client 再也不會執行（而且不會報錯）

> 沒有指定 group 時，node 裡所有 callback 都在**同一個** MutuallyExclusive group：就算換成 MultiThreadedExecutor，還是一次只跑一個。

### 實作：用 callback group 讓上一節的錯誤示範能動

上一節的 blocking client 卡死，是因為等待回覆的 callback 和處理回覆的 client 在同一個 group、同一個執行緒。把它們分到不同的 group，再用 MultiThreadedExecutor。

等回覆時不要一直等下去，每 0.1 秒檢查一次 `rclpy.ok()`（C++ `rclcpp::ok()`）：按 Ctrl+C 時 ROS 會關閉，等待中的執行緒要能停下來，程式才關得掉。

:::toggle Python：groups_client.py
@@code groups_client.py
:::

:::toggle C++：groups_client.cpp（依賴 rclcpp、example_interfaces）
@@code groups_client.cpp
:::

跑跑看（Terminal 1 開著上一節的 slow_server）：

```bash
python3 groups_client.py
# C++：ros2 run <你的 package> groups_client
```

`calling...` 之後 heartbeat 照常印，2 秒後拿到結果：

```bash
[INFO] [groups_client]: calling...
[INFO] [groups_client]: heartbeat
[INFO] [groups_client]: heartbeat
...（等回覆的 2 秒內一直印 heartbeat）
[INFO] [groups_client]: result: 3
```

### 想一想

- 如果把 timer 和 client 改成同一個 MutuallyExclusive group，會發生什麼事？
- 多執行緒時，兩個 callback 同時改同一個變數（例如機器人的狀態）會怎樣？要怎麼保護？（Python `threading.Lock`、C++ `std::mutex`）
- 上一節的非同步寫法和這節的多執行緒寫法，各有什麼好處？
