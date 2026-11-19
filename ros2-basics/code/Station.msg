# 常數：有「=」。它不會隨訊息送出，只是程式裡可以用的固定值
string KIND_PICKUP=pickup
string KIND_DROPOFF=dropoff
string KIND_CHARGER=charger

# 欄位：沒有「=」。每一筆訊息都會帶這些資料
string id
string kind      # 應該是上面其中一個 KIND_*（ROS 不會幫你檢查）
float64 x
float64 y

# 欄位也可以有預設值：型態、名稱、預設值，中間沒有「=」
uint8 slots 1
