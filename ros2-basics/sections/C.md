---
page: Action 通訊
where: 在「自定義 Action」之後、「相關內容」之前
title: Python Action Client
gap: 3
---
@@note run
@@note install

> C++ 的 action server 和 client 在上面「自定義 Action」已經有了。這節是 Python 版本，可以和上面的 C++ server 互通（action 名稱都是 `fibonacci`）。

一個 action 的流程有三個非同步的步驟，每一步都用 callback 接：

1. `send_goal_async()` → server 回覆**接受或拒絕** → `on_goal_response`
2. 執行中持續收到 **feedback** → `on_feedback`
3. `get_result_async()` → 收到**結果與狀態** → `on_result`

:::toggle Python：fib_client.py
@@code fib_client.py
:::

只用 Python 測試的話，這是對應的 server。它用 `MultiThreadedExecutor`，執行 goal 的同時才能處理 cancel request：

:::toggle Python：fib_server.py
@@code fib_server.py
:::

### 跑跑看

**Terminal 1**：上面的 C++ server，或

```bash
python3 fib_server.py
```

**Terminal 2**：讓它跑完

```bash
python3 fib_client.py
```

```bash
[INFO] [fibonacci_action_client]: goal accepted
[INFO] [fibonacci_action_client]: feedback: [0, 1, 1]
[INFO] [fibonacci_action_client]: feedback: [0, 1, 1, 2]
...
[INFO] [fibonacci_action_client]: status 4, result: [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55]
```

**Terminal 2**：1.2 秒後取消

```bash
python3 fib_client.py 1.2
```

```bash
[INFO] [fibonacci_action_client]: goal accepted
[INFO] [fibonacci_action_client]: canceling
[INFO] [fibonacci_action_client]: status 5, result: [0, 1, 1, 2, 3]
```

> 注意：**goal 被拒絕**（`accepted == False`）和**執行失敗**（status 6 = ABORTED）是兩件事，兩個都要處理。取消之後要等 `on_result` 收到 status 5 才算真的停下來。

### Action 相關指令

```bash
ros2 action list                     # 列出所有 action
ros2 action info /fibonacci          # 有幾個 client / server
ros2 action send_goal --feedback /fibonacci action_tutorials_interfaces/action/Fibonacci "{order: 3}"
```

最後一行會印出 feedback，最後是：

```bash
Goal finished with status: SUCCEEDED
```
