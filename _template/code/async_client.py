# FIX 1: send the request and return at once; a done callback handles the reply.
import rclpy
from rclpy.node import Node
from example_interfaces.srv import AddTwoInts


class AsyncClient(Node):
    def __init__(self):
        super().__init__('async_client')
        self.client = self.create_client(AddTwoInts, 'add_two_ints')
        self.create_timer(3.0, self.ask)
        self.create_timer(0.5, self.heartbeat)

    def ask(self):
        if not self.client.service_is_ready():
            return
        self.get_logger().info('calling...')
        future = self.client.call_async(AddTwoInts.Request(a=1, b=2))   # returns at once
        future.add_done_callback(self.on_reply)                         # runs when the reply is in

    def on_reply(self, future):
        self.get_logger().info(f'result: {future.result().sum}')

    def heartbeat(self):
        self.get_logger().info('heartbeat')


def main():
    rclpy.init()
    rclpy.spin(AsyncClient())


if __name__ == '__main__':
    main()
