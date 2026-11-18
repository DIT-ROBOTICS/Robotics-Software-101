import time

import rclpy
from rclpy.node import Node

class TimeDemo(Node):
    def __init__(self):
        super().__init__('time_demo')
        self.create_timer(1.0, self.tick)   # 1 秒的 ROS time；use_sim_time 時是 sim time

    def tick(self):
        ros_now = self.get_clock().now().nanoseconds / 1e9
        self.get_logger().info(f'ROS time {ros_now:.1f} s, wall time {time.time():.1f} s')

def main():
    rclpy.init()
    rclpy.spin(TimeDemo())

if __name__ == '__main__':
    main()
