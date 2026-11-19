#include <iostream>

#include "my_interfaces/msg/station.hpp"

using Station = my_interfaces::msg::Station;

int main()
{
  // 1. 常數是 class 的 static 成員，不用建立訊息就能用
  std::cout << "Station::KIND_CHARGER = " << Station::KIND_CHARGER << std::endl;

  // 2. 欄位是每一筆訊息自己的資料；沒給的欄位用預設值
  Station s;
  s.id = "c1";
  s.kind = Station::KIND_CHARGER;
  s.x = 1.0;
  s.y = 2.0;
  std::cout << "slots = " << static_cast<int>(s.slots) << std::endl;

  // 3. 比較時用常數，不要自己打字串（打錯字不會有任何錯誤訊息）
  if (s.kind == Station::KIND_CHARGER) {
    std::cout << s.id << " is a charger" << std::endl;
  }

  // 4. ROS 不會檢查 kind 是不是其中一個 KIND_*
  s.kind = "banana";
  std::cout << "kind = " << s.kind << ", no error" << std::endl;

  // 5. 常數不能改：把下一行的註解拿掉，就會編譯失敗
  // Station::KIND_CHARGER = "battery";
  return 0;
}
