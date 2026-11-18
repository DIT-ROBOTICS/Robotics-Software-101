#include <memory>
#include <string>

#include "rclcpp/rclcpp.hpp"
#include "std_msgs/msg/string.hpp"

// 「Latched」：晚加入的 subscriber 也收得到最後一筆
rclcpp::QoS latched()
{
  return rclcpp::QoS(1).reliable().transient_local();
}

class MapPublisher : public rclcpp::Node
{
public:
  MapPublisher()
  : Node("map_publisher")
  {
    pub_ = create_publisher<std_msgs::msg::String>("map_name", latched());
    std_msgs::msg::String msg;
    msg.data = "warehouse";
    pub_->publish(msg);  // 只發一次
    RCLCPP_INFO(get_logger(), "published the map once");
  }

private:
  rclcpp::Publisher<std_msgs::msg::String>::SharedPtr pub_;
};

class MapListener : public rclcpp::Node
{
public:
  explicit MapListener(const rclcpp::QoS & qos)
  : Node("map_listener")
  {
    sub_ = create_subscription<std_msgs::msg::String>(
      "map_name", qos,
      [this](const std_msgs::msg::String & msg) {
        RCLCPP_INFO(get_logger(), "got map: %s", msg.data.c_str());
      });
  }

private:
  rclcpp::Subscription<std_msgs::msg::String>::SharedPtr sub_;
};

int main(int argc, char ** argv)
{
  rclcpp::init(argc, argv);
  std::string mode = argc > 1 ? argv[1] : "pub";
  rclcpp::Node::SharedPtr node;
  if (mode == "pub") {
    node = std::make_shared<MapPublisher>();
  } else if (mode == "sub_default") {
    node = std::make_shared<MapListener>(rclcpp::QoS(10));  // 預設：VOLATILE，收不到之前發的訊息
  } else {
    node = std::make_shared<MapListener>(latched());  // TRANSIENT_LOCAL，收得到之前發的訊息
  }
  rclcpp::spin(node);
  rclcpp::shutdown();
  return 0;
}
