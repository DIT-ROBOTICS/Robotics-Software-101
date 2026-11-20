// tiny_shell.c: what a shell does with one command, in three steps: fork, exec, wait.
// Build and run:  gcc -o tiny_shell tiny_shell.c && ./tiny_shell
#include <stdio.h>
#include <sys/wait.h>
#include <unistd.h>

int main(void) {
    printf("parent: I am PID %d\n", getpid());

    pid_t child = fork();          // 1. fork: the kernel makes a copy of this process
                                   //    From here on, two processes run this same code.
    if (child == 0) {
        // fork() returned 0: we are the copy.
        printf("child:  I am PID %d, my parent is PID %d\n",
               getpid(), getppid());
        // 2. exec: replace this process's program with another one (here: ps).
        //    Same process, same PID; the code above is gone.
        execlp("ps", "ps", "-o", "pid,ppid,cmd", NULL);
        perror("exec failed");     // only runs if exec failed
        return 1;
    }

    // fork() returned the child's PID: we are the parent.
    waitpid(child, NULL, 0);       // 3. wait: sleep until the child has ended
    printf("parent: child %d has ended, back to me\n", child);
    return 0;
}
