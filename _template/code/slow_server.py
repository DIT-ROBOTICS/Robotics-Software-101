# A service that takes 2 seconds to add two numbers, and says so in its log.
import time

import rclpy
from rclpy.node import Node
from example_interfaces.srv import AddTwoInts


class SlowServer(Node):
    def __init__(self):
        super().__init__('slow_server')
        self.create_service(AddTwoInts, 'add_two_ints', self.add)

    def add(self, request, response):
        self.get_logger().info(f'got {request.a} + {request.b}, working...')
        time.sleep(2.0)                       # pretend the work takes a while
        response.sum = request.a + request.b
        self.get_logger().info(f'replied {response.sum}')
        return response


def main():
    rclpy.init()
    rclpy.spin(SlowServer())


if __name__ == '__main__':
    main()
