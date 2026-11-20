"""Plays the microcontroller: a fake serial device that sends wheel ticks.

It opens a pseudo-terminal (the same kind of device a USB serial adapter gives you),
gives it a friendly name with a symlink, and writes one line every 0.1 s.
Not a ROS node: just a plain program.
"""
import os
import pty
import sys
import time

LINK = sys.argv[1] if len(sys.argv) > 1 else '/tmp/mcu'

controller, device = pty.openpty()          # controller: our end; device: the "serial port"
path = os.ttyname(device)                   # e.g. /dev/pts/3
if os.path.lexists(LINK):
    os.remove(LINK)
os.symlink(path, LINK)                      # /tmp/mcu -> /dev/pts/3, like a udev rule would
print(f'fake_mcu: {LINK} -> {path}', flush=True)

ticks = 0
while True:
    ticks += 7
    os.write(controller, f'ticks {ticks}\n'.encode())
    time.sleep(0.1)
