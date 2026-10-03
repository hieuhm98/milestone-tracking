# Security Basics

## 1. Why Does Security Matter?

A security vulnerability can lead to: leaked user data, financial loss, damaged reputation, and legal violations. BAs/PMs need a basic understanding to write correct security requirements and assess risk.

A **vulnerability** is a weak spot — like a window that does not lock properly. Burglars do not need to break down the door if one window is open.

Two facts surprise most beginners:

- **Attacks are mostly automated.** Criminals run programs that try millions of passwords, websites and phone numbers every day. You do not have to be famous or rich to be a target — you only have to be reachable.
- **People are the easiest door.** Many break-ins do not "hack" anything. They simply trick a person into typing a password or reading out a one-time code.

So security has two halves, and this lesson covers both: how **systems** are protected (what developers and BAs care about), and how **you** stay safe every day (passwords, scams, Wi-Fi, updates).

---

## 2. Authentication vs Authorization

These are two concepts that are often confused:

| | Authentication | Authorization |
|--|--------------------------|---------------------------|
| **Question** | Who are you? | What are you allowed to do? |
| **Example** | Logging in with a password | An admin sees everything; a user only sees their own data |
| **When** | First | After authentication |

**Analogy — a hotel:** at reception you show your ID card; that is **authentication** (proving who you are). You receive a key card that opens room 504 and the gym, but not room 505 or the staff office; that is **authorization** (what you are allowed to do).

**Real-world example**: You log in to Shopee (authentication) → you can only view your own orders, not other people's (authorization).

Ways to prove who you are fall into three kinds, called **factors**:

| Factor | Plain meaning | Examples |
|--------|---------------|----------|
| Something you **know** | A secret in your head | Password, PIN |
| Something you **have** | An object you carry | Phone receiving a code, bank card |
| Something you **are** | Your body | Fingerprint, Face ID |

> **Common misconception:** "If I can log in, I can do anything." No — logging in only answers *who* you are. A user who logs in successfully but still gets "Access denied" on a page has an **authorization** issue, not a login issue.

---

## 3. Common Threats

Some attacks target the **system**; others target the **person**. The first three below are mistakes developers must prevent; phishing targets you directly.

### SQL Injection
A **database** stores the app's data; programs talk to it in a language called **SQL**. An attacker inputs SQL code into a form to tamper with the database:

```sql
-- Login form input: ' OR '1'='1
SELECT * FROM users WHERE username='' OR '1'='1' AND password=''
-- Result: returns ALL users → bypasses the password!
```

Analogy: a bank form says "Pay to: ____". A fraudster writes "Me, and also empty the vault" and a careless clerk follows the whole line as an instruction. The fix is to treat what users type strictly as *data*, never as *instructions*.

**Prevention**: use Prepared Statements; never concatenate strings directly into SQL.

### XSS (Cross-Site Scripting)
An attacker injects malicious JavaScript into a web page, which runs in the victim's browser to steal cookies/sessions.

Example: a comment box accepts code instead of plain text. Every visitor who views that comment runs the attacker's code. A **cookie / session** is what keeps you logged in, so stealing it is like stealing your hotel key card.

**Prevention**: escape output, Content Security Policy (CSP). "Escape" means showing anything users type as harmless text.

### CSRF (Cross-Site Request Forgery)
Tricks a user into performing an unwanted action on a website where they are logged in.

Example: you are logged in to your bank in one tab, then open a booby-trapped page in another tab that silently sends "transfer money" to the bank using your login.

**Prevention**: CSRF token, SameSite cookie.

### Phishing
Impersonating a legitimate email/website to trick users into entering their information.

**Prevention**: check the URL, don't click suspicious links, use 2FA. Because phishing is the threat you will personally meet most, the next section is all about it.

---

## 4. Phishing and Scams in Real Life

"Phishing" sounds like "fishing": the scammer throws out bait and waits for someone to bite. It arrives by email, SMS, Zalo/Messenger, phone calls and fake websites.

### Typical examples

- **Fake bank SMS:** *"Your account will be locked in 24 hours. Verify at bank-secure-verify.xyz"* — the link leads to a copy of the bank's login page.
- **Fake delivery:** *"Your parcel is on hold, pay a 15,000đ fee here"* — the page asks for your card number.
- **Fake boss email:** *"I'm in a meeting, buy 5 gift cards urgently and send me the codes."*
- **Fake support call:** *"This is the bank. We sent you a code to cancel a suspicious payment, please read it to me."* That code is actually what authorises the payment.

### Red flags

1. **Urgency or fear:** "within 24 hours", "account locked", "police case".
2. **A link or attachment** you did not expect.
3. **A web address that is almost right:** `faceb00k.com`, `mybank.com.secure-login.xyz`. Read the address from the end: the real site name is the part just before `.com`, `.vn`, etc.
4. **A request for secrets:** password, OTP code, full card number. Real banks never ask for an OTP by phone, SMS or chat.

### What to do

- Do not click. Open the official app, or type the address yourself.
- Call the organisation back on the number printed on your card or its official website — never the number in the message.
- At work, report it to IT. If you already typed a password, change it immediately and tell IT; if you gave card details, call your bank to block the card.

> **Real work example:** an email "from the director" asks the accountant to change a supplier's bank account before today's payment. A call to the director's known number reveals the scam — many companies make that call-back mandatory.

---

## 5. HTTPS and Encryption

- **HTTPS** encrypts transmitted data — eavesdroppers can't read it.
- A **TLS certificate** confirms the website is genuine (not a fake).
- All websites handling sensitive data **must use HTTPS**.

**Encryption** scrambles a message so only the intended receiver can unscramble it. Analogy: sending a postcard (HTTP — every postman can read it) versus a locked box only the shop can open (HTTPS). Data travels through many machines — your Wi-Fi router, your internet provider and more — so without encryption any of them could read it.

**What the padlock means — and does not mean:** the padlock (or site-information icon) next to the address only says *the connection to this address is encrypted*. It does **not** say the site is honest. Scammers can get a certificate for `bank-secure-verify.xyz` too. Always check the address itself.

> **Try it yourself:** on any `https://` site, click the icon at the left of the address bar. You should see "Connection is secure" and can view the certificate and who issued it.

### Public Wi-Fi

Café and airport Wi-Fi is shared with strangers. HTTPS encrypts most traffic, but a fake hotspot with a convincing name ("Airport_Free_WiFi") is still a risk. Sensible habits:

- Ask staff for the exact network name.
- Use your mobile data or phone hotspot for banking and work systems.
- Use the company **VPN** (a tool that sends all your traffic through an encrypted tunnel) if your company provides one.

---

## 6. Password Security

**Never store passwords in plain text** — they must be hashed:

```text
Password: "mypassword123"
After bcrypt hashing: "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/L..."
```

**Hashing** is a one-way scramble: easy to turn the password into the code, practically impossible to turn the code back. Analogy: you can turn a fruit into a smoothie, but not the smoothie back into the fruit. At login the system hashes what you typed and compares the two codes. That is also why a well-built site can only *reset* your password, never send it to you.

**Best practices for users:**
- Long passwords (≥12 characters), complex.
- Don't reuse the same password across multiple accounts.
- Use a Password Manager (1Password, Bitwarden).
- Enable **2FA (Two-Factor Authentication)**.

### Why each rule matters

- **Length beats tricks.** `P@ssw0rd!` is short and is one of the first guesses attackers try. A **passphrase** of four random words — `lamp-river-mango-seven` — is longer, stronger and easier to remember.
- **Reuse is the biggest danger.** When some website is hacked, criminals try the leaked email + password on email, banking and social apps. One leak then opens everything. This is called **credential stuffing**.
- **A password manager** is an app that remembers a different strong password for every site, protected by one master password. It also fills in passwords only on the real site address, which helps against phishing pages.

> **Try it yourself:** visit `https://haveibeenpwned.com` and enter your email address. It lists known data breaches that included your email. If any appear, change the password for that site and anywhere you reused it.

---

## 7. 2FA (Two-Factor Authentication)

2FA requires **two pieces of evidence** to log in:
1. Something you **know**: a password.
2. Something you **have**: an OTP from an app (Google Authenticator) or SMS.

Even if the password is leaked, without the OTP → you can't log in.

An **OTP** (one-time password) is a short code, usually 6 digits, that works once and expires within minutes. Analogy: a building needs both your key *and* a code that changes every 30 seconds. A thief with a copy of your key still cannot get in.

| Second factor | How it works | Strength |
|---------------|--------------|----------|
| SMS code | Code sent by text message | Better than nothing; a SIM can be hijacked |
| Authenticator app | Code generated on your phone | Stronger; works offline |
| Passkey / security key | Phone or USB key confirms with fingerprint or PIN | Strongest; resists phishing |

The golden rule: **an OTP is for typing into the real site yourself, never for telling anyone.** If someone asks you for it — even "the bank" — it is a scam.

Turn on 2FA first for your **email** (it can reset every other password), then banking, then social media. Usually it is under *Settings → Security*.

---

## 8. Everyday Safety Habits

Most protection comes from a few boring habits.

- **Install updates promptly.** Updates fix security holes that are already publicly known — attackers actively look for devices that have not patched them. Windows: *Settings → Windows Update*; macOS: *System Settings → General → Software Update*; phones: *Settings → Software update*. Turn on automatic updates.
- **Install apps only from official stores** (App Store, Google Play, Microsoft Store) or the vendor's own website. "Cracked" software is a favourite hiding place for malware.
- **Lock your screen.** Use a PIN or fingerprint on your phone; on a work laptop press `Win + L` (Windows) or `Ctrl + Cmd + Q` (macOS) when you walk away.
- **Back up important files** to the cloud or an external drive. **Ransomware** — malware that locks your files and demands payment — is far less scary if you have a copy.
- **Think before you share.** Do not post photos of your ID card, boarding passes or work screens showing customer data.

> **Common misconception:** "I have antivirus, so I'm safe." Antivirus helps, but it cannot stop you from typing your password into a fake page or reading an OTP to a scammer. Habits matter more than tools.

---

## 9. The Principle of Least Privilege

Grant only the **minimum privileges necessary** to do the job:
- Developers don't need access to the production database.
- Regular users don't need permission to delete other people's data.
- Service A doesn't need permission to read the entire database.

Analogy: a hotel cleaner's key card opens the rooms on their floor, during their shift — not the safe, not the manager's office. If the card is lost, the damage is limited.

**Production** means the live system with real customers. Keeping developers out of it is not about distrust: if a developer's laptop or account is compromised, the attacker still cannot reach real user data. Example: a warehouse clerk can view inventory but not payroll.

---

## 10. Security in a Project — The BA/PM Perspective

Security is cheapest when designed in from the start; bolting it on after launch can mean rebuilding. When writing requirements, consider:
- Which data is sensitive? (PII: name, email, national ID, phone number)
- Who can view/edit/delete which data? → clear authorization requirements.
- Do you need an audit log? (who did what, at what time)
- Do you need encryption of data at rest? (data stored in the database)

**PII** (Personally Identifiable Information) is any information that can identify a person. An **audit log** is a diary the system keeps: who did what, on which record, when. **At rest** means data sitting in storage, as opposed to **in transit** (travelling over the network, protected by HTTPS).

### Example: "Forgot password" requirements

A BA might write:

1. The reset link is sent only to the registered email.
2. The link expires after a short time (e.g. 15–30 minutes) and works only once.
3. The screen shows the same message whether or not the email exists ("If this email is registered, we have sent a link"), so attackers cannot test which emails have accounts.
4. After a reset, the user is logged out on other devices and receives a notification email.
5. The event is written to the audit log.

> **Real work example:** in a review, a tester notes: *"Changing the order id in the URL from 1001 to 1002 shows another customer's order."* This is an authorization bug — the system checks that you are logged in, but not that the order is yours. A clear requirement ("users can only view their own orders") makes it testable.

---

## 11. Summary

- **Authentication** = verifying identity ("Who are you?").
- **Authorization** = granting permissions ("What are you allowed to do?").
- **SQL Injection/XSS/CSRF**: the most common vulnerabilities.
- **Phishing** targets people: watch for urgency, odd links and requests for secrets; never share an OTP.
- **HTTPS**: mandatory for every website. The padlock means "encrypted", not "trustworthy".
- **Passwords**: long, unique per account, stored by a password manager; systems store only hashes.
- **2FA**: significantly increases account security.
- **Habits**: update promptly, official app stores, lock screens, back up.
- **Least Privilege**: grant only the minimum privileges necessary.
- **BAs** put security requirements in early: sensitive data, permissions, audit logs, expiry rules.

### Key terms

| Term | Plain-language meaning |
|------|------------------------|
| Authentication | Proving who you are |
| Authorization | What you are allowed to do once known |
| Phishing | A fake message or site that tricks you into giving secrets |
| HTTPS / encryption | Scrambling data in transit so only the receiver can read it |
| Hashing | One-way scrambling used to store passwords safely |
| 2FA / OTP | A second proof, often a short one-time code |
| Password manager | An app that keeps a unique strong password for every site |
| Least privilege | Give each person or system only the access it needs |
| PII | Information that can identify a person |
