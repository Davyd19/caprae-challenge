# Developer Intern Challenge Project - Caprae Capital

## Project Description
This project is an enhancement of the saasquatchleads.com lead generation tool, as part of the Developer Intern challenge at Caprae Capital. The main objective is to transform the existing tool into a more advanced solution by automating the scraping process, enriching the obtained data, and presenting it in a professional and modern user interface.

This application was built to demonstrate the ability to reverse-engineer a website's workflow, overcome technical challenges such as anti-bot mechanisms, and ultimately, deliver a reliable and functional solution for a demo.

## Key Features
This application has several key features designed to enhance the lead generation process:

1. Professional User Interface: The UI is completely redesigned with a modern and clean dark theme, inspired by the reference site, to provide a better user experience.

2. Advanced Scraper with Stealth Mode: Utilizes puppeteer-extra with a stealth plugin to mimic human user behavior, designed to bypass basic anti-scraping mechanisms.

3. Automated Login Logic: The script automatically navigates to the login page, enters credentials, and manages the session to access protected internal pages.

4. Dynamic Page Interaction: Capable of handling dynamic autocomplete inputs, where the script types, waits for suggestions to appear, and selects the relevant option.

5. Intelligent Dummy Data Fallback Feature: If the live scraping process fails for any reason (e.g., CAPTCHA, UI changes, or IP blocking), the application will automatically switch to serving relevant, high-quality dummy data. This ensures the application is always functional during a demo.

6. Company Details Pop-up: Users can click any row in the results table to open a pop-up modal that displays more detailed company information, such as a description, employee count, founding year, and contact details.

## Technical Journey & Solutions
The development process faced a primary challenge in scraping saasquatchleads.com, which is a well-protected, modern Single Page Application (SPA).

1. Login Challenge: It was discovered that the scraper page was only accessible after a user logs in. The solution was to implement an automated login flow.

2. Anti-Scraping Issues: Even after a successful login, the script still failed to find the form elements. This indicated an anti-bot mechanism detecting Puppeteer. The solution was to switch from standard Puppeteer to puppeteer-extra with puppeteer-extra-plugin-stealth.

3. Strategic Decision (Fallback System): Acknowledging that the target site is heavily protected and could implement CAPTCHAs or IP blocks that are difficult to overcome in a short time, a strategic decision was made to build a fallback system. The live scraping logic remains, but if it fails, the application serves rich dummy data. This guarantees a smooth demo while still showcasing the ability to build complex scraping logic.

## Technology Stack
**Backend:** Node.js, Express.js

**Frontend:** EJS (Embedded JavaScript templates), Tailwind CSS

**Web Scraping:** Puppeteer, Puppeteer-Extra, Puppeteer-Extra-Plugin-Stealth

**Development Environment:** Node.js, NPM

## How to Run the Project
1. **Clone this repository.**

2. **Open a terminal in the project folder.**

3. **Install all required packages:**
```bash
npm install
```

4. **Run the application server:**
```bash
node app.js
```
5. **Open your browser** and navigate to 'http://localhost:3000'.
