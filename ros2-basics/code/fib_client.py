import sys

import rclpy
from rclpy.action import ActionClient
from rclpy.node import Node
from action_tutorials_interfaces.action import Fibonacci


class FibonacciClient(Node):
    def __init__(self, cancel_after):
        super().__init__('fibonacci_action_client')
        self.client = ActionClient(self, Fibonacci, 'fibonacci')
        self.cancel_after = cancel_after   # 幾秒後取消；None 表示讓它跑完
        self.goal_handle = None

    def send_goal(self, order):
        self.client.wait_for_server()      # 可以等：這時還沒開始 spin
        goal = Fibonacci.Goal(order=order)
        future = self.client.send_goal_async(goal, feedback_callback=self.on_feedback)
        future.add_done_callback(self.on_goal_response)

    def on_goal_response(self, future):
        self.goal_handle = future.result()
        if not self.goal_handle.accepted:
            self.get_logger().warn('goal rejected')
            return
        self.get_logger().info('goal accepted')
        self.goal_handle.get_result_async().add_done_callback(self.on_result)
        if self.cancel_after is not None:
            self.cancel_timer = self.create_timer(self.cancel_after, self.cancel)

    def on_feedback(self, feedback_msg):
        self.get_logger().info(f'feedback: {list(feedback_msg.feedback.partial_sequence)}')

    def cancel(self):
        self.cancel_timer.cancel()          # 只執行一次
        self.get_logger().info('canceling')
        self.goal_handle.cancel_goal_async()

    def on_result(self, future):
        status = future.result().status     # 4 = SUCCEEDED, 5 = CANCELED, 6 = ABORTED
        result = future.result().result
        self.get_logger().info(f'status {status}, result: {list(result.sequence)}')


def main():
    rclpy.init()
    cancel_after = float(sys.argv[1]) if len(sys.argv) > 1 else None
    node = FibonacciClient(cancel_after)
    node.send_goal(10)
    rclpy.spin(node)


if __name__ == '__main__':
    main()
