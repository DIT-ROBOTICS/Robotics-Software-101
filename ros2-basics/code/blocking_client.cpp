#include <chrono>
#include <memory>

#include "example_interfaces/srv/add_two_ints.hpp"
#include "rclcpp/rclcpp.hpp"

using namespace std::chrono_literals;
using AddTwoInts = example_interfaces::srv::AddTwoInts;

class BlockingClient : public rclcpp::Node
{
public:
  BlockingClient()
  : Node("blocking_client")
  {
    client_ = create_client<AddTwoInts>("add_two_ints");
    ask_timer_ = create_wall_timer(3s, [this]() {ask();});
    heartbeat_timer_ = create_wall_timer(500ms, [this]() {RCLCPP_INFO(get_logger(), "heartbeat");});
  }

private:
  void ask()
  {
    if (!client_->service_is_ready()) {
      return;
    }
    RCLCPP_INFO(get_logger(), "calling...");
    auto request = std::make_shared<AddTwoInts::Request>();
    request->a = 1;
    request->b = 2;
    auto future = client_->async_send_request(request);
    // 錯誤：在 callback 裡等回覆，但回覆也要由這個（單執行緒的）executor 處理 -> 永遠等不到
    future.wait();
    RCLCPP_INFO(get_logger(), "result: %ld", future.get()->sum);
  }

  rclcpp::Client<AddTwoInts>::SharedPtr client_;
  rclcpp::TimerBase::SharedPtr ask_timer_;
  rclcpp::TimerBase::SharedPtr heartbeat_timer_;
};

int main(int argc, char ** argv)
{
  rclcpp::init(argc, argv);
  rclcpp::spin(std::make_shared<BlockingClient>());
  rclcpp::shutdown();
  return 0;
}
