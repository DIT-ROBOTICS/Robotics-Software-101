"""How long does one read from the SSD take?

Writes a 1 GiB file of random bytes, then reads 4 KiB at 2000 random places in it.
O_DIRECT tells the kernel not to use its copy in RAM, so every read really goes to the disk.
The file is written next to this script (on the disk, not in /tmp, which may be in RAM),
and deleted at the end.
"""
import mmap
import os
import random
import time

PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.ssd_latency.bin')
SIZE = 1024 * 1024 * 1024
BLOCK = 4096

with open(PATH, 'wb') as f:
    for _ in range(SIZE // (1024 * 1024)):
        f.write(os.urandom(1024 * 1024))
    f.flush()
    os.fsync(f.fileno())

try:
    fd = os.open(PATH, os.O_RDONLY | os.O_DIRECT)
    buf = mmap.mmap(-1, BLOCK)               # O_DIRECT needs an aligned buffer
    n = 2000
    t0 = time.perf_counter()
    for _ in range(n):
        os.preadv(fd, [buf], random.randrange(SIZE // BLOCK) * BLOCK)
    us = (time.perf_counter() - t0) / n * 1e6
    print(f'{us:.0f} us per 4 KiB read')
    os.close(fd)
finally:
    os.remove(PATH)
