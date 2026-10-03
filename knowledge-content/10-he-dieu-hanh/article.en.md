# Operating Systems

## 1. What is an Operating System?

An **operating system (OS)** is the foundational software that manages all hardware resources and provides the environment for running other software.

Without an OS → software cannot run.

**Analogy:** think of an **apartment building**. The building has shared resources — electricity, water, lifts, storage rooms. The residents (your apps) each want to use them. If everyone grabbed whatever they liked, there would be chaos: two people fighting over one lift, someone walking into someone else's flat. So the building has a **manager**. The manager hands out keys, decides who uses the lift when, keeps the meter readings, and stops residents from entering each other's flats. The OS is that manager for your computer: the "shared resources" are the CPU, RAM, disk, screen, keyboard and network.

In practice, the OS does three big jobs:

1. **Shares out hardware** — decides which app gets the CPU, how much RAM each app gets, who may use the printer.
2. **Hides hardware details** — an app just says "save this file" or "draw this window"; the OS works out how to do that on *your* specific disk and graphics card. That is why the same version of Chrome runs on thousands of different laptop models.
3. **Protects** — keeps apps from damaging each other, and keeps users from seeing each other's files.

### What happens when you press the power button

Starting a computer is called **booting**. Step by step:

1. **Firmware wakes up.** A small program stored on a chip on the motherboard (called **BIOS** or, on modern PCs, **UEFI**) checks that the basic hardware works.
2. **The bootloader runs.** The firmware finds a tiny program on the disk whose only job is to load the OS.
3. **The kernel loads.** The core of the OS (the **kernel**, see Section 6) is copied into RAM and takes control of the hardware.
4. **Drivers and services start.** The OS loads drivers for the screen, Wi-Fi, keyboard, and starts background programs (**services**), such as the network and the antivirus.
5. **Login screen.** You type your password; the OS opens your desktop with your own files and settings.

From this moment, everything you do goes through the OS.

---

## 2. Common Operating Systems

| OS | Developer | Popular on |
|----|---------------|-----------|
| Windows 11/10 | Microsoft | Personal and enterprise PCs |
| macOS | Apple | MacBook, iMac |
| Linux (Ubuntu, CentOS) | Open-source community | Servers, developers |
| Android | Google | Android phones |
| iOS | Apple | iPhone, iPad |
| Windows Server | Microsoft | Enterprise servers |

A few notes a beginner will find useful:

- **Windows** is what most office laptops run. Companies like it because it works with almost every printer, accounting tool and business app, and IT departments can manage thousands of machines centrally.
- **macOS** only runs on Apple computers. It is popular with designers and many developers.
- **Linux** is not one product but a family. The core (the Linux kernel) is free and **open source** — its code is public and anyone may use and change it. Different groups package it with extra tools into a **distribution** ("distro"): Ubuntu, Debian, Red Hat Enterprise Linux, Rocky Linux (a successor to CentOS, which has been discontinued), and others. Most web servers and cloud machines on the Internet run Linux, because it is free, stable, secure, fast and highly customizable.
- **Android** is built on the Linux kernel, with Google's apps and interface on top.
- **iOS / iPadOS** run on iPhone and iPad; they share their foundation with macOS.
- **Windows Server** is the server edition of Windows, used where a company relies on Microsoft products (for example, company logins with Active Directory).

> **Common misconception:** "Linux is only for hackers." You use Linux every day without noticing: most websites you visit are served by Linux machines, and if you have an Android phone, it runs on the Linux kernel.

> **Try it yourself:** find out exactly which OS and version you have.
> - **Windows:** press `Windows key + R`, type `winver`, press Enter. A small window shows something like "Windows 11, Version 23H2".
> - **macOS:** click the Apple menu → **About This Mac**. You will see the macOS name and version, for example "macOS Sonoma 14.5".

---

## 3. Functions of an OS

### Process Management

A process is a running program. The OS allocates CPU time to each process:
- **Multi-tasking**: running many processes at once (Chrome, Word, Spotify simultaneously).
- **Scheduling**: the CPU switches quickly between processes, creating the feeling of parallel execution.
- **Process isolation**: one process cannot interfere with the memory of another.

**Analogy:** a chess master playing 30 opponents at once, making one move at each board in turn. Each opponent feels they have her attention. A CPU core does the same with processes, but switches thousands of times per second. With several cores, several "chess masters" work truly in parallel. The part of the OS that decides who goes next is the **scheduler**; if one program hangs, it keeps serving the others, so you can still open Task Manager.

### Memory Management
- Allocates RAM to each process as needed.
- Reclaims RAM when a process ends.
- **Virtual Memory**: uses the disk as virtual RAM when real RAM is full.

**Analogy:** RAM is a desk, the disk is a filing cabinet. When the desk is full, the OS moves papers you have not touched for a while into the cabinet (the **page file** on Windows, **swap** on macOS/Linux) and fetches them back when needed. The cabinet is much slower — so a computer short on RAM becomes sluggish rather than crashing.

### File System Management

The OS organizes data on disk in a directory structure (folders/directories):

```text
Windows:              Unix/Linux/macOS:
C:\                   /
├── Windows\          ├── home/
├── Program Files\    │   └── user/
└── Users\            ├── etc/
    └── Harry\        ├── var/
        └── Desktop\  └── usr/
```

- On **Windows**, each drive is its own root: `C:\`, `D:\`. A file's full address (its **path**) looks like `C:\Users\Harry\Desktop\report.docx`, with backslashes.
- On **Linux and macOS** there is a single tree that starts at `/` (the **root directory**), and paths use forward slashes: `/home/harry/report.docx` (Linux) or `/Users/harry/report.docx` (macOS). Extra disks appear as folders inside that tree.

> **Common misconception:** "`Report.pdf` and `report.pdf` are the same file." On Windows (and by default on macOS) yes, because their file systems are **case-insensitive**. On Linux they are two different files, because Linux is **case-sensitive**. This is a classic reason why an app works on a developer's Windows laptop but breaks on a Linux server: the code asks for `Logo.png`, the file is called `logo.png`, and the server says "file not found".

### Device Management

The OS uses **drivers** to communicate with hardware: graphics cards, keyboards, printers, etc.

A **driver** is a translator: it turns the OS's generic "print this page" into one printer model's exact commands. A buggy graphics driver is a classic cause of a flickering screen.

### Security

- Manages user accounts and access permissions.
- Isolates applications from one another.
- Built-in firewall.

In plain words: each person logs in with their own **user account**; files have **permissions** (who may read, change, or run them); and installing software or changing system settings needs **administrator** ("admin") rights — which ordinary staff often lack on company laptops. A **firewall** is a gatekeeper that blocks unwanted network connections.

> **Try it yourself:** watch the OS juggle processes and memory.
> - **Windows:** press `Ctrl + Shift + Esc` to open **Task Manager**. The **Processes** tab lists every running process with its CPU and Memory use. Open a few browser tabs and watch Memory rise.
> - **macOS:** press `Cmd + Space`, type **Activity Monitor**, press Enter. The **CPU** and **Memory** tabs show the same information.

---

## 4. CLI vs GUI

There are two ways to give an OS instructions. **Analogy:** in a restaurant, you can point at pictures on the menu (easy, but only what is pictured), or you can tell the chef exactly what you want in words (faster and more precise once you know how to ask).

### GUI (Graphical User Interface)

A graphical interface — click, drag, drop. Easy to use, intuitive.
- Example: Windows Explorer, Finder on macOS.

### CLI (Command Line Interface)

A command-line interface — you type commands as text.

The program where you type commands is called a **terminal** (or **shell**). On Windows it is **Terminal**, **Command Prompt** or **PowerShell**; on macOS it is **Terminal**. You type a command, press Enter, and the result appears as text.

```bash
ls -la          # list files (Linux/macOS)
dir             # list files (Windows)
cd /home/user   # move into a directory
mkdir project   # create a new directory
rm -rf folder/  # delete a directory (be careful!)
```

`cd` means *change directory* (`cd ..` goes up one level), `mkdir` means *make directory* (it creates the folder in your current location), and `rm -rf` deletes a folder and everything in it **without asking and without a Recycle Bin**.

**Why is the CLI important?**
- Servers often have no GUI (to save resources).
- Automation via scripts.
- Faster than a GUI for many technical tasks.

A **script** is a text file containing a list of commands, run in one go. An operations engineer who needs to update 300 servers does not click through 300 screens; they write the commands once and run them remotely on every machine, exactly the same way each time.

> **Try it yourself:** your first safe commands (none of these change anything).
> - **macOS:** open **Terminal** (`Cmd + Space`, type "Terminal"). Type `pwd` and press Enter — it prints the folder you are in, e.g. `/Users/harry`. Type `ls` to see its contents, then `whoami` to see your user name.
> - **Windows:** press the Windows key, type **cmd**, press Enter. Type `cd` and press Enter — it prints your current folder, e.g. `C:\Users\Harry`. Type `dir` to list its contents, then `whoami` to see your computer and user name.

---

## 5. Process and Thread

- **Process**: a running program with its own memory.
- **Thread**: a smaller unit of execution within a process.

**Analogy:** a process is a **restaurant** with its own kitchen, fridge and staff; nobody from the restaurant next door may walk in. Threads are the **cooks inside one restaurant**: they work at the same time and share the same kitchen and fridge (the process's memory). Sharing makes teamwork fast — one cook can use the sauce another just made — but it also means two cooks can grab the same pan at once, which is the source of many tricky bugs.

| | Process | Thread |
|---|---|---|
| What it is | A running program | A worker inside a process |
| Memory | Its own, isolated | Shared with other threads of the same process |
| If it crashes | Other processes usually survive | Can bring down the whole process |
| Example | Word, Chrome, Spotify | In Word: one thread handles typing, another checks spelling |

A **program** is the file on disk (`chrome.exe`, `Spotify.app`); a **process** is that program *while running*. Open Notepad twice and you get one program but two processes.

Example — Chrome: one Chrome process, but each tab is a thread (or a separate child process for isolation). Modern Chrome mostly uses the second option: it gives tabs their own **child processes**, so one broken page shows "Aw, Snap!" while the other tabs keep working. You can see this in Chrome's own task manager (`Shift + Esc` on Windows, or menu → More tools → Task manager).

> **Real-life example:** a tester writes in a bug ticket: *"When I export a large report, the whole app freezes for 30 seconds."* The developer replies: *"The export runs on the main (UI) thread — we will move it to a background thread."* The main thread is the one that redraws the screen; if it is busy, the window cannot respond, and Windows labels it "Not Responding".

---

## 6. Kernel

The **kernel** is the core of the OS — the part that runs with the highest privilege and interacts directly with the hardware:
- User apps don't call hardware directly → they call through the kernel (system call).
- The kernel manages memory, CPU, and I/O at the lowest level.

**I/O** means Input/Output: reading from and writing to disks, the network, the keyboard and the screen.

**Analogy:** a **bank**. Customers (apps) never walk into the vault themselves. They go to the counter and fill in a form: "withdraw 1 million". A teller with vault access (the kernel) checks the request and does it for them. The counter form is the **system call**.

```text
 ┌───────────────────────────────────────────┐
 │  Apps (Chrome, Word, Zalo)   — user mode  │  limited rights
 ├──────────────── system calls ─────────────┤
 │  Kernel                     — kernel mode │  full rights
 ├───────────────────────────────────────────┤
 │  Hardware (CPU, RAM, disk, network)       │
 └───────────────────────────────────────────┘
```

The CPU itself enforces two levels: **user mode** (apps — restricted) and **kernel mode** (the kernel — can do anything). This is why a buggy app usually only crashes itself, while a bug in the kernel or in a driver (drivers run with kernel rights) can take down the whole machine: the Windows **blue screen** ("Your PC ran into a problem") or a macOS **kernel panic** (the Mac restarts and says it restarted because of a problem).

### Step by step: what happens when an app saves a file

1. You press **Ctrl + S** in Word.
2. Word cannot touch the disk itself, so it makes a **system call**: "write these bytes to `report.docx`".
3. The CPU switches into kernel mode and hands control to the kernel.
4. The kernel checks permissions: is this user allowed to write to that folder?
5. The kernel asks the file system where to put the data, then tells the disk driver to write it.
6. The kernel returns the result ("done" or "access denied") to Word, and the CPU switches back to user mode.

All of this takes a tiny fraction of a second. Opening files, creating processes, sending data over the network and reading the clock all work through system calls in the same way.

Well-known kernels: the **Linux** kernel (Linux servers and Android), **XNU** (macOS and iOS) and the **Windows NT** kernel (Windows 10/11 and Windows Server).

---

## 7. The OS at Work: What a BA or Tester Should Ask

Most work tickets that mention "the system" quietly depend on OS details. Knowing them helps you ask the right questions.

> **Real-life example:** a requirement says *"The app must run on existing company workstations."* Before signing off, a BA should clarify:
> - **Which OS and version?** Windows 10 and 11? Any Macs? (An app built only for Windows will not run on macOS.)
> - **Minimum specs?** CPU, RAM, free disk space.
> - **Install permissions?** Do staff have admin rights, or must IT deploy the app for them?
> - **Security rules?** Will the company firewall or antivirus block it?

Some typical questions and messages you will meet:

| You see / hear | What it means in OS terms |
|---|---|
| "Works on my machine, fails on the server" | Often an OS difference — Windows vs Linux, case-sensitive file names, different paths (`\` vs `/`) |
| "Access is denied" / "Permission denied" | The user account lacks the permission or admin right |
| "Program is Not Responding" | A process's main thread is stuck; Task Manager can end it |
| "Low on memory" / very slow machine | RAM full, OS swapping to disk (virtual memory) |
| "Please update your driver" | The translator between OS and a device is outdated |
| "We'll SSH into the server and check the logs" | Connect to a Linux server's CLI remotely and read its record files |

---

## 8. Summary

- **OS** = the foundational software that manages resources. These resources are the CPU, RAM, disk, devices and network.
- It **shares** hardware between apps, **hides** hardware details, and **protects** apps and users from each other.
- **Process** = a running program; **thread** = a worker inside a process that shares its memory.
- **Scheduling** gives each process slices of CPU time; **virtual memory** borrows disk space when RAM is full.
- **File System** = how the OS organizes files. Windows uses drive roots like `C:\`; Linux/macOS use one tree from `/`. Linux file names are case-sensitive.
- **CLI** = the command-line interface — important for servers. **GUI** = point and click.
- **Driver** = software that lets the OS communicate with hardware.
- **Kernel** = the core of the OS, with the highest privilege. Apps reach it through **system calls**.

### Key terms

| Term | Plain-language meaning |
|---|---|
| Operating system (OS) | The "building manager" software for the computer |
| Boot | Starting the computer and loading the OS |
| Process | A program that is currently running |
| Thread | A worker inside a process, sharing its memory |
| Scheduler | The part of the OS that decides which process uses the CPU next |
| Virtual memory | Using disk space as overflow when RAM is full |
| File system | How files and folders are organized on a disk |
| Path | The full address of a file, e.g. `C:\Users\Harry\a.txt` |
| Driver | A translator program between the OS and one device |
| GUI / CLI | Click-based screen / typed-command interface |
| Terminal / shell | The program where you type CLI commands |
| Kernel | The core of the OS with full access to hardware |
| System call | An app's formal request to the kernel |
| Admin rights | Permission to install software and change system settings |
