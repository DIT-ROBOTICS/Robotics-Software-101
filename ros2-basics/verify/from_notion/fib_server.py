import time

import rclpy
from rclpy.action import ActionServer, CancelResponse
from rclpy.executors import MultiThreadedExecutor
from rclpy.node import Node
from action_tutorials_interfaces.action import Fibonacci

class FibonacciServer(Node):
    def __init__(self):
        super().__init__('fibonacci_action_server')
        ActionServer(self, Fibonacci, 'fibonacci', self.execute,
                     cancel_callback=lambda goal: CancelResponse.ACCEPT)

    def execute(self, goal_handle):
        seq = [0, 1]
        for i in range(1, goal_handle.request.order):
            if goal_handle.is_cancel_requested:
                goal_handle.canceled()
                return Fibonacci.Result(sequence=seq)
            seq.append(seq[i] + seq[i - 1])
            goal_handle.publish_feedback(Fibonacci.Feedback(partial_sequence=seq))
            time.sleep(0.5)
        goal_handle.succeed()
        return Fibonacci.Result(sequence=seq)

def main():
    rclpy.init()
    executor = MultiThreadedExecutor()
    executor.add_node(FibonacciServer())
    executor.spin()

if __name__ == '__main__':
    main()
