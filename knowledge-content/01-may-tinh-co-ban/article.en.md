# What Is a Computer?

## 1. Overview

A computer is an electronic device capable of receiving input data, processing that data according to programmed instructions, and producing output. A computer operates based on two core components: **hardware** and **software**.

That definition sounds abstract, so let's make it concrete. Think of a **restaurant kitchen**:

- An order comes in from the waiter (**input**).
- The cook follows a recipe to prepare the dish (**processing according to instructions**).
- The finished plate goes out to the customer (**output**).
- Ingredients that are not being used right now wait in the fridge and the pantry (**storage**).

A computer does the same thing with data instead of food, billions of times per second. Laptops, phones, **servers** (computers in data centers that run websites for millions of people) and the small hidden computers inside a smart TV, a car or an ATM (**embedded systems**) all follow this pattern.

In the kitchen, **hardware** is the stove, knives and fridge; **software** is the recipes and the cook's know-how. Neither is useful alone: a kitchen with no recipes produces nothing, and a recipe with no kitchen is just paper.

---

## 2. Hardware

Hardware refers to all of the physical components you can see and touch.

```text
 Motherboard (connects everything)
   [ CPU ] ◄──► [ RAM ] ◄──► [ Storage: SSD/HDD ]
      │
   [ GPU ] ──► screen     keyboard · mouse ──► CPU
```

### CPU – Central Processing Unit

**Analogy:** the CPU is the **head chef**. It reads each step of the recipe and does it, very fast, one step after another.

The CPU (Central Processing Unit) is the "brain" of the computer. It executes program instructions, performs calculations, and coordinates the activity of the other components.

- CPU speed is measured in **GHz** (gigahertz) — billions of processing cycles per second. A 3 GHz CPU ticks about 3 billion times a second.
- Modern CPUs have multiple **cores**: quad-core (4 cores), octa-core (8 cores), and so on. A **core** is like an extra chef: more cores let the computer work on several tasks **in parallel** (music, a video call and a virus scan at once).
- Examples: Intel Core i7, AMD Ryzen 5. Macs use Apple's own chips (M1, M2, M3…).

> **Common misconception:** "Higher GHz always means faster." A newer 3 GHz CPU can beat an older 4 GHz one because it does more work per tick and has more cores.

### RAM – Temporary Memory

**Analogy:** RAM is the **kitchen counter**. The chef keeps the ingredients for the dishes being cooked *right now* on the counter, because reaching for them there is instant. The bigger the counter, the more dishes can be prepared at once.

RAM (Random Access Memory) is **temporary** memory that stores the data and programs currently running. When the machine is turned off, all data in RAM is erased. That is why you lose unsaved work in a power cut: it only existed in RAM. The technical word for "needs power to keep its contents" is **volatile**.

- Unit: GB (gigabyte). Consumer computers typically have 8–32 GB of RAM.
- More RAM → the machine can run more applications at once without slowing down.
- Example: Opening Chrome with 20 tabs consumes roughly 2–4 GB of RAM.

When the counter is full, the computer keeps moving things to the pantry (storage) and back. This shuffling is slow — the most common reason a computer stutters when you open one more tab.

### Storage

**Analogy:** storage is the **fridge and pantry**. It holds everything the kitchen owns — even overnight when the lights are off — but fetching from it is slower than grabbing from the counter.

Storage keeps data **permanently** (even when the machine is turned off). Your photos, documents, installed apps, and the operating system itself all live here. The technical word is **non-volatile**.

| Type | Speed | Durability | Price |
|------|--------|-----|-----|
| HDD (mechanical hard disk) | Slow | Fragile | Cheap |
| SSD (solid-state drive) | Fast | More durable | More expensive |

- An **HDD** (Hard Disk Drive) stores data on spinning platters read by a moving arm, like a record player — slower and easily damaged if dropped.
- An **SSD** (Solid-State Drive) uses memory chips with no moving parts — many times faster, so the laptop starts in seconds.
- Units: GB, TB (terabyte). On the box, drive makers count 1 TB = 1,000 GB; computers count in steps of 1,024 (see Section 5 for why your "1 TB" drive shows less).

> **Common misconception:** "My laptop has 512 GB of memory." That 512 GB is usually **storage** (the SSD), not memory (RAM). "16 GB RAM, 512 GB SSD" means 16 GB of counter, 512 GB of pantry.

### Mainboard (Motherboard)

The circuit board that connects all the components together: CPU, RAM, storage, graphics card, and more. Like the **kitchen's floor and corridors**, it carries signals and power between the parts so they can talk to each other.

### Graphics Card (GPU)

Handles image and video processing. The **GPU** (Graphics Processing Unit) is a specialist that does thousands of small, similar jobs at once — exactly what drawing millions of pixels needs.

An integrated GPU is built into the CPU (Intel HD Graphics); a discrete GPU (NVIDIA, AMD) is used for heavy graphics work, gaming, and AI. Integrated is fine for office work and YouTube.

### Peripheral Devices

- **Input** (information going *into* the computer): keyboard, mouse, webcam, microphone.
- **Output** (information coming *out*): monitor, speakers, printer.
- A touchscreen does both: it shows images and senses your finger.

> **Try it yourself:** see your own hardware.
> - **Windows:** press `Ctrl + Shift + Esc` to open **Task Manager** → **Performance** tab. You will see CPU (speed and cores), Memory (RAM in GB), Disk (SSD or HDD) and GPU.
> - **macOS:** Apple menu → **About This Mac** shows the chip (e.g. "Apple M2") and Memory (e.g. "16 GB"). Storage is under **System Settings → General → Storage**.

---

## 3. Software

Software is the collection of programs (code) that control the hardware and carry out tasks.

A **program** is a long list of precise instructions written by programmers — the recipe. The instructions are written in a programming language and then turned into the 0s and 1s the CPU understands. Software is invisible: you cannot touch Chrome, but you can see what it does.

Software comes in layers, like a building:

```text
 ┌─────────────────────────────────────────────┐
 │  Application software  (Word, Chrome, Zalo) │  ← what you use
 ├─────────────────────────────────────────────┤
 │  Operating system      (Windows, macOS)     │  ← the manager
 │  + system software     (drivers, utilities) │
 ├─────────────────────────────────────────────┤
 │  Hardware              (CPU, RAM, storage)  │  ← the physical machine
 └─────────────────────────────────────────────┘
```

### Operating System (OS)

The foundational software that manages all of the computer's resources and provides the environment for running other software.

**Analogy:** the OS is the **restaurant manager**. Cooks (apps) do not fight over the stove; the manager decides who uses which burner, how much counter space each one gets, and keeps strangers out of the kitchen. In computer terms the OS shares out CPU time and RAM between apps, organizes files into folders, talks to devices, and handles user accounts and passwords.

- **Windows** (Microsoft) – the most popular OS for PCs.
- **macOS** (Apple) – used on Mac computers.
- **Linux** – open source, popular on servers. "Open source" means its code is public and anyone can use and modify it for free; most websites and cloud systems you use run on Linux.
- **Android/iOS** – mobile operating systems. Android (Google) runs on most phones worldwide; iOS (Apple) runs on iPhones.

The OS is the first software that loads when you press the power button, and it is the reason the same app can run on thousands of different computer models: the app talks to the OS, and the OS deals with the specific hardware.

### Application Software

Programs that serve specific needs: Microsoft Word, Chrome, Photoshop, Spotify, and so on. These are usually just called **apps**. You install them on top of the OS, and each one is built for a particular OS — that is why a Windows `.exe` installer does not run on a Mac.

### System Software

Programs that support the operation of the operating system: device drivers, system utilities, and the like.

- A **driver** is a small translator program that lets the OS talk to one specific piece of hardware. When you plug in a new printer and Windows says "Setting up device", it is installing the printer's driver. A wrong or outdated graphics driver is a classic cause of a flickering screen.
- **Utilities** are maintenance tools: antivirus, disk cleanup, backup, the tool that updates the system.

> **Common misconception:** "An app I use for work every day must be system software." No — a company accounting app, a CRM, or a chat app is **application software**, however important it is. System software is the behind-the-scenes layer that keeps the OS and hardware working.

---

## 4. How a Computer Works

Every computer, from a phone to a giant server, follows the same basic loop:

```text
Input → CPU processes (using RAM as temporary memory) → Output
                 ↑↓
           Storage (long-term storage)
```

1. You press a key → the keyboard sends a signal to the CPU.
2. The CPU looks up instructions in RAM (the running program).
3. The CPU processes them and sends the result to the screen.
4. If it needs to be saved → it is written to storage.

### Step by step: what happens when you open a document and edit it

Let's follow a real example — opening a Word file called `report.docx`, typing a sentence, and saving.

1. **You double-click the file.** The mouse click is input. The OS sees the click and works out that `.docx` files open with Word.
2. **Loading from storage into RAM.** Word itself (the program) and `report.docx` (your data) are both sitting in storage. The OS copies them into RAM, because the CPU can only work quickly with what is on the counter. This is why bigger programs take a few seconds to open — that is the copying time.
3. **The CPU runs Word's instructions.** It reads Word's instructions from RAM one after another and draws the document window. The GPU helps turn that into pixels on your monitor (output).
4. **You type a sentence.** Each key press is input; the CPU follows Word's instructions to add the letter to the copy of the document **in RAM** and redraw the screen.
5. **You press Ctrl + S (Cmd + S on Mac).** Only now is the updated document written from RAM back to **storage**. The change is now permanent.
6. **You close Word.** The OS reclaims the RAM Word was using, so other apps can use it.

If the power goes out between step 4 and step 5, your new sentence is lost: it was only in RAM. That is the whole reason "AutoSave" features exist — they quietly repeat step 5 every few minutes.

### Why speed depends on all the parts together

A computer is only as fast as its slowest link for the job you are doing:

| Symptom | Most likely bottleneck |
|---|---|
| Slows down when many apps/tabs are open | Not enough **RAM** |
| Takes ages to start up or open files | Slow **storage** (an old HDD) |
| Heavy calculation (export video, big Excel) is slow | **CPU** |
| Games or 3D graphics stutter | **GPU** |

> **Real-life example:** a tester reports "The app freezes when I open the 50th product page." A developer opens Task Manager and sees Memory at 98%. The ticket is updated: *"Memory usage grows with each page and is never released — suspected memory leak."* Knowing the four parts lets you describe a problem precisely instead of just "the computer is slow".

---

## 5. Data Units

Everything inside a computer — text, photos, music, video — is stored as long sequences of **0s and 1s**. Why? Because hardware can very reliably tell two states apart: electricity on or off, a tiny switch open or closed. One such 0-or-1 is a **bit** (short for *binary digit*).

**Analogy:** a bit is a single light switch. Eight switches in a row give 256 different on/off patterns (2 × 2 × 2 × 2 × 2 × 2 × 2 × 2 = 256) — enough to give every letter, digit and punctuation mark its own pattern. A group of 8 bits is a **byte**, and roughly one byte stores one English character.

| Unit | Symbol | Conversion |
|--------|---------|---------|
| Bit | b | Smallest unit (0 or 1) |
| Byte | B | 8 bits |
| Kilobyte | KB | 1,024 Bytes |
| Megabyte | MB | 1,024 KB |
| Gigabyte | GB | 1,024 MB |
| Terabyte | TB | 1,024 GB |

### How big is each unit in real life?

| Size | Roughly what it holds |
|---|---|
| 1 KB | A short plain-text email |
| 1 MB | A photo from an old phone, or a 500-page plain-text book |
| 5 MB | A typical song (MP3) or a modern phone photo |
| 1 GB | About an hour of standard-definition video |
| 1 TB | Around 200,000 phone photos |

### Converting between units

Going **up** a unit, divide by 1,024; going **down**, multiply by 1,024. For quick mental maths, using 1,000 is close enough.

- A 5 MB image = 5 × 1,024 = **5,120 KB**.
- A requirement says an export file must stay under 500 MB and each record is about 1 KB → roughly 500 × 1,000 = **about 500 thousand records**.

### 1,000 or 1,024? Why your new drive looks smaller

Computers count in powers of 2, so 1 KB = 1,024 bytes (2¹⁰). Drive manufacturers, however, use the everyday metric meaning: 1 KB = 1,000 bytes, 1 TB = 1,000,000,000,000 bytes. Windows then divides that number by 1,024 three times and shows about **931 GB**. Nothing is missing — it is the same amount counted two ways. (macOS shows sizes in units of 1,000, so a Mac would show close to 1 TB.)

### Bits vs. bytes: the Internet speed trap

Internet speeds are quoted in **bits** per second (lower-case **b**: Mbps), while file sizes are in **bytes** (upper-case **B**: MB). Since 1 byte = 8 bits, divide by 8:

- A "100 Mbps" connection downloads at most about 100 ÷ 8 = **12.5 MB per second**.
- So a 1 GB file takes about 80 seconds at best — not 10.

> **Try it yourself:** right-click any file and choose **Properties** (Windows) or select it and press `Cmd + I` (macOS). You will see its size, for example "2.4 MB (2,516,582 bytes)". Divide the byte number by 1,024 twice and check that you get the MB figure.

---

## 6. Reading a Computer Spec Sheet

Now you can read the "spec sheet" (list of specifications) that every laptop shop and every IT ticket uses. A typical one looks like this:

```text
Laptop XYZ 14"
CPU:      Intel Core i5-1335U (10 cores, up to 4.6 GHz)
RAM:      16 GB DDR5
Storage:  512 GB NVMe SSD
Graphics: Intel Iris Xe (integrated)
Display:  14" Full HD (1920 × 1080)
OS:       Windows 11 Home
```

Line by line, in plain words:

- **CPU** — the head chef. "10 cores" means it can work on many tasks in parallel; "up to 4.6 GHz" is its top speed.
- **RAM 16 GB** — the size of the counter. DDR5 is just the generation of RAM technology (newer = faster).
- **Storage 512 GB NVMe SSD** — the pantry. NVMe is a fast type of SSD connection.
- **Graphics: integrated** — the GPU is built into the CPU: fine for office work, not for heavy gaming.
- **Display** — Full HD means 1920 × 1080 pixels (tiny dots of colour).
- **OS** — the software manager that comes pre-installed.

### A rough buying guide for everyday users

| Use | CPU | RAM | Storage |
|---|---|---|---|
| Email, web, Office, video calls | Recent i3 / Ryzen 3 / Apple M-series | 8 GB (16 GB more comfortable) | 256 GB SSD |
| Office worker / BA with many tabs, Excel, Teams | i5 / Ryzen 5 / Apple M-series | 16 GB | 512 GB SSD |
| Developer, data work, photo/video editing | i7 / Ryzen 7 / Apple M Pro | 16–32 GB | 512 GB–1 TB SSD |

> **Real-life example:** in a requirements meeting, someone says *"The app must run on our staff laptops."* A good BA asks: *"What are the minimum specs — CPU, RAM, free disk space, and OS version?"* The answer (for example "8 GB RAM, Windows 10 or later, 2 GB free disk") goes into the **non-functional requirements**, the part of a spec that describes how well and on what the system must run. Mixing up RAM and disk here would set the wrong limit.

---

## 7. Summary

- A computer takes **input**, **processes** it by following instructions, and produces **output**; it **stores** what must be kept.
- **CPU**: the brain – processes everything. More cores = more tasks in parallel; GHz = ticks per second.
- **RAM**: temporary memory – holds what is currently in use. Fast, but erased when the power goes off.
- **Storage**: long-term memory – stores files, the operating system, and software. SSD is fast; HDD is cheap and slow.
- **GPU**: draws images; integrated for office work, discrete for games, video and AI.
- **OS**: the foundational software – the bridge between hardware and applications.
- **Drivers** let the OS talk to hardware; **apps** serve the user's specific needs.
- **Data units**: 8 bits = 1 byte; each step up (KB → MB → GB → TB) is ×1,024. Internet speed is in bits, file size in bytes.
- Hardware + Software = a complete computer.

### Key terms

| Term | Plain-language meaning |
|---|---|
| Hardware | The physical parts you can touch |
| Software | Programs — instructions that tell the hardware what to do |
| CPU | The chip that carries out instructions (the "head chef") |
| Core | One independent worker inside the CPU |
| RAM | Fast, temporary working space; empties when power is off |
| Storage (SSD/HDD) | Permanent space for files, apps and the OS |
| GPU | Chip specialised in drawing images and parallel maths |
| Motherboard | The main board connecting all the parts |
| Peripheral | A device for input (keyboard) or output (monitor) |
| Operating system (OS) | The manager software between hardware and apps |
| Driver | A translator program letting the OS use one device |
| Bit / Byte | One 0-or-1 / a group of 8 bits |
