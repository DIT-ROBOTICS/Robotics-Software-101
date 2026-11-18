# WRONG: waits for a service reply inside a callback, on a single-threaded executor.
import rclpy
from rclpy.node import Node
from example_interfaces.srv import AddTwoInts


class BlockingClient(Node):
    def __init__(self):
        super().__init__('blocking_client')
        self.client = self.create_client(AddTwoInts, 'add_two_ints')
        self.create_timer(3.0, self.ask)
        self.create_timer(0.5, self.heartbeat)

    def ask(self):
        if not self.client.service_is_ready():
            return
        self.get_logger().info('calling...')
        result = self.client.call(AddTwoInts.Request(a=1, b=2))   # blocks this thread
        self.get_logger().info(f'result: {result.sum}')

    def heartbeat(self):
        self.get_logger().info('heartbeat')


def main():
    rclpy.init()
    rclpy.spin(BlockingClient())


if __name__ == '__main__':
    main()
