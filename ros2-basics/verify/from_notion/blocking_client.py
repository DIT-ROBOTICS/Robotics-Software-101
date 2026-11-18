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
        # 錯誤：在 callback 裡用 call() 等回覆，但回覆也要由這個（單執行緒的）
        # executor 處理 -> 永遠等不到
        result = self.client.call(AddTwoInts.Request(a=1, b=2))
        self.get_logger().info(f'result: {result.sum}')

    def heartbeat(self):
        self.get_logger().info('heartbeat')

def main():
    rclpy.init()
    rclpy.spin(BlockingClient())

if __name__ == '__main__':
    main()
