---
page: ROS2 tools
where: 在頁面最後（「foxglove」之後）
title: 除錯常用指令
gap: 7
---
系統跑不起來或「收不到東西」時，先用指令看清楚現在**有哪些 node、誰連到誰、設定是什麼**，再改程式。

| 指令 | 用途 |
|---|---|
| `ros2 node list` | 有哪些 node 在跑（名字重複會出問題） |
| `ros2 node info /node_name` | 這個 node 訂閱、發布、提供、呼叫了什麼 |
| `ros2 topic info -v /topic` | 誰在發、誰在收，以及雙方的 QoS |
| `ros2 topic hz /topic` | 實際頻率；沒有輸出表示根本沒在發 |
| `ros2 service list -t` | 所有 service 和型態 |
| `ros2 action list` / `ros2 action info /action` | 所有 action；有幾個 client / server |
| `ros2 param list /node_name` / `ros2 param get /node_name 名稱` | node 實際拿到的參數值 |
| `ros2 doctor` | 檢查環境和常見問題 |
| `rqt_graph` | 圖形化的 node / topic 連線圖 |

:::toggle 範例：ros2 node info 的輸出
```bash
ros2 node info /async_client
```

```bash
/async_client
  Subscribers:
  Publishers:
    /parameter_events: rcl_interfaces/msg/ParameterEvent
    /rosout: rcl_interfaces/msg/Log
  Service Servers:
    /async_client/describe_parameters: rcl_interfaces/srv/DescribeParameters
    ...
  Service Clients:
    /add_two_ints: example_interfaces/srv/AddTwoInts
  Action Servers:
  Action Clients:
```
:::

:::toggle 範例：ros2 doctor 的輸出
```bash
ros2 doctor
```

```bash
UserWarning: Subscriber without publisher detected on /map_name.
All 5 checks passed
```
:::

> 除錯的順序：**先猜原因 → 用指令驗證 → 再改程式 → 再驗證一次**。不要一次改很多地方。
> 常見原因：topic 名稱打錯、QoS 不相容、參數沒載入（YAML 的 node 名稱寫錯）、`use_sim_time` 沒設。
