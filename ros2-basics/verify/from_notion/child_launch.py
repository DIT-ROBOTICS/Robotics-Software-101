from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, LogInfo
from launch.substitutions import LaunchConfiguration

def generate_launch_description():
    return LaunchDescription([
        DeclareLaunchArgument('greeting', default_value='hello from the child default'),
        LogInfo(msg=['child got greeting: ', LaunchConfiguration('greeting')]),
    ])
