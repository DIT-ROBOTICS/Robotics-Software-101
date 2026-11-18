---
page: Service 通訊
where: 在「Service實作」之後、「參考資料」之前
title: 在 callback 裡呼叫 service
gap: 2
---
@@note run
@@note install

前面的 Python client 是這樣寫的：

```python
future = self.client.call_async(req)
rclpy.spin_until_future_complete(self, future)
```

這在 `main` 裡沒問題，但**不能搬進 callback 裡**（例如 timer 或 subscriber 的 callback）。C++ 也一樣：在 callback 裡 `future.wait()`、`future.get()` 或 `rclcpp::spin_until_future_complete` 都會卡住。

`spin` 預設是單執行緒：一次只跑一個 callback。如果 callback 在等 service 的回覆，回覆本身也要由同一個執行緒處理，結果就是**永遠等下去**，整個 node 卡死。

正確的做法：送出 request 後馬上 return，等回覆到了再用另一個 callback 處理。

1. 一個「很慢」的 server（模擬要做 2 秒的工作）

:::toggle Python：slow_server.py
@@code slow_server.py
:::

:::toggle C++：slow_server.cpp（依賴 rclcpp、example_interfaces）
@@code slow_server.cpp
:::

2. 錯誤示範：在 timer callback 裡等回覆

:::toggle Python：blocking_client.py
@@code blocking_client.py
:::

:::toggle C++：blocking_client.cpp（依賴 rclcpp、example_interfaces）
@@code blocking_client.cpp
:::

3. 正確寫法：送出去就 return，回覆用 callback 接

- Python：`future = client.call_async(request)`，再 `future.add_done_callback(self.on_response)`
- C++：`client_->async_send_request(request, callback)`

:::toggle Python：async_client.py
@@code async_client.py
:::

:::toggle C++：async_client.cpp（依賴 rclcpp、example_interfaces）
@@code async_client.cpp
:::

4. 跑跑看

**Terminal 1**

```bash
python3 slow_server.py
# C++：ros2 run <你的 package> slow_server
```

**Terminal 2**：錯誤示範，`calling...` 之後 heartbeat 就停了，再也不會動

```bash
python3 blocking_client.py
# C++：ros2 run <你的 package> blocking_client
```

```bash
[INFO] [blocking_client]: heartbeat
[INFO] [blocking_client]: heartbeat
[INFO] [blocking_client]: calling...
```

> 卡住之後，Python 版本按 Ctrl+C 可以結束；**C++ 版本按 Ctrl+C 關不掉**（它卡在 `future.wait()` 裡），要按 **Ctrl+\\** 強制結束。

**Terminal 2**：正確寫法，等回覆的 2 秒內 heartbeat 照常印

```bash
python3 async_client.py
# C++：ros2 run <你的 package> async_client
```

```bash
[INFO] [async_client]: sent 1 + 10
[INFO] [async_client]: heartbeat
[INFO] [async_client]: heartbeat
...（等回覆的 2 秒內一直印 heartbeat）
[INFO] [async_client]: result: 11
```

> 規則：**callback 裡不要等待**（不要等 future、不要 `spin_until_future_complete`、不要 sleep）。送出去、return，結果用 callback 處理。另一個辦法是用多執行緒，見下一節「Executor 與 Callback Group」。
