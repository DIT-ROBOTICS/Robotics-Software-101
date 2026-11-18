#include <iomanip>
#include <iostream>
#include <map>
#include <string>

#include "rclcpp/serialization.hpp"
#include "rclcpp/serialized_message.hpp"
#include "rosbag2_cpp/reader.hpp"
#include "std_msgs/msg/string.hpp"

int main(int argc, char ** argv)
{
  if (argc < 2) {
    std::cerr << "usage: read_bag <bag folder>" << std::endl;
    return 1;
  }
  rosbag2_cpp::Reader reader;
  reader.open(argv[1]);
  // C++ 要先知道訊息型態才能 deserialize：這裡只解開 /chatter（std_msgs/String）
  rclcpp::Serialization<std_msgs::msg::String> serialization;
  std::map<std::string, int> count;
  while (reader.has_next()) {
    auto bag_msg = reader.read_next();
    int n = ++count[bag_msg->topic_name];
    if (bag_msg->topic_name == "/chatter" && n == 1) {
      rclcpp::SerializedMessage serialized(*bag_msg->serialized_data);
      std_msgs::msg::String msg;
      serialization.deserialize_message(&serialized, &msg);
      std::cout << std::fixed << std::setprecision(2)
                << "first message on /chatter at " << bag_msg->time_stamp / 1e9 << " s: "
                << msg.data << std::endl;
    }
  }
  for (const auto & [topic, n] : count) {
    std::cout << topic << ": " << n << std::endl;
  }
  return 0;
}
