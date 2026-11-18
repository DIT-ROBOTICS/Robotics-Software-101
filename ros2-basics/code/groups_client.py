import time

import rclpy
from rclpy.callback_groups import MutuallyExclusiveCallbackGroup
from rclpy.executors import MultiThreadedExecutor
from rclpy.node import Node
from example_interfaces.srv import AddTwoInts


class GroupsClient(Node):
    def __init__(self):
        super().__init__('groups_client')
        timer_group = MutuallyExclusiveCallbackGroup()
        client_group = MutuallyExclusiveCallbackGroup()
        heartbeat_group = MutuallyExclusiveCallbackGroup()
        self.client = self.create_client(AddTwoInts, 'add_two_ints',
                                         callback_group=client_group)
        self.create_timer(3.0, self.ask, callback_group=timer_group)
        self.create_timer(0.5, self.heartbeat, callback_group=heartbeat_group)

    def ask(self):
        if not self.client.service_is_ready():
            return
        self.get_logger().info('calling...')
        future = self.client.call_async(AddTwoInts.Request(a=1, b=2))
        # 在 callback 裡等回覆，現在可以了：回覆由另一個執行緒（client_group）處理，
        # heartbeat 在第三個 group 照常執行。
        # 每 0.1 秒檢查一次 rclpy.ok()：按 Ctrl+C 後就不再等，程式才關得掉
        while rclpy.ok() and not future.done():
            time.sleep(0.1)
        if future.done():
            self.get_logger().info(f'result: {future.result().sum}')

    def heartbeat(self):
        self.get_logger().info('heartbeat')


def main():
    rclpy.init()
    node = GroupsClient()
    executor = MultiThreadedExecutor()
    executor.add_node(node)
    executor.spin()


if __name__ == '__main__':
    main()
