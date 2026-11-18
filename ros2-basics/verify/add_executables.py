"""Add add_executable / ament_target_dependencies / install for each .cpp, as the C++ note says."""
import glob
import os
import sys

DEPS = {'qos_demo': 'rclcpp std_msgs', 'read_bag': 'rclcpp std_msgs rosbag2_cpp',
        'sim_time_demo': 'rclcpp'}
path = sys.argv[1]
src = os.path.join(os.path.dirname(path), 'src')
lines = []
for f in sorted(glob.glob(src + '/*.cpp')):
    exe = os.path.splitext(os.path.basename(f))[0]
    lines += [f'add_executable({exe} src/{exe}.cpp)',
              f'ament_target_dependencies({exe} {DEPS.get(exe, "rclcpp example_interfaces")})',
              f'install(TARGETS {exe} DESTINATION lib/${{PROJECT_NAME}})', '']
text = open(path).read()
text = text.replace('ament_package()', '\n'.join(lines) + 'ament_package()')
open(path, 'w').write(text)
print('added', len(lines) // 4, 'executables')
