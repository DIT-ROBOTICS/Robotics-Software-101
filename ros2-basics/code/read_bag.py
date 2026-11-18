import sys

from rclpy.serialization import deserialize_message
from rosidl_runtime_py.utilities import get_message
import rosbag2_py


def main():
    reader = rosbag2_py.SequentialReader()
    reader.open(rosbag2_py.StorageOptions(uri=sys.argv[1], storage_id='sqlite3'),
                rosbag2_py.ConverterOptions('cdr', 'cdr'))
    types = {t.name: t.type for t in reader.get_all_topics_and_types()}
    count = {}
    while reader.has_next():
        topic, data, stamp_ns = reader.read_next()
        msg = deserialize_message(data, get_message(types[topic]))
        count[topic] = count.get(topic, 0) + 1
        if count[topic] == 1:
            print(f'first message on {topic} at {stamp_ns / 1e9:.2f} s: {msg}')
    print(count)


if __name__ == '__main__':
    main()
