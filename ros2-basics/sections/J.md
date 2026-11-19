---
page: Topic
where: 在「常見 Message」之後
title: .msg 檔的格式：欄位與常數
gap: 10
---
@@note run

### 兩種行：欄位和常數

用 `ros2 interface show` 看一個內建的 message，例如 action 的狀態（Action 頁的 client 印出的 `status 4`、`status 5` 就是這個）：

```bash
ros2 interface show action_msgs/msg/GoalStatus
```

```text
int8 STATUS_UNKNOWN   = 0
int8 STATUS_ACCEPTED  = 1
int8 STATUS_EXECUTING = 2
int8 STATUS_CANCELING = 3
int8 STATUS_SUCCEEDED = 4
int8 STATUS_CANCELED  = 5
int8 STATUS_ABORTED   = 6

GoalInfo goal_info
	unique_identifier_msgs/UUID goal_id
	...
int8 status
```

`.msg` 裡每一行都是「型態 名稱」，差別在有沒有 `=`：

| 寫法 | 是什麼 | 會隨訊息送出嗎 |
|---|---|---|
| `int8 STATUS_SUCCEEDED=4` | **常數**：有 `=`，名稱習慣全大寫 | 不會，只是程式裡可以用的固定值 |
| `int8 status` | **欄位**：每一筆訊息都帶的資料 | 會 |
| `uint8 slots 1` | **有預設值的欄位**：名稱後面直接寫值，沒有 `=` | 會，沒設定時就是 1 |

> ⚠️ 欄位和常數之間**沒有任何自動的關聯**。`status` 只是一個普通的 `int8`，填 42 也不會報錯。`STATUS_*` 只是寫給人看的「這個欄位應該填這些值」，名稱的前綴是慣例，ROS 不會檢查。

在程式裡，常數掛在 message 的 class 上：

- Python：`GoalStatus.STATUS_SUCCEEDED`
- C++：`action_msgs::msg::GoalStatus::STATUS_SUCCEEDED`

比較時要用常數，不要自己打數字或字串：`if status == GoalStatus.STATUS_SUCCEEDED:` 比 `if status == 4:` 好讀，也不會打錯。

### 自己寫一個有常數的 .msg

常數也可以是字串。下面的 `Station.msg` 描述地圖上的一個站點，`kind` 應該是三種 `KIND_*` 之一。

1. 建立一個專門放 message 的 package（只能是 ament_cmake），把檔案放在 `msg/` 底下

```bash
cd ~/tutorial_ws/src
ros2 pkg create --build-type ament_cmake my_interfaces
mkdir my_interfaces/msg
```

:::toggle my_interfaces/msg/Station.msg
@@code Station.msg
:::

:::toggle my_interfaces/CMakeLists.txt
@@code interfaces_cmake.txt
:::

:::toggle my_interfaces/package.xml
@@code interfaces_package.xml
:::

2. 編譯，然後確認看得到

```bash
cd ~/tutorial_ws
colcon build --packages-select my_interfaces
source install/setup.bash
ros2 interface show my_interfaces/msg/Station
```

3. 程式碼：用常數、看預設值、試試看 ROS 會不會檢查

:::toggle Python：msg_constants.py
@@code msg_constants.py
:::

:::toggle C++：msg_constants.cpp（依賴 rclcpp、my_interfaces）
@@code msg_constants.cpp
:::

C++ 要放在另一個 package（例如 `my_pkg`），建立時把 `my_interfaces` 加進 `--dependencies`。

4. 執行（先 `source ~/tutorial_ws/install/setup.bash`，否則找不到 `my_interfaces`）

```bash
python3 msg_constants.py
# C++：ros2 run my_pkg msg_constants
```

```bash
Station.KIND_CHARGER = 'charger'
my_interfaces.msg.Station(id='c1', kind='charger', x=1.0, y=2.0, slots=1)
c1 is a charger
kind = 'banana', no error
AttributeError: can't set attribute 'KIND_CHARGER'
```

C++ 的輸出：

```bash
Station::KIND_CHARGER = charger
slots = 1
c1 is a charger
kind = banana, no error
```

把 C++ 最後那行 `Station::KIND_CHARGER = "battery";` 的註解拿掉，`colcon build` 會失敗：常數不能改。

> 常數用數字還是字串？兩種都很常見。數字（例如 `uint8 KIND_PICKUP=1`）比較省空間；字串在 `ros2 topic echo` 裡一看就懂。不管用哪一種，**收到訊息的一方都要自己處理「值不在清單裡」的情況**。
