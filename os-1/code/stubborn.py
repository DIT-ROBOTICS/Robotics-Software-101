"""A node that ignores Ctrl+C (SIGINT), to see what the launcher does next."""
import signal
import time

import rclpy

rclpy.init()
node = rclpy.create_node('stubborn')
signal.signal(signal.SIGINT, signal.SIG_IGN)     # pretend we never hear Ctrl+C
node.get_logger().info('ignoring SIGINT')
while True:
    time.sleep(1)
