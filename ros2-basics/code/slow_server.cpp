#include <chrono>
#include <memory>
#include <thread>

#include "example_interfaces/srv/add_two_ints.hpp"
#include "rclcpp/rclcpp.hpp"

using namespace std::chrono_literals;
using AddTwoInts = example_interfaces::srv::AddTwoInts;

class SlowServer : public rclcpp::Node
{
public:
  SlowServer()
  : Node("slow_server")
  {
    service_ = create_service<AddTwoInts>(
      "add_two_ints",
      [](const std::shared_ptr<AddTwoInts::Request> request,
      std::shared_ptr<AddTwoInts::Response> response) {
        std::this_thread::sleep_for(2s);  // 假裝這個工作要花一點時間
        response->sum = request->a + request->b;
      });
  }

private:
  rclcpp::Service<AddTwoInts>::SharedPtr service_;
};

int main(int argc, char ** argv)
{
  rclcpp::init(argc, argv);
  rclcpp::spin(std::make_shared<SlowServer>());
  rclcpp::shutdown();
  return 0;
}
