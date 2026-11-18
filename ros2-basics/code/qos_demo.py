import sys

import rclpy
from rclpy.node import Node
from rclpy.qos import DurabilityPolicy, QoSProfile, ReliabilityPolicy
from std_msgs.msg import String

# 「Latched」：晚加入的 subscriber 也收得到最後一筆
LATCHED = QoSProfile(depth=1,
                     reliability=ReliabilityPolicy.RELIABLE,
                     durability=DurabilityPolicy.TRANSIENT_LOCAL)


class MapPublisher(Node):
    def __init__(self):
        super().__init__('map_publisher')
        self.pub = self.create_publisher(String, 'map_name', LATCHED)
        self.pub.publish(String(data='warehouse'))   # 只發一次
        self.get_logger().info('published the map once')


class MapListener(Node):
    def __init__(self, qos):
        super().__init__('map_listener')
        self.create_subscription(String, 'map_name', self.on_map, qos)

    def on_map(self, msg):
        self.get_logger().info(f'got map: {msg.data}')


def main():
    rclpy.init()
    mode = sys.argv[1]
    if mode == 'pub':
        node = MapPublisher()
    elif mode == 'sub_default':
        node = MapListener(10)        # 預設：VOLATILE，收不到之前發的訊息
    else:
        node = MapListener(LATCHED)   # TRANSIENT_LOCAL，收得到之前發的訊息
    rclpy.spin(node)


if __name__ == '__main__':
    main()
