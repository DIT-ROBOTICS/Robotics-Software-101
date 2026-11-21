// heartbeat.c: a tiny daemon. It writes one line a second to /tmp/heartbeat.log, forever.
// Build and run:  gcc -o heartbeat heartbeat.c && ./heartbeat
// Stop it:        kill <its PID>   (find it with: ps -e -o pid,ppid,tty,cmd | grep heartbeat)
#include <stdio.h>
#include <unistd.h>

int main(void) {
    // 1. Fork, and the parent exits: your prompt comes back at once,
    //    and the child carries on in the background.
    if (fork() != 0) return 0;

    // 2. Cut the child's tie to the terminal: Ctrl+C and a hang-up can't reach it any more.
    setsid();

    // The daemon's work: one line a second.
    FILE *log = fopen("/tmp/heartbeat.log", "a");
    for (int i = 1; ; i++) {
        fprintf(log, "beat %d\n", i);
        fflush(log);
        sleep(1);
    }
}
