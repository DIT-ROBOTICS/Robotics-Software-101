// How long does one memory read take? It depends on where the data is: cache or RAM.
// We follow a chain of pointers through an array laid out in random order, so every read
// depends on the one before and the CPU can't guess ahead. Small arrays fit in the cache;
// big ones only fit in RAM.
// Build and run:  g++ -O2 -o memory_latency memory_latency.cpp && ./memory_latency
#include <algorithm>
#include <chrono>
#include <cstdio>
#include <numeric>
#include <random>
#include <vector>

volatile size_t sink;  // we store the result here so the compiler can't skip the loop

int main() {
  std::mt19937 rng(42);
  for (size_t kib : {16, 128, 1024, 4096, 65536, 524288}) {
    size_t n = kib * 1024 / sizeof(size_t);
    std::vector<size_t> order(n), next(n);
    std::iota(order.begin(), order.end(), 0);
    std::shuffle(order.begin(), order.end(), rng);
    for (size_t i = 0; i < n; i++) next[order[i]] = order[(i + 1) % n];  // one big random loop

    const size_t steps = 20'000'000;
    size_t p = 0;
    auto t0 = std::chrono::steady_clock::now();
    for (size_t i = 0; i < steps; i++) p = next[p];
    auto t1 = std::chrono::steady_clock::now();
    double ns = std::chrono::duration<double, std::nano>(t1 - t0).count() / steps;
    sink = p;
    std::printf("%8zu KiB  %6.1f ns per read\n", kib, ns);
  }
}
