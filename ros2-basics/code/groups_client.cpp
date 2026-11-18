#include <chrono>
#include <memory>

#include "example_interfaces/srv/add_two_ints.hpp"
#include "rclcpp/rclcpp.hpp"

using namespace std::chrono_literals;
using AddTwoInts = example_interfaces::srv::AddTwoInts;

class GroupsClient : public rclcpp::Node
{
public:
  GroupsClient()
  : Node("groups_client")
  {
    // group 要存成成員變數：node 只保留 weak_ptr，區域變數離開 constructor 就被釋放，
    // 裡面的 timer 和 client 就再也不會被執行
    timer_group_ = create_callback_group(rclcpp::CallbackGroupType::MutuallyExclusive);
    client_group_ = create_callback_group(rclcpp::CallbackGroupType::MutuallyExclusive);
    heartbeat_group_ = create_callback_group(rclcpp::CallbackGroupType::MutuallyExclusive);
    client_ = create_client<AddTwoInts>(
      "add_two_ints", rmw_qos_profile_services_default, client_group_);
    ask_timer_ = create_wall_timer(3s, [this]() {ask();}, timer_group_);
    heartbeat_timer_ = create_wall_timer(
      500ms, [this]() {RCLCPP_INFO(get_logger(), "heartbeat");}, heartbeat_group_);
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
    // 在 callback 裡等回覆，現在可以了：回覆由另一個執行緒（client_group）處理，
    // heartbeat 在第三個 group 照常執行。
    // 每 0.1 秒檢查一次 rclcpp::ok()：按 Ctrl+C 後就不再等，程式才關得掉
    while (rclcpp::ok() && future.wait_for(100ms) != std::future_status::ready) {
    }
    if (rclcpp::ok()) {
      RCLCPP_INFO(get_logger(), "result: %ld", future.get()->sum);
    }
  }

  rclcpp::CallbackGroup::SharedPtr timer_group_;
  rclcpp::CallbackGroup::SharedPtr client_group_;
  rclcpp::CallbackGroup::SharedPtr heartbeat_group_;
  rclcpp::Client<AddTwoInts>::SharedPtr client_;
  rclcpp::TimerBase::SharedPtr ask_timer_;
  rclcpp::TimerBase::SharedPtr heartbeat_timer_;
};

int main(int argc, char ** argv)
{
  rclcpp::init(argc, argv);
  auto node = std::make_shared<GroupsClient>();
  rclcpp::executors::MultiThreadedExecutor executor;
  executor.add_node(node);
  executor.spin();
  rclcpp::shutdown();
  return 0;
}
