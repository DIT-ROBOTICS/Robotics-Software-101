#include <chrono>
#include <memory>

#include "rclcpp/rclcpp.hpp"

using namespace std::chrono_literals;

class TimeDemo : public rclcpp::Node
{
public:
  TimeDemo()
  : Node("time_demo")
  {
    // 用 node 的 clock 建 timer：use_sim_time 時跟著 /clock。
    // 注意 create_wall_timer 永遠是真實時間，不會跟著 sim time。
    timer_ = rclcpp::create_timer(this, get_clock(), 1s, [this]() {tick();});
  }

private:
  void tick()
  {
    double ros_now = now().seconds();
    double wall_now = std::chrono::duration<double>(
      std::chrono::system_clock::now().time_since_epoch()).count();
    RCLCPP_INFO(get_logger(), "ROS time %.1f s, wall time %.1f s", ros_now, wall_now);
  }

  rclcpp::TimerBase::SharedPtr timer_;
};

int main(int argc, char ** argv)
{
  rclcpp::init(argc, argv);
  rclcpp::spin(std::make_shared<TimeDemo>());
  rclcpp::shutdown();
  return 0;
}
