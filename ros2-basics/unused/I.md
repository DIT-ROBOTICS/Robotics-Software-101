---
page: Parameter
where: 在「撰寫 YAML 檔」裡面，原本的 YAML 範例後面
title: 社團慣例：檔名與參數檔
gap: 9
---
社團專案（以及考試）用的慣例，教學裡建議統一：

| 項目 | 慣例 | 教學目前寫的 |
|---|---|---|
| launch 檔名 | `xxx_launch.py`（例如 `exam_launch.py`） | `launch.py`、`launch.xml` |
| 參數檔資料夾 | `params/` | `param/`、`config/` |
| YAML 第一層 | **node 名稱** | package 名稱 |

YAML 的第一層一定要是 node 的名字，否則參數**不會被載入，也不會報錯**：

```yaml
time_demo:              # node 名稱，不是 package 名稱
  ros__parameters:      # 縮排 2 格
    use_sim_time: true
```

驗證參數真的有載入：

```bash
ros2 param get /time_demo use_sim_time
```

記得把 `launch/` 和 `params/` 安裝到 share：

:::toggle Python package：setup.py 的 data_files
@@code install_setup.py
:::

:::toggle C++ package：CMakeLists.txt
@@code install_cmake.txt
:::
