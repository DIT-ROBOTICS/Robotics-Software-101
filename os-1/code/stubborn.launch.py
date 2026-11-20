"""Starts stubborn.py alone."""
import os

from launch import LaunchDescription
from launch.actions import ExecuteProcess

HERE = os.path.dirname(os.path.abspath(__file__))


def generate_launch_description():
    return LaunchDescription([
        ExecuteProcess(cmd=['python3', os.path.join(HERE, 'stubborn.py')], output='screen'),
    ])
