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


const tempDir = path.join(__dirname, 'temp');
const chromePath = path.join(process.cwd(), 'chrome/win64-129.0.6668.100/chrome-win64/chrome.exe');
const downloadPath = path.resolve(__dirname, 'downloads'); // Change to your preferred download directory



const email = "amazonninja04@gmail.com"
const password = "alphabet"


const handler: Handler = async (event: APIGatewayProxyEventV2): Promise<any> => {
    const { account_name, location_name, start_date, end_date } = JSON.parse(event.body || '');

    const data = await getSupportCases(account_name, location_name, start_date, end_date);
    console.log(data[0])
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
                slowMo: 100
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

                // Extract table data
                const tableData = await page.evaluate((startDate) => {
                    const rows = document.querySelectorAll('kat-data-table table tbody tr');
                    const data: any = [];

                    for (const row of rows) {
                        const cells: any = row.querySelectorAll('td');
                        const creationDate = new Date(cells[0].innerText.trim());
                
                        if (creationDate < new Date(startDate)) {
                            break;
                        }
                
                        const rowData: any = {
                            creationDate: cells[0].innerText.trim(),
                            caseId: cells[1].innerText.trim(),
                            status: cells[2].innerText.trim(),
                            primaryEmail: cells[3].innerText.trim(),
                            shortDescription: cells[4].innerText.trim(),
                            viewCaseLink: cells[5].querySelector('a').href
                        };
                
                        data.push(rowData);
                    }
                    return data;
                }, startDate);

                return tableData
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
