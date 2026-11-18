import time

import rclpy
from rclpy.node import Node
from example_interfaces.srv import AddTwoInts


class SlowServer(Node):
    def __init__(self):
        super().__init__('slow_server')
        self.create_service(AddTwoInts, 'add_two_ints', self.add)

    def add(self, request, response):
        time.sleep(2.0)   # 假裝這個工作要花一點時間
        response.sum = request.a + request.b
        return response


def main():
    rclpy.init()
    rclpy.spin(SlowServer())


if __name__ == '__main__':
    main()
