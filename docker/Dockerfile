# One container for every DIT software course: ROS 2 Humble, plus the tools the worksheets use.
# Build it once, from the top of the repo:   docker build -t dit-course docker/
# When this file changes (git pull shows it), build again: it only adds what is new.
FROM ros:humble-ros-base-jammy
RUN apt-get update && apt-get install -y --no-install-recommends \
      # tools the worksheets use
      tmux psmisc strace procps build-essential nano \
      # message and action types the ROS 2 examples use
      ros-humble-example-interfaces ros-humble-action-tutorials-interfaces \
    && rm -rf /var/lib/apt/lists/*
RUN echo 'source /opt/ros/humble/setup.bash' >> /root/.bashrc
WORKDIR /code
