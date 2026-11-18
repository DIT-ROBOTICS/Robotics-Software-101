import rclpy
from rclpy.node import Node
from example_interfaces.srv import AddTwoInts

class AsyncClient(Node):
    def __init__(self):
        super().__init__('async_client')
        self.client = self.create_client(AddTwoInts, 'add_two_ints')
        self.count = 0
        self.create_timer(3.0, self.ask)          # 每 3 秒送一次 request
        self.create_timer(0.5, self.heartbeat)    # 用來證明 node 沒有卡住

    def ask(self):
        if not self.client.service_is_ready():
            self.get_logger().warn('service not ready yet')
            return
        self.count += 1
        request = AddTwoInts.Request(a=self.count, b=10)
        future = self.client.call_async(request)  # 馬上 return，不會等
        future.add_done_callback(self.on_response)  # 回覆到了才會呼叫
        self.get_logger().info(f'sent {request.a} + {request.b}')

    def on_response(self, future):
        self.get_logger().info(f'result: {future.result().sum}')

    def heartbeat(self):
        self.get_logger().info('heartbeat')

def main():
    rclpy.init()
    rclpy.spin(AsyncClient())

if __name__ == '__main__':
    main()
