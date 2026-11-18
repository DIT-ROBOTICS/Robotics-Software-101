import os

from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration


def generate_launch_description():
    child = os.path.join(os.path.dirname(__file__), 'child_launch.py')
    return LaunchDescription([
        DeclareLaunchArgument('greeting', default_value='hello from the parent default'),
        IncludeLaunchDescription(
            PythonLaunchDescriptionSource(child),
            launch_arguments={'greeting': LaunchConfiguration('greeting')}.items()),
    ])
