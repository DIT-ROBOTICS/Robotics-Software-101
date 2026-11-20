"""Reads wheel ticks from the device and publishes them on /wheel_ticks."""
import sys

import rclpy
from rclpy.node import Node
from std_msgs.msg import Int64

DEVICE = sys.argv[1] if len(sys.argv) > 1 else '/tmp/mcu'


class Driver(Node):
    def __init__(self):
        super().__init__('driver')
        self.pub = self.create_publisher(Int64, 'wheel_ticks', 10)
        self.dev = open(DEVICE, 'rb', buffering=0)   # a device is opened like any file
        self.get_logger().info(f'reading {DEVICE}')
        self.create_timer(0.1, self.read_once)

    def read_once(self):
        line = self.dev.readline().decode().split()
        if len(line) == 2 and line[0] == 'ticks':
            self.pub.publish(Int64(data=int(line[1])))


def main():
    rclpy.init()
    rclpy.spin(Driver())


if __name__ == '__main__':
    main()
