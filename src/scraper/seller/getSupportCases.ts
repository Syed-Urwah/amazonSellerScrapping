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
    const { account_name, location_name, start_date, end_date } = JSON.parse(event.body || '');

    const data = await getSupportCases(account_name, location_name, start_date, end_date);
    console.log(data[data.length - 1])
    return createSuccessResponse(200, "success", data)
};


async function getSupportCases(accountName, locationName, startDate, endDate) {
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
                slowMo: 10
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

                //handleSkip
                // const skipButtonXPath = `//button[@data-test-id='button-skip' and @data-action='skip']`;
                // // Wait for the button to appear (max 10 seconds)
                // await page.waitForXPath(skipButtonXPath, { timeout: 10000 });

                // // Select the button
                // const [skipButton] = await page.$x(skipButtonXPath);

                // if (skipButton) {
                //     await skipButton.click();
                //     console.log("Clicked on 'Skip' button");
                // } else {
                //     console.log("Skip button not found");
                // }

                //Creating Report
                // await createReport(page, startDate, endDate)
                // Wait for the table to load
                await page.waitForSelector('kat-data-table table');

                const data: any = [];
                let shouldContinue = true;
                let currentPage = 1;

                // Extract table data
                while (shouldContinue) {
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
                                shortDescription: cells[4].innerText.trim(),
                                viewCaseLink: cells[5].querySelector('a')?.href || null,
                            });
                        }

                        return extractedData;
                    });

                    console.log(pageData)


                    // Check if we should stop pagination
                    for (const row of pageData) {
                        // Parse the given date string explicitly
                        // let creationDateParsed: any = new Date(row.creationDate)
                        // // const adjustedDate = new Date(Date.UTC(2025, 2, 22, 19, 0, 0));
                        // creationDateParsed.setUTCHours(19, 0, 0, 0);
                        // creationDateParsed = creationDateParsed.toISOString()

                        const creationDateParsed = parseCustomDate(row.creationDate);


                        let startDateParsed = parse(startDate, "MM/dd/yyyy", new Date());
                        console.log({
                            startDateParsed,
                            creationDateParsed
                        })
                        // Compare using date-fns isAfter function
                        console.log(isAfter(creationDateParsed, startDateParsed));
                        if (!isAfter(creationDateParsed, startDateParsed) || isEqual(creationDateParsed, startDateParsed)) {
                            shouldContinue = false;
                            break;
                        }
                        if (row.viewCaseLink) {
                            const casePage = await page.browser().newPage(); // Open a new tab

                            await casePage.goto(row.viewCaseLink, { waitUntil: "domcontentloaded" });
                            let caseContent;
                            try {
                                await casePage.waitForSelector("kat-expander.contact-expander", { timeout: 5000 });
                                caseContent = await casePage.evaluate(() => {
                                    const expander: any = document.querySelector("kat-expander.contact-expander");
                                    return expander ? expander.innerText.trim() : "No details found";
                                });
                            } catch (error) {
                                // If `kat-expander` is not found, check for `div.button-hmd`
                                try {
                                    await casePage.waitForSelector("div.button-hmd", { timeout: 5000 });
                                    caseContent = await casePage.evaluate(() => {
                                        const buttonDiv: any = document.querySelector("div.button-hmd");
                                        return buttonDiv ? buttonDiv.innerText.trim() : "No details found";
                                    });
                                } catch (error) {
                                    caseContent = "No details found";
                                }
                            }

                            row.caseContent = caseContent; // Store extracted content
                            await casePage.close(); // Close the new tab
                        }


                        data.push(row);
                    }

                    if (shouldContinue) {
                        currentPage++; // Move to the next page

                        // const paginationKatInput = await page.$$('kat-input[type="number"]')
                        // paginationKatInput[0].click()

                        // if (paginationKatInput.length > 0) {
                        //     await page.evaluate((katInput, newValue) => {
                        //         const input = katInput.shadowRoot?.querySelector('input'); // Get internal <input>
                        //         if (input) {
                        //             input.value = newValue; // Set new value
                        //             input.dispatchEvent(new Event("input", { bubbles: true })); // Trigger change event
                        //         }
                        //     }, paginationKatInput[0], currentPage); // Change value to "5"
                        // } else {
                        //     console.error("❌ kat-input not found!");
                        // }

                        // const paginationInput = await page.waitForSelector('input[type="number"]');
                        // await paginationInput.type(currentPage, {delay: 100})



                        // Wait for the kat-input element with the specific unique-id
                        // const inputHandles = await page.evaluateHandle(() => {
                        //     const katInputs = document.querySelectorAll("kat-input[type='number']");
                        //     return [
                        //         katInputs[0]?.shadowRoot?.querySelector("input") || null, // First input
                        //         katInputs[1]?.shadowRoot?.querySelector("input") || null  // Second input
                        //     ];
                        // });

                        // // Select the correct input handle (0 for first, 1 for second)
                        // const inputHandle = (await inputHandles.getProperties()).get(0); // Change to 0 for first

                        // if (inputHandle) {
                        //     await inputHandle.type(currentPage, { delay: 100 });
                        // } else {
                        //     console.error("❌ Input field not found inside kat-input!");
                        // }                 
                        // await page.type("#katal-id-7", currentPage.toString(), { delay: 100 });

                        // Click the "Go" button
                        // const button = await page.$x("//kat-button[@label='Go']");
                        // if (button) {
                        //     await button[1].click();
                        //     console.log(`Navigated to page ${currentPage}`);
                        // } else {
                        //     console.log("Pagination button not found!");
                        //     break; // Exit if button is not found
                        // }

                        // Find the next button inside the shadow DOM and click it
                        const nextButton = await page.evaluateHandle(() => {
                            const pagination = document.querySelector("kat-pagination");
                            return pagination?.shadowRoot?.querySelector("kat-icon[name='chevron-right']");
                        });

                        if (nextButton) {
                            await nextButton.click();
                            console.log("✅ Clicked next pagination button!");
                        } else {
                            console.error("❌ Next button not found inside kat-pagination shadow DOM!");
                        }

                        // Wait for new data to load
                        await page.waitForTimeout(3000);
                    }
                }

                return data
                // const csvFilePath = await downloadReport(page, browser)

                // const jsonData = await parseCSVWithOffsetHeaders(csvFilePath)

                // return jsonData
            }
            console.log(accountSelected)

            // console.log("browser closing")
            // await browser.close();

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

function deleteAllFiles(directory) {
    if (!fs.existsSync(directory)) {
        console.log("Download folder does not exist.");
        return;
    }

    fs.readdir(directory, (err, files) => {
        if (err) {
            console.error("Error reading directory:", err);
            return;
        }

        files.forEach(file => {
            const filePath = path.join(directory, file);
            fs.unlink(filePath, err => {
                if (err) {
                    console.error(`Error deleting file ${file}:`, err);
                } else {
                    console.log(`Deleted: ${file}`);
                }
            });
        });
    });
}

function parseCustomDate(dateStr) {
    // Extract values from the string
    const regex = /(\w+) (\d+), (\d+) at (\d+):(\d+):(\d+) (\w+) GMT([+-]\d+)/;
    const match = dateStr.match(regex);

    if (!match) {
        throw new Error("Invalid date format");
    }

    const [_, monthStr, day, year, hour, minute, second, period, offset] = match;

    // Convert month name to month index (0-based)
    const monthIndex = new Date(`${monthStr} 1, ${year}`).getMonth();

    // Convert 12-hour format to 24-hour format
    let hour24 = parseInt(hour, 10);
    if (period === "PM" && hour24 !== 12) hour24 += 12;
    if (period === "AM" && hour24 === 12) hour24 = 0;

    // Create a date object in local time
    const date = new Date(Date.UTC(year, monthIndex, day, hour24 - parseInt(offset, 10), minute, second));

    // Adjust time to 19:00:00 UTC
    date.setUTCHours(19, 0, 0, 0);

    return date.toISOString();
}

function isSecondDateGreater(mmddyyyy, formattedDate) {
    // Convert mm,dd,yyyy to a Date object
    let [mm, dd, yyyy] = mmddyyyy.split('/').map(num => parseInt(num, 10));
    let firstDate = new Date(yyyy, mm - 1, dd); // Month is 0-based in JS Date

    // Convert "March 19, 2025 at 07:17:06 PM GMT+5" to Date
    let secondDate = new Date(formattedDate);

    // Compare dates
    return secondDate > firstDate;
}

async function parseCSVWithOffsetHeaders(filePath, headerRowIndex = 8, dataStartRowIndex = 9) {
    // Create a readable stream from the CSV file
    const fileStream = fs.createReadStream(filePath);

    // Store all rows from the CSV
    const allRows: any = [];

    // Parse the CSV file to get all rows
    await new Promise((resolve, reject) => {
        fileStream
            .pipe(csvParser({ headers: false })) // Don't use the first row as headers
            .on('data', (row: any) => {
                allRows.push(Object.values(row));
            })
            .on('end', resolve)
            .on('error', reject);
    });

    // Extract headers from the specified row
    const headers: any = allRows[headerRowIndex - 1];

    // Process data rows and create JSON objects
    const jsonData: any = [];
    for (let i = dataStartRowIndex - 1; i < allRows.length; i++) {
        const row: any = allRows[i];

        // Create an object using headers as keys
        const entry: any = {};
        headers.forEach((header, index) => {
            // Make sure not to exceed the row length
            if (index < row.length) {
                entry[header.trim()] = row[index].trim();
            }
        });

        jsonData.push(entry);
    }

    return jsonData;
}

async function createReport(page, startDate, endDate) {
    // Wait for the input field and type the date
    //startDate
    await page.waitForSelector('kat-date-picker[name="startDate"]');
    await page.click('kat-date-picker[name="startDate"]'); // Open date picker
    await page.waitForSelector('input[name="startDate"]');
    await page.type('input[name="startDate"]', startDate, { delay: 100 });

    // await page.keyboard.type('12/31/2025'); // Type date
    await page.keyboard.press('Enter'); // Confirm

    //endDate
    await page.waitForSelector('kat-date-picker[name="endDate"]');
    await page.click('kat-date-picker[name="endDate"]'); // Open date picker
    await page.waitForSelector('input[name="endDate"]');
    await page.type('input[name="endDate"]', endDate, { delay: 100 });
    await page.keyboard.press('Enter'); // Confirm


    //click Request Report
    await page.evaluate(() => {
        const btn: any = document.getElementById('filter-generate-button');
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    });
}

async function downloadReport(page, browser) {
    let downloadClicked = false;
    let filesBefore: any = []

    // Set download behavior
    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: downloadPath, // Set custom download path
    });

    while (!downloadClicked) {
        // Click the Refresh button inside the first row
        const refreshButton = await page.$(
            "kat-table-body kat-table-row:first-child kat-button[label='Refresh']"
        );

        if (refreshButton) {
            console.log('Clicking Refresh...');
            await refreshButton.click();
        } else {
            console.log('Refresh button not found, waiting...');
        }

        // Wait a few seconds before checking again
        await page.waitForTimeout(5000); // Adjust time as needed

        // Get the list of files in the download directory BEFORE downloading
        // Ensure the directory exists before scanning it
        if (!fs.existsSync(downloadPath)) {
            fs.mkdirSync(downloadPath, { recursive: true });
        }
        await deleteAllFiles(downloadPath)
        filesBefore = new Set(fs.readdirSync(downloadPath));

        // Check if the Download CSV button is available
        const downloadButton = await page.$(
            "kat-table-body kat-table-row:first-child kat-button[label='Download CSV']"
        );

        if (downloadButton) {
            console.log('Download CSV button found, clicking...');
            await downloadButton.click();
            downloadClicked = true; // Stop loop after clicking
        } else {
            console.log('Download CSV button not found, refreshing again...');
        }
    }

    console.log('Download process completed.');

    // Optional: Wait for some time before closing
    // Wait for the file to be downloaded
    await page.waitForTimeout(10000); // Adjust if needed

    // Get the list of files in the download directory AFTER downloading
    const filesAfter = new Set(fs.readdirSync(downloadPath));

    // Find the new file
    const newFiles = [...filesAfter].filter(file => !filesBefore.has(file));

    if (newFiles.length === 0) {
        console.error('No new file detected.');
        await browser.close();
        return;
    }

    // Assuming the first detected new file is the correct one
    const csvFile: any = newFiles[0];
    const csvFilePath = path.join(downloadPath, csvFile);

    console.log(`Downloaded file detected: ${csvFile}`);

    // Process the CSV file
    // let jsonData: any = [];
    let rowIndex = 0;
    let headers: any = [];

    // const jsonData = await parseCSVWithOffsetHeaders(csvFilePath)
    return csvFilePath;
}


export { handler }
