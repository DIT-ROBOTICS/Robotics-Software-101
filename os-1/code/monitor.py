"""Listens to /wheel_ticks and logs the latest value once a second."""
import rclpy
from rclpy.node import Node
from std_msgs.msg import Int64


class Monitor(Node):
    def __init__(self):
        super().__init__('monitor')
        self.latest = None
        self.create_subscription(Int64, 'wheel_ticks', self.on_ticks, 10)
        self.create_timer(1.0, self.report)

    def on_ticks(self, msg):
        self.latest = msg.data

    def report(self):
        self.get_logger().info(f'ticks = {self.latest}')


def main():
    rclpy.init()
    rclpy.spin(Monitor())


if __name__ == '__main__':
    main()
