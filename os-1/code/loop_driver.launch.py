"""Like robot.launch.py, but with loop_driver.py as the driver."""
import os

from launch import LaunchDescription
from launch.actions import ExecuteProcess, TimerAction

HERE = os.path.dirname(os.path.abspath(__file__))


def py(script):
    return ExecuteProcess(cmd=['python3', os.path.join(HERE, script)], output='screen')


def generate_launch_description():
    return LaunchDescription([
        py('fake_mcu.py'),
        TimerAction(period=1.0, actions=[py('loop_driver.py')]),
    ])
