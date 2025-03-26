import {
    APIGatewayProxyEventV2,
    Handler
} from "aws-lambda";
import axios from "axios";
import { and, eq } from "drizzle-orm";
import { login } from './login'
const { authenticator } = require('otplib');
const chromium = require('chrome-aws-lambda');
import puppeteer from "puppeteer-core";
import path from "path";
import { createSuccessResponse } from "../../../utils/responses";
const csvParser = require('csv-parser');
const fs = require('fs');
import { parse, isAfter, formatISO, format, isEqual } from "date-fns";
import { toZonedTime } from "date-fns-tz";




const tempDir = path.join(__dirname, 'temp');
const chromePath = path.join(process.cwd(), 'chrome/win64-129.0.6668.100/chrome-win64/chrome.exe');
const downloadPath = path.resolve(__dirname, 'downloads'); // Change to your preferred download directory



const email = "amazonninja04@gmail.com"
const password = "alphabet"


const handler: Handler = async (event: APIGatewayProxyEventV2): Promise<any> => {
    const { account_name, location_name, page_no, search } = JSON.parse(event.body || '');

    const data = await getSupportCases(account_name, location_name, page_no, search);
    console.log(data[data.length - 1].caseContent.length)
    return createSuccessResponse(200, "success", data)
};


async function getSupportCases(accountName, locationName, pageNo, search) {
    try {



        let browser: any = ''
        console.log("browser start")
        try {

            // browser = await chromium.puppeteer.launch({
            //     ignoreDefaultArgs: ['--disable-extensions'],
            //     args: chromium.args,
            //     defaultViewport: chromium.defaultViewport,
            //     executablePath: await chromium.executablePath,
            //     headless: chromium.headless,
            //     ignoreHTTPSErrors: true,
            // });


            // Launch the browser and open a new blank page
            //  browser = await puppeteer.launch({
            //     ignoreDefaultArgs: ['--disable-extensions',
            //         // '--disable-dev-shm-usage',
            //     ],
            //     args: chromium.args,
            //     executablePath: process.env.CHROME_EXECUTABLE_PATH || await chromium.executablePath(),
            //     headless: true,
            //     userDataDir: tempDir,
            //     slowMo: 100
            //     // ignoreHTTPSErrors: true,
            //   });

            // Launch the browser and open a new blank page
            const browser = await puppeteer.launch({
                headless: false,
                executablePath: chromePath,
                userDataDir: `/tmp/random-profile-${Date.now()}`, // New session every time
                // args:[`--proxy-server=${newProxyUrl}`],
                // slowMo: 10
            });
            const context = await browser.createIncognitoBrowserContext(); // Create a new incognito session
            const page: any = await browser.newPage();



            await page.goto('https://sellercentral.amazon.com/cu/case-lobby?ref_=xx_case_dnav_xx');
            console.log("login start")
            //login
            await login(email, password, page)

            //select account
            const accountSelected = await selectAccount(accountName, locationName, page)
            console.log("accountSelected///")
            if (accountSelected) {

                await page.waitForSelector('kat-dropdown', { visible: true });

                // Select "50" from the dropdown
                await page.evaluate(() => {
                    let dropdown: any = document.querySelector('kat-dropdown');
                    let shadowRoot: any = dropdown.shadowRoot;
                    let option: any = shadowRoot.querySelector('kat-option[value="50"]'); // Adjust if needed
                    if (option) {
                        option.click();
                    }
                });

                await page.waitForTimeout(5000);

                if (search) {
                    console.log("search///")
                    console.log(search)
                    await page.waitForSelector('kat-input[type="search"]');
                    await page.click('kat-input[type="search"]');
                    await page.keyboard.type(search.toString());
                }

                if (pageNo) {
                    await page.waitForSelector('kat-input[type="number"]');
                    await page.click('kat-input[type="number"]');
                    await page.keyboard.type(pageNo.toString());
                }

                // Wait for a short delay to ensure changes are registered
                await page.waitForTimeout(1000);

                await page.waitForSelector('kat-button[label="Go"]');

                const buttons = await page.$$('kat-button[label="Go"]'); // Get all matching buttons
                if (buttons.length > 1) {
                    await buttons[1].click(); // Click the second button (index starts from 0)
                }

                await page.waitForTimeout(5000);


                // return []


                await page.waitForSelector('kat-data-table table');

                const data: any = [];
                let shouldContinue = true;
                let currentPage = 1;

                // Extract table data

                // Extract data from the page
                const pageData = await page.evaluate(() => {
                    const rows = document.querySelectorAll('kat-data-table table tbody tr');
                    const extractedData: any = [];

                    for (const row of rows) {
                        const cells: any = row.querySelectorAll('td');
                        const creationDateText = cells[0].innerText.trim();
                        const creationDate = new Date(creationDateText);

                        extractedData.push({
                            creationDate: creationDateText,
                            caseId: cells[1].innerText.trim(),
                            status: cells[2].innerText.trim(),
                            primaryEmail: cells[3].innerText.trim(),
                            subject: cells[4].innerText.trim(),
                            viewCaseLink: cells[5].querySelector('a')?.href || null,
                        });
                    }

                    return extractedData;
                });

                console.log(pageData)


                // Check if we should stop pagination
                for (const row of pageData) {
                    // Parse the given date string explicitly

                    if (row.viewCaseLink) {
                        const casePage = await page.browser().newPage(); // Open a new tab

                        await casePage.goto(row.viewCaseLink, { waitUntil: "domcontentloaded" });
                        let caseContent: any = [];

                        try {
                            while (true) {
                                //click on all see more


                                // Wait for the parent div
                                const selector = "div#correspondence";
                                await casePage.waitForSelector(selector, { timeout: 5000 });

                                // Extract content from the current page
                                const content = await casePage.evaluate((selector) => {
                                    const element = document.querySelector(selector);
                                    const seeMoreElement: any = document.querySelector(`${selector} .contact-content span`);

                                    const mainText = element ? element.innerText.trim() : "No details found";
                                    const seeMoreText = seeMoreElement ? seeMoreElement.textContent.trim() : "";

                                    return mainText + (seeMoreText ? `\n${seeMoreText}` : "");
                                }, selector);

                                // Store content for this page separately
                                caseContent.push(content);

                                console.log(`Page ${caseContent.length} Content:`, content);

                                // Check if the "Next Page" button is present and enabled
                                const isNextPageAvailable = await casePage.evaluate(() => {
                                    const nextPageButton = document.querySelector('kat-button[type="button"]:not([disabled]) kat-icon[name="chevron-right"]');
                                    return nextPageButton !== null;
                                });

                                if (!isNextPageAvailable) break; // Exit loop if no next page

                                // Click the next page button
                                await casePage.click('kat-button[type="button"]:not([disabled]) kat-icon[name="chevron-right"]');

                                // Wait for the new page to load
                                await casePage.waitForTimeout(2000); // Adjust delay if needed
                            }
                        } catch (error) {
                            console.error("Error scraping pages:", error);
                        }

                        row.caseContent = caseContent; // Store extracted content
                        await casePage.close(); // Close the new tab
                    }


                    data.push(row);
                }


                return data
            }
            console.log(accountSelected)

            console.log("browser closing")
            await browser.close();

        } catch (error) {
            console.error(error);
            // await browser.close();
            process.exit(1);
        }



    } catch (err) {
        console.log(err);
    }
}

async function selectAccount(accountName, locationName, page) {
    const xpath = `//span[contains(text(), '${accountName}')]`;
    // Wait for the element to appear before selecting it
    await page.waitForXPath(xpath, { timeout: 10000 }); // Waits up to 10 seconds
    const [element] = await page.$x(xpath);

    if (element) {
        await element.click();
        console.log(`Clicked on '${accountName}'`);


    } else {
        console.log(`Element with text '${accountName}' not found`);
        return false;
    }

    // Locate the account div that contains the specified account name
    const accountXPath = `//div[contains(@class, 'full-page-account-switcher-account')]//span[contains(text(), '${accountName}')]`;

    const [accountElement] = await page.$x(accountXPath);

    if (accountElement) {
        // Navigate to the parent div that contains all locations for this account
        const accountParent = await accountElement.evaluateHandle(el => el.closest('.full-page-account-switcher-account'));

        // Now, find the specific location inside the account div
        const locationXPath = `.//span[contains(text(), '${locationName}')]`;
        await page.waitForXPath(locationXPath, { timeout: 10000 });
        const [locationElement] = await accountParent.$x(locationXPath);

        if (locationElement) {
            await locationElement.click();
            console.log(`Clicked on location: '${locationName}' under account: '${accountName}'`);

            await Promise.all([
                page.waitForNavigation(), // The promise resolves after navigation has finished
                await page.click(".kat-button--primary")
            ]);

            return true;


        } else {
            console.log(`Location '${locationName}' not found under account: '${accountName}'`);
            return false;
        }
    } else {
        console.log(`Account '${accountName}' not found`);
        return false;
    }
}

export { handler }
