#include <chrono>
#include <memory>

#include "example_interfaces/srv/add_two_ints.hpp"
#include "rclcpp/rclcpp.hpp"

using namespace std::chrono_literals;
using AddTwoInts = example_interfaces::srv::AddTwoInts;

class AsyncClient : public rclcpp::Node
{
public:
  AsyncClient()
  : Node("async_client")
  {
    client_ = create_client<AddTwoInts>("add_two_ints");
    ask_timer_ = create_wall_timer(3s, [this]() {ask();});  // 每 3 秒送一次 request
    // 用來證明 node 沒有卡住
    heartbeat_timer_ = create_wall_timer(500ms, [this]() {RCLCPP_INFO(get_logger(), "heartbeat");});
  }

private:
  void ask()
  {
    if (!client_->service_is_ready()) {
      RCLCPP_WARN(get_logger(), "service not ready yet");
      return;
    }
    auto request = std::make_shared<AddTwoInts::Request>();
    request->a = ++count_;
    request->b = 10;
    // 馬上 return，不會等；回覆到了才會呼叫這個 lambda
    client_->async_send_request(
      request,
      [this](rclcpp::Client<AddTwoInts>::SharedFuture future) {
        RCLCPP_INFO(get_logger(), "result: %ld", future.get()->sum);
      });
    RCLCPP_INFO(get_logger(), "sent %ld + %ld", request->a, request->b);
  }

  rclcpp::Client<AddTwoInts>::SharedPtr client_;
  rclcpp::TimerBase::SharedPtr ask_timer_;
  rclcpp::TimerBase::SharedPtr heartbeat_timer_;
  int64_t count_ = 0;
};

int main(int argc, char ** argv)
{
  rclcpp::init(argc, argv);
  rclcpp::spin(std::make_shared<AsyncClient>());
  rclcpp::shutdown();
  return 0;
}
