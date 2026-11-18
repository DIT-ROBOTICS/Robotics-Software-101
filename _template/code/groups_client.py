# FIX 2: keep waiting inside the callback, but give the executor more threads,
# and put the reply in a different callback group so another thread can handle it.
import time

import rclpy
from rclpy.callback_groups import MutuallyExclusiveCallbackGroup
from rclpy.executors import MultiThreadedExecutor
from rclpy.node import Node
from example_interfaces.srv import AddTwoInts


class GroupsClient(Node):
    def __init__(self):
        super().__init__('groups_client')
        self.client = self.create_client(AddTwoInts, 'add_two_ints',
                                         callback_group=MutuallyExclusiveCallbackGroup())
        self.create_timer(3.0, self.ask, callback_group=MutuallyExclusiveCallbackGroup())
        self.create_timer(0.5, self.heartbeat, callback_group=MutuallyExclusiveCallbackGroup())

    def ask(self):
        if not self.client.service_is_ready():
            return
        self.get_logger().info('calling...')
        future = self.client.call_async(AddTwoInts.Request(a=1, b=2))
        while rclpy.ok() and not future.done():   # wait here; rclpy.ok() lets Ctrl+C end it
            time.sleep(0.1)
        if future.done():
            self.get_logger().info(f'result: {future.result().sum}')

    def heartbeat(self):
        self.get_logger().info('heartbeat')


def main():
    rclpy.init()
    executor = MultiThreadedExecutor()
    executor.add_node(GroupsClient())
    executor.spin()


if __name__ == '__main__':
    main()
