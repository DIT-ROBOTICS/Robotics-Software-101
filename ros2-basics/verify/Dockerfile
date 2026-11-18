# A clean ROS 2 Humble machine with the tutorial's examples set up the way the tutorial says.
# Code comes from verify/from_notion/, extracted from the live Notion pages.
FROM ros:humble-ros-base-jammy
RUN apt-get update && apt-get install -y --no-install-recommends \
      ros-humble-example-interfaces ros-humble-action-tutorials-interfaces nano \
    && rm -rf /var/lib/apt/lists/*
SHELL ["/bin/bash", "-c"]

# Python examples: run directly with python3 (the note at the top of each section)
COPY from_notion/*.py /root/tutorial/

# C++ examples: one ament_cmake package, created with its dependencies
RUN source /opt/ros/humble/setup.bash && mkdir -p /root/tutorial_ws/src && cd /root/tutorial_ws/src \
    && ros2 pkg create --build-type ament_cmake my_pkg \
         --dependencies rclcpp std_msgs example_interfaces rosbag2_cpp > /dev/null
COPY from_notion/*.cpp /root/tutorial_ws/src/my_pkg/src/
COPY add_executables.py /tmp/
RUN python3 /tmp/add_executables.py /root/tutorial_ws/src/my_pkg/CMakeLists.txt \
    && source /opt/ros/humble/setup.bash && cd /root/tutorial_ws && colcon build

RUN echo 'source /opt/ros/humble/setup.bash' >> /root/.bashrc \
 && echo 'source /root/tutorial_ws/install/setup.bash' >> /root/.bashrc \
 && echo 'cd /root/tutorial' >> /root/.bashrc
WORKDIR /root/tutorial
CMD ["sleep", "infinity"]
