# IDE & Code Editor: Getting Started with VS Code

## 1. What code really is: plain text

**Analogy:** think of a recipe written by hand on a plain sheet of paper. Anyone can read it, copy it, or pin it to the fridge. Now think of the same recipe printed in a glossy magazine: fonts, colours, photos, page layout. The magazine page looks nicer, but a cook only needs the words.

Code is the handwritten recipe. A program, a web page or a database query is saved as a **plain text file**: a file that contains only characters (letters, digits, symbols, spaces, line breaks) and nothing else. There is no bold, no font size, no page margin inside the file.

That is why you cannot write code in Microsoft Word or Google Docs. A word processor saves much more than the characters you typed:

| | Plain text file (`index.html`, `notes.txt`) | Word document (`report.docx`) |
|--|--|--|
| What is inside | Only the characters you typed | Your text plus fonts, styles, margins, images, history |
| Who can read it | Any editor, any browser, any program | Only programs that understand the Word format |
| Hidden changes | None | Straight quotes become curly quotes, `--` becomes a long dash, first letters are capitalised |

The last row hurts the most. Code needs the straight quote `"`, but Word quietly replaces it with the curly quotes `“` and `”`. To a human they look almost the same. To a computer they are different characters, and the program stops working.

> **Common misconception:** "Code is something mysterious that only special software can open." In fact you can open any code file with the simplest editor on your computer. Special tools only make the work faster and safer.

> **Try it yourself:** on Windows open **Notepad** (on macOS open **TextEdit**, then choose *Format → Make Plain Text*). Type `Hello`, and save the file as `hello.txt`. Its size is 5 bytes: one byte per letter. Now type the same word in Word and save it as `hello.docx`. That file is thousands of bytes, because of everything Word adds around your five letters.

---

## 2. Text editor, code editor, IDE and the tools you will hear named

**Analogy:** to cook you could use one small knife, a good set of kitchen tools, or a full restaurant kitchen. All three can make dinner. They differ in how much help they give you and how long it takes to learn them.

- A **text editor** is the small knife. It only lets you type and save plain text. Notepad and TextEdit are text editors.
- A **code editor** is the set of kitchen tools. It is still fast and lightweight, but it understands code: it colours it, completes words for you, and warns you about mistakes. **Visual Studio Code** (everyone says **VS Code**) is a code editor.
- An **IDE** (Integrated Development Environment) is the restaurant kitchen. It bundles an editor with heavy tools for one kind of work: a debugger (a tool for pausing a program and looking inside it), a build system, a database viewer, project wizards. IntelliJ IDEA and Android Studio are IDEs.

VS Code sits in the middle. It starts as a code editor, and you can add extra tools one by one until it behaves almost like an IDE. It is free, made by Microsoft, and works the same on Windows, macOS and Linux. Those are the reasons most web developers use it, and the reason this course uses it.

### The names you will hear at work

| Tool | Type | Typical use | Good to know |
|------|------|-------------|--------------|
| Notepad / TextEdit | Text editor | Quick notes, tiny edits | Already on your computer; no help with code |
| Notepad++ | Code editor | Quick edits on Windows | Free, Windows only, very light |
| Sublime Text | Code editor | General coding | Very fast; paid licence, free to try |
| **VS Code** | Code editor (grows with extensions) | Web, JavaScript, Python and much more | Free; the tool for this course |
| JetBrains IDEs (IntelliJ IDEA, WebStorm, PyCharm) | IDE | Java, JavaScript, Python projects in companies | Powerful and heavier; many editions are paid |
| Visual Studio | IDE | C# and .NET, C++ | Mainly for Windows; **not** the same as VS Code |
| Android Studio | IDE | Android apps | Free, from Google |
| Xcode | IDE | iPhone and Mac apps | Free, macOS only, from Apple |
| Cursor and other AI-assisted editors | Code editor with an AI assistant | Writing code with AI suggestions | Cursor is built on the VS Code codebase, so it looks familiar |
| CodePen, StackBlitz | Online playground | Trying an idea in the browser | Nothing to install; great for sharing a small demo |

> **Common misconception:** "Visual Studio and Visual Studio Code are the same program." They share a name and a company, nothing more. Visual Studio is a large IDE aimed mostly at C# and C++ developers. Visual Studio Code is the small, free editor in this topic. If a tutorial says "open VS Code" and your screen looks completely different, you may have installed the wrong one.

Whatever tool you pick, the files stay plain text. A page written in VS Code opens in WebStorm, in Notepad, or in a colleague's editor without any conversion.

---

## 3. Installing VS Code on Windows and macOS

Installing takes about five minutes. Download it only from the official site, **code.visualstudio.com**, never from a random download page.

### Windows

1. Open `https://code.visualstudio.com` in your browser and click the big **Download** button (the site detects that you use Windows).
2. Run the downloaded installer (a file named like `VSCodeUserSetup-….exe`).
3. Accept the licence and keep the suggested install location.
4. On the **Select Additional Tasks** page, tick these checkboxes:
   - **Add "Open with Code" action to Windows Explorer file context menu**
   - **Add "Open with Code" action to Windows Explorer directory context menu**
   - **Add to PATH** (usually ticked already; leave it on)
5. Click **Install**, then **Finish**.

Why these boxes matter: "Open with Code" lets you right-click any folder in File Explorer and open it in VS Code. **PATH** is the list of places Windows searches when you type a program name, so "Add to PATH" makes the command `code` work in a terminal later.

### macOS

1. Open `https://code.visualstudio.com` and click the **Download** button for macOS.
2. Open the downloaded file. You get an app named **Visual Studio Code**.
3. Drag the app into the **Applications** folder. Do not run it from Downloads.
4. Start it from Applications or from Spotlight (`Cmd + Space`, type "code"). The first time, macOS asks whether you really want to open an app downloaded from the internet; click **Open**.

### First launch

The first launch shows a **Welcome** tab with a few setup choices, such as a colour theme. Pick any theme you like; you can change it later. Newer versions may also invite you to sign in or to set up an AI assistant. You can skip all of that: nothing in this topic needs an account.

Sooner or later you will meet this prompt:

```text
Do you trust the authors of the files in this folder?

[ Yes, I trust the authors ]     [ No, I don't trust the authors ]
```

This is **Workspace Trust**. Some project folders contain settings that can run programs on your computer, so VS Code asks before it allows that. For a folder you created yourself, answer **Yes**. For a folder downloaded from an unknown source, answer **No**: VS Code then opens it in **Restricted Mode**, where you can still read and edit files, but automatic tasks and many extensions are switched off.

> **Try it yourself:** after installing, open VS Code and choose *Help → About* (on macOS: *Code → About Visual Studio Code*). A small window shows the version number. That is your proof that the installation worked.

---

## 4. A tour of the VS Code window

**Analogy:** the window is like a car dashboard. It looks crowded on the first day, but it has only five areas, and each one has a single job.

```text
+----+----------------+---------------------------------------------+
| A  |  SIDE BAR      |  EDITOR AREA                                |
| C  |                |  [ index.html ] [ style.css ]   <- tabs     |
| T  |  EXPLORER      |                                             |
| I  |  MY-FIRST-SITE |   1  <!DOCTYPE html>                        |
| V  |    index.html  |   2  <html lang="en">                       |
| I  |    style.css   |   3  <head>                                 |
| T  |                |                                             |
| Y  |                +---------------------------------------------+
|    |                |  PANEL                                      |
| B  |                |  Problems | Output | Terminal               |
| A  |                |  PS C:\Users\you\my-first-site>             |
| R  |                |                                             |
+----+----------------+---------------------------------------------+
|  STATUS BAR    x 0  ! 0         Ln 3, Col 7   UTF-8   HTML        |
+-------------------------------------------------------------------+
```

| Area | Where | What it is for |
|------|-------|----------------|
| **Activity Bar** | Narrow strip of icons, far left | Switches what the Side Bar shows |
| **Side Bar** | Next to the Activity Bar | The view you picked: your files, search results, extensions |
| **Editor area** | The big middle part | Where you read and type; every open file gets a **tab** |
| **Panel** | Below the editor | Terminal, Problems (list of errors), Output (messages from tools) |
| **Status Bar** | Thin coloured line at the bottom | Facts about the current file: line and column, language, error count |

The icons in the Activity Bar, from top to bottom:

| Icon | View | You use it to |
|------|------|---------------|
| Two sheets of paper | **Explorer** | See and manage the files of your project |
| Magnifying glass | **Search** | Find text in all files at once |
| Branching line | **Source Control** | Work with Git (see the Git topic) |
| Play button with a bug | **Run and Debug** | Run a program step by step; not needed yet |
| Four squares | **Extensions** | Install add-ons |

Click an icon once to show its view; click the same icon again to collapse the Side Bar and get more room for your code. The Panel works the same way: you can hide it and bring it back from the *View* menu.

Do not worry if your window is not identical to the diagram. The layout can be customised, and newer versions sometimes add a chat panel on the right, which you can close.

> **Try it yourself:** click each Activity Bar icon in turn and read the title at the top of the Side Bar. Then press `Ctrl + B` (macOS: `Cmd + B`) twice. The Side Bar disappears and comes back.

---

## 5. Working with a project folder

**Analogy:** a project is a binder, not a loose sheet. A web page needs several files that refer to each other (the page, its styles, its images), so they must live together in one **folder** (also called a directory). That folder is your **project**.

The most important habit in VS Code: **open the folder, not a single file.**

1. Choose *File → Open Folder…*.
2. Select the project folder and confirm.
3. The Explorer now shows the folder name in capital letters with all its files below it.

When a folder is open, hover over its name in the Explorer and you see small buttons: **New File**, **New Folder**, **Refresh** and **Collapse**. You can also right-click in the Explorer to rename or delete a file.

### File extensions: the last part of the name

The **file extension** is the part of a file name after the last dot: `.html`, `.css`, `.js`, `.txt`. It tells the computer, the browser and VS Code what kind of content is inside. Name a file `index.html` and VS Code treats it as HTML; name it `index.txt` and the same content is treated as plain notes.

Windows hides extensions by default, which causes a classic beginner problem: a file that looks like `index.html` is really `index.html.txt`. Switch the display on once and forget about it:

- **Windows 11:** in File Explorer choose *View → Show → File name extensions*.
- **Windows 10:** in File Explorer open the *View* tab and tick *File name extensions*.
- **macOS:** in Finder choose *Finder → Settings → Advanced* (*Preferences* on older versions) and tick *Show all filename extensions*.

### Saving: watch the dot

When you change a file, the **×** on its tab turns into a round **dot**. The dot means "this file has unsaved changes". The browser and every other program still see the old version on disk.

- Save with `Ctrl + S` (macOS: `Cmd + S`). The dot turns back into ×.
- Or switch on *File → Auto Save*. VS Code then saves a moment after you stop typing.

> **Common misconception:** "I typed it, so it is saved." Not until the dot is gone. Forgetting to save is the number one reason a beginner sees no change in the browser.

> **BA corner:** VS Code is not only for developers. A Business Analyst uses it to read files that developers send: JSON samples from an API, SQL scripts, log files, Markdown documents. Open the project folder, press `Ctrl + Shift + F` and search for the exact text of an error message or a button label. In a few seconds you know which file contains it, and your question to the developer becomes much more precise.

---

## 6. Hands-on: your first web page

Time to create the file you will keep using in the next topic, HTML Basics.

### Step 1: create the project folder

1. In File Explorer (macOS: Finder) create a folder named `my-first-site`, for example inside Documents. Use lowercase letters and a hyphen instead of spaces; spaces in folder names cause trouble later in the terminal.
2. In VS Code choose *File → Open Folder…* and select `my-first-site`.
3. If the trust prompt appears, answer **Yes**: you are the author.

### Step 2: create index.html

1. In the Explorer click **New File**, type `index.html` and press Enter. The file opens in a tab.
2. In the empty editor type one exclamation mark: `!`
3. A small suggestion list appears. Press **Tab**.

VS Code expands that single character into a complete page skeleton. This is **Emmet**, a built-in feature that turns short abbreviations into HTML. The standard starting code that every page needs is called **boilerplate**.

### Step 3: make it yours

Change the title and add two lines inside `<body>`, so that the file looks exactly like this (your version of VS Code may generate one line more or less in `<head>`; that is fine):

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My First Site</title>
</head>
<body>
    <h1>Hello, VS Code!</h1>
    <p>This is my first web page.</p>
</body>
</html>
```

Press `Ctrl + S` (macOS: `Cmd + S`). Check that the dot on the tab is gone.

### Step 4: open it in the browser

1. In the Explorer right-click `index.html` and choose **Reveal in File Explorer** (macOS: **Reveal in Finder**).
2. Double-click the file. It opens in your default browser.

You should see a large bold heading, **Hello, VS Code!**, with the sentence "This is my first web page." below it. The browser tab is labelled **My First Site**. The address bar starts with `file:///`, which means the browser is reading the file straight from your disk, not from the internet.

Now change the heading text in VS Code, save, go back to the browser and press `F5` to refresh. The new text appears. Edit, save, refresh: that is the basic loop of web work.

### Step 5: let the page reload itself

Refreshing by hand gets boring quickly. An extension can do it for you (Section 8 explains extensions in detail):

1. Click the **Extensions** icon, search for `Live Server` and click **Install**.
2. Right-click `index.html` in the Explorer and choose **Open with Live Server**.
3. The browser opens an address like `http://127.0.0.1:5500/index.html`.

Live Server runs a tiny web server on your own computer and watches your folder. Every time you save a file, it tells the browser to reload the page. This is called **auto-reload** (or live reload). Microsoft's **Live Preview** extension does a similar job and shows the page inside VS Code itself.

> **Try it yourself:** put VS Code on the left half of your screen and the browser on the right. Change `Hello, VS Code!` to your own name and press `Ctrl + S`. With Live Server running, the page updates before you can reach for the mouse.

---

## 7. What the editor does for you

Everything in this section is the reason people use a code editor instead of Notepad. Try each feature in your `index.html` as you read.

### It helps you read

- **Syntax highlighting:** the editor colours each part of the code by its role, so tags, attribute names and text look different. A missing quote is easy to spot, because everything after it suddenly has the wrong colour.
- **Bracket matching:** put the cursor next to a bracket and its partner is highlighted. In HTML, clicking an opening tag highlights its closing tag too.
- **Minimap:** the narrow preview of the whole file on the right edge. Hide it under *View → Appearance → Minimap* if it distracts you.

### It helps you type

- **IntelliSense** is the VS Code name for autocomplete. Type `<bu` and a list offers `button`; press Tab or Enter to accept, or Esc to dismiss the list. It also shows a short description of each suggestion.
- **Emmet abbreviations:** `!` is only the start. Type `ul>li*3` and press Tab to get a list with three items. Type `p` and press Tab to get `<p></p>`.
- **Auto-closing:** type `<h2>` and the editor adds `</h2>` for you; type `(` or `"` and the matching character appears.
- **Multi-cursor:** hold `Alt` (macOS: `Option`) and click in several places to type in all of them at once. Or select a word and press `Ctrl + D` (macOS: `Cmd + D`) to also select the next occurrence of it.

### It catches mistakes

A wavy underline, often called a **squiggle**, marks a problem: red for an error, yellow for a warning. Hover over it to read the explanation. All problems of the project are listed in the **Problems** panel (`Ctrl + Shift + M`, macOS: `Cmd + Shift + M`), and the Status Bar shows the totals.

VS Code is forgiving with HTML, just as browsers are, so you will see few squiggles there. You will see many more in CSS, JavaScript and JSON. For example, writing `colr: red;` in a CSS file gives a yellow squiggle with the message that the property is unknown.

### It keeps the code tidy

**Formatting** means fixing the indentation (the spaces at the start of lines) and the spacing without changing what the code does. Tidy indentation shows at a glance which tag sits inside which. Right-click in the editor and choose **Format Document**, or press `Shift + Alt + F` (macOS: `Shift + Option + F`). Teams often add the Prettier extension so that everyone's code is formatted in one consistent style.

### It finds things

| You want to | Windows / Linux | macOS |
|-------------|-----------------|-------|
| Find in the current file | `Ctrl + F` | `Cmd + F` |
| Replace in the current file | `Ctrl + H` | `Cmd + Option + F` |
| Search in all files of the folder | `Ctrl + Shift + F` | `Cmd + Shift + F` |
| Open a file by typing part of its name (**Quick Open**) | `Ctrl + P` | `Cmd + P` |
| Run any command by name (**Command Palette**) | `Ctrl + Shift + P` | `Cmd + Shift + P` |

The **Command Palette** deserves a special mention. It is a search box for every action VS Code can do. If you forget a shortcut or cannot find a menu, open the palette and type a few letters of what you want. Typing `format` or `theme` is enough.

Two more comforts: zoom the whole window with `Ctrl + =` and `Ctrl + -` (macOS: `Cmd`), and view two files side by side with **Split Editor** (`Ctrl + \`, macOS: `Cmd + \`).

> **Try it yourself:** in `index.html` add a new line inside `<body>`, type `ul>li*3` and press Tab. Then mess up the indentation on purpose and run **Format Document**. The file snaps back into shape.

---

## 8. Extensions: adding tools to the editor

**Analogy:** VS Code is a smartphone and extensions are its apps. The phone works out of the box, and you install an app only when you need what it does.

An **extension** is an add-on that gives VS Code a new ability: support for another language, a formatter, a preview, a colour theme. Extensions come from the **Marketplace**, the built-in store.

To install one:

1. Click the **Extensions** icon in the Activity Bar (`Ctrl + Shift + X`, macOS: `Cmd + Shift + X`).
2. Type a name in the search box.
3. Click the extension to read its page, then click **Install**.

The same page later offers **Disable** and **Uninstall**.

> **Common misconception:** "Extension" has two unrelated meanings in this topic. A *file extension* is the `.html` at the end of a file name. A *VS Code extension* is an add-on for the editor. Check which one a colleague means.

### Is this extension trustworthy?

An extension is a program that runs on your computer, and anyone can publish one. Before you install, check four things on its page:

| Check | A good sign | A warning sign |
|-------|-------------|----------------|
| **Publisher** | A known name, with a verified mark next to it | A name that imitates a famous extension |
| **Installs** | Hundreds of thousands or millions | A few hundred for a "popular" tool |
| **Ratings and reviews** | Many reviews, mostly positive | No reviews, or recent complaints |
| **Last update** | Updated within the last year or so | Abandoned for years |

Copies with almost the same name and icon as a famous extension do appear, so compare the publisher and the install count before clicking.

### A starter list

| Extension | What it does | When |
|-----------|--------------|------|
| **Live Server** | Serves your page locally and reloads it on save | Now |
| **Prettier - Code formatter** | Formats HTML, CSS and JavaScript in a consistent style | Now |
| A language pack (for example Vietnamese) | Translates the menus of VS Code | Optional |
| **ESLint** | Points out likely mistakes in JavaScript | Later, in JavaScript projects |

A note on the language pack: most tutorials, and this course, use the English menu names. Staying in English makes it easier to follow instructions and to search for help.

Resist the urge to install dozens of extensions on day one. Each one makes VS Code start a little slower, and two extensions that do the same job can fight each other. Install one when you feel a real need, and uninstall what you do not use.

---

## 9. Terminal, Source Control and Settings

### The integrated terminal: a first taste

A **terminal** is a window where you type commands instead of clicking. VS Code has one built in, called the **integrated terminal**. Open it with ``Ctrl + ` `` (the backtick key, left of the `1` key on most keyboards; the shortcut is the same on macOS) or with *Terminal → New Terminal*.

Two things to notice. The terminal opens inside your project folder, so you do not need to navigate anywhere. And it runs a **shell**, the program that reads your commands: **PowerShell** on Windows, **zsh** on macOS.

Try three harmless commands. Type each one and press Enter:

```text
pwd
ls
code .
```

| Command | What it does | What you should see |
|---------|--------------|---------------------|
| `pwd` | Prints the folder you are in | A path ending in `my-first-site` |
| `ls` | Lists the files in that folder (`dir` also works on Windows) | `index.html` |
| `code .` | Opens the current folder in VS Code (the dot means "this folder") | Nothing new here, because the folder is already open; it is useful from a terminal outside VS Code |

On macOS the `code` command must be installed once: open the Command Palette and run **Shell Command: Install 'code' command in PATH**.

That is enough for today. Later topics use the terminal to install tools and start servers, and they explain each command when it is needed.

### Source Control in one paragraph

The **Source Control** view (the branching icon) is a visual front end for **Git**, the tool that records the history of your files. Once a folder is a Git repository, this view lists the files you changed, shows the differences line by line, and lets you save a snapshot with a message. You will learn the ideas behind it in the Git topic; until then you can ignore this icon.

### Settings, themes and font size

Open Settings with `Ctrl + ,` (macOS: `Cmd + ,`). There are two ways to see the same settings:

- The **Settings UI**: a searchable page with checkboxes and dropdowns. Use this one.
- **settings.json**: the plain text file where VS Code stores your choices. Developers like to edit it directly and to share it. Yes, even the settings of your editor are a plain text file.

Three settings worth changing on day one. Type the name in the search box at the top of the Settings page:

| Search for | What to set | Why |
|------------|-------------|-----|
| `Font Size` | 16 or more | Comfortable reading |
| `Auto Save` | `afterDelay` | No more forgotten saves |
| `Word Wrap` | `on` | Long lines stay visible without scrolling sideways |

To change the colours, open the Command Palette and run **Preferences: Color Theme**, then move through the list with the arrow keys to preview each theme. Dark or light is purely a matter of taste.

Settings can also be overridden for one project: the **Workspace** tab in Settings saves them in a `.vscode` folder inside the project, so that a whole team shares them.

---

## 10. Shortcut cheat sheet and troubleshooting

You do not need to memorise this table. Learn the first five rows this week and add one new shortcut whenever you catch yourself reaching for the mouse.

| Action | Windows / Linux | macOS |
|--------|-----------------|-------|
| Save | `Ctrl + S` | `Cmd + S` |
| Undo / Redo | `Ctrl + Z` / `Ctrl + Y` | `Cmd + Z` / `Cmd + Shift + Z` |
| Command Palette | `Ctrl + Shift + P` | `Cmd + Shift + P` |
| Quick Open (go to file) | `Ctrl + P` | `Cmd + P` |
| Toggle the terminal | ``Ctrl + ` `` | ``Ctrl + ` `` |
| Toggle the Side Bar | `Ctrl + B` | `Cmd + B` |
| Find / Replace | `Ctrl + F` / `Ctrl + H` | `Cmd + F` / `Cmd + Option + F` |
| Search in all files | `Ctrl + Shift + F` | `Cmd + Shift + F` |
| Format Document | `Shift + Alt + F` | `Shift + Option + F` |
| Comment or uncomment a line | `Ctrl + /` | `Cmd + /` |
| Move the line up or down | `Alt + ↑` / `Alt + ↓` | `Option + ↑` / `Option + ↓` |
| Add a cursor | `Alt + Click` | `Option + Click` |
| Select the next occurrence | `Ctrl + D` | `Cmd + D` |
| Split Editor | `Ctrl + \` | `Cmd + \` |
| Zoom in / out | `Ctrl + =` / `Ctrl + -` | `Cmd + =` / `Cmd + -` |
| Close the tab | `Ctrl + W` | `Cmd + W` |
| Open Settings | `Ctrl + ,` | `Cmd + ,` |

### When something goes wrong

Every beginner runs into the same handful of problems. Find your symptom in the left column, then check the likely cause before you try the fix.

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Double-clicking the page opens Notepad, or the browser shows your code as text | The file is really `index.html.txt` (often created with Notepad) | Show file extensions (Section 5) and rename the file to `index.html` |
| You edited the file but the browser shows the old page | The file is not saved (dot on the tab), or you did not refresh | Press `Ctrl + S`, then refresh; or use Auto Save and Live Server |
| Saved and refreshed, still the old page | The browser tab shows a different copy of the file | Compare the path in the address bar with the path in VS Code; open the page again from the Explorer |
| The Explorer shows no folder, and "Open with Live Server" complains | You opened a single file instead of the folder | *File → Open Folder…* and choose `my-first-site` |
| The terminal says `code` is not recognized (macOS: `command not found: code`) | VS Code is not on the PATH, or the terminal was opened before installing | Close and reopen the terminal; on Windows reinstall with "Add to PATH"; on macOS run the Shell Command from Section 9 |
| A "Restricted Mode" banner; extensions do not work | You answered "No" to the trust prompt | Click the banner, choose **Manage**, then **Trust** (only for folders you know) |
| No colours and no suggestions in a file | The language mode is wrong, for example Plain Text | Click the language name at the right end of the Status Bar and choose HTML; also check the file extension |
| Vietnamese typing (Telex in Unikey and similar tools) produces doubled or garbled letters | The input method and the suggestion list both react to the same keystrokes | Switch the input tool to English while typing code; press Esc to dismiss the list before typing Vietnamese text |

A general rule for all of these: read the tab. The name on the tab, the dot, and the language shown in the Status Bar answer most beginner questions before you need to ask anyone.

If none of this helps, close VS Code and open the folder again; a restart clears a surprising number of odd problems. When you ask a colleague for help, send a screenshot of the whole window, because the tab, the Explorer and the Status Bar usually reveal the cause.

---

## 11. Summary

- Code is plain text. A word processor such as Word adds hidden formatting and changes characters, so it cannot be used for code.
- A text editor only types and saves; a code editor understands code; an IDE bundles an editor with heavy tools for one kind of work.
- VS Code is a free code editor from Microsoft that grows through extensions. It is a different product from Visual Studio.
- Install it from the official site, and on Windows keep "Add to PATH" and the "Open with Code" options ticked.
- The window has five areas: Activity Bar, Side Bar, editor area with tabs, Panel and Status Bar.
- Always open the project folder, not a single file. Watch the dot on the tab: it means unsaved changes.
- File extensions such as `.html` decide how a file is treated, so make your operating system show them.
- Emmet expands `!` into the boilerplate of a page, and Live Server reloads the browser on every save.
- IntelliSense, squiggles, Format Document, search and the Command Palette save time and prevent mistakes.
- Install few extensions, and check the publisher, the installs and the ratings first.
- The integrated terminal opens in the project folder. Settings are stored as plain text in `settings.json`.

### Key terms

| Term | Plain-language meaning |
|------|------------------------|
| Plain text | A file that holds only characters, with no formatting |
| Code editor | A fast editor that understands code (VS Code) |
| IDE | An editor bundled with heavy tools such as a debugger |
| Workspace Trust | The question whether VS Code may run things from a folder |
| Activity Bar / Side Bar | The icon strip on the left / the view it opens |
| Explorer | The view that lists the files of the open folder |
| Panel | The area below the editor: Terminal, Problems, Output |
| Status Bar | The bottom line with facts about the current file |
| File extension | The ending of a file name, such as `.html` |
| Emmet | Short abbreviations that expand into HTML |
| Boilerplate | Standard starting code that every file of a kind needs |
| IntelliSense | Autocomplete with short explanations |
| Squiggle | The wavy underline that marks an error or a warning |
| Command Palette | The search box for every command in VS Code |
| Extension (VS Code) | An add-on installed from the Marketplace |
| Live Server / auto-reload | A local server that refreshes the page when you save |
| Integrated terminal | The command window built into VS Code |
| settings.json | The plain text file that stores your settings |

**Next topic:** HTML Basics. Keep the `my-first-site` folder: you will open the same `index.html` and learn what every line of it means.
