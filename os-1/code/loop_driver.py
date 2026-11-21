"""The same driver, written another common way: a plain loop instead of a timer and spin().

It works. But the bare `except:` meant to skip a garbled line also catches Ctrl+C
(KeyboardInterrupt), so the loop never ends. The launcher has to escalate to SIGKILL.
The fix: `except ValueError:` (catch only what you expect), or use a timer and spin().
"""
import rclpy
from std_msgs.msg import Int64

DEVICE = '/tmp/mcu'

rclpy.init()
node = rclpy.create_node('driver')
pub = node.create_publisher(Int64, 'wheel_ticks', 10)
dev = open(DEVICE, 'rb', buffering=0)
node.get_logger().info(f'reading {DEVICE}')

while True:
    try:
        word, n = dev.readline().decode().split()   # e.g. "ticks 42"
        pub.publish(Int64(data=int(n)))
    except:                                          # skip a garbled line ... and everything else
        pass
