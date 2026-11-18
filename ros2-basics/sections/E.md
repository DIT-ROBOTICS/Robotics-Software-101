---
page: Launch
where: 在「3. Launch Arguments」之後、「4. YAML」之前（後面的編號要順延）
title: Include 其他 launch 檔並傳遞參數
gap: 5
---
在「為什麼需要 Launch」有提到：可以用 launch 檔去開別人的 launch 檔（例如 LiDAR 的 launch）。這節示範怎麼做，以及怎麼把自己的 launch argument **傳下去**。

> launch 檔用 Python（或 XML）寫，C++ 和 Python 的 package 都一樣，所以這節沒有 C++ 版本。

1. 被 include 的 `child_launch.py`：宣告一個 argument `greeting`

:::toggle Python：child_launch.py
@@code child_launch.py
:::

2. 外層的 `parent_launch.py`：include child，並把自己的 `greeting` 傳下去（`launch_arguments`）

:::toggle Python：parent_launch.py
@@code parent_launch.py
:::

> 放在 package 裡時，路徑改用 `get_package_share_directory`：
> `os.path.join(get_package_share_directory('其他package'), 'launch', 'child_launch.py')`

3. 跑跑看

```bash
ros2 launch ./parent_launch.py
```

```bash
[INFO] [launch.user]: child got greeting: hello from the parent default
```

```bash
ros2 launch ./parent_launch.py greeting:=hi
```

```bash
[INFO] [launch.user]: child got greeting: hi
```

4. 查看一個 launch 檔有哪些 argument

```bash
ros2 launch ./parent_launch.py --show-args
```

```bash
Arguments (pass arguments as '<name>:=<value>'):
    'greeting':
        no description given
        (default: 'hello from the parent default')
```
