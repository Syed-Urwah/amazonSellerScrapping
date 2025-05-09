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
import cloudinary from 'cloudinary';
var UserAgent = require('user-agents');
const randomUseragent = require('random-useragent');
const bigJson = require('big-json');



const tempDir = path.join(__dirname, 'temp');
const chromePath = path.join(process.cwd(), 'chrome/win64-129.0.6668.100/chrome-win64/chrome.exe');
const downloadPath = path.resolve(__dirname, 'downloads'); // Change to your preferred download directory



const email = "amazonninja04@gmail.com"
const password = "alphabet"

cloudinary.v2.config({
    cloud_name: 'dlsxiibfh',
    api_key: '516884773626555',
    api_secret: 'x7YbhERPhrgTD53KCjRMH262kT4'
});

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.75 Safari/537.36';


const handler: Handler = async (event: APIGatewayProxyEventV2): Promise<any> => {
    const { account_name, location_name, start_date, end_date } = JSON.parse(event.body || '');

    const data = await getReportDocument(account_name, location_name, start_date, end_date);
    console.log(data[0])
    const stringifyStream = bigJson.createStringifyStream({
        body: data,
    });
    // Capture stream output into a single string
    const chunks: Buffer[] = [];
    for await (const chunk of stringifyStream) {
      chunks.push(Buffer.from(chunk));
    }

    const jsonString = Buffer.concat(chunks).toString();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: jsonString,
    };
};


async function getReportDocument(accountName, locationName, startDate, endDate) {
    try {



        let browser: any = ''
        console.log("browser start")
        try {

            //Randomize User agent or Set a valid one
            // const userAgent = randomUseragent.getRandom();
            // const UA = userAgent || USER_AGENT;

            const browser = await puppeteer.launch({
                ignoreDefaultArgs: ['--disable-extensions'],
                args: [
                    ...chromium.args,
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-blink-features=AutomationControlled', // Hide automation
                ],
                defaultViewport: chromium.defaultViewport,
                executablePath: await chromium.executablePath || '/usr/bin/chromium-browser',
                headless: chromium.headless,
              });

            // browser = await chromium.puppeteer.launch({
            //     ignoreDefaultArgs: ['--disable-extensions'],
            //     args: [
            //         ...chromium.args,
            //         '--no-sandbox',
            //         '--disable-setuid-sandbox',
            //         '--disable-blink-features=AutomationControlled', // Hide automation
            //     ],
            //     defaultViewport: chromium.defaultViewport,
            //     executablePath: await chromium.executablePath,
            //     headless: chromium.headless,
            //     userDataDir: `/tmp/random-profile-${Date.now()}`, // New session every time
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
            // const browser = await puppeteer.launch({
            //     headless: false,
            //     executablePath: chromePath,
            //     userDataDir: `/tmp/random-profile-${Date.now()}`, // New session every time
            //     // args:[`--proxy-server=${newProxyUrl}`],
            //     slowMo: 100
            // });
            const context = await browser.createIncognitoBrowserContext(); // Create a new incognito session
            const page: any = await browser.newPage();
            const userAgent = new UserAgent({ deviceCategory: 'mobile' });

            await page.setUserAgent(userAgent.toString())
            // await page.setUserAgent(UA);
            await page.setViewport({ width: 1366, height: 768 }); 

            await page.goto('https://sellercentral.amazon.com/payments/reports-repository/ref=xx_rrepo_dnav_xx');
            console.log("login start")

            //login
            await login(email, password, page, cloudinary)

            //select account
            const accountSelected = await selectAccount(accountName, locationName, page)
            console.log("accountSelected///")
            if (accountSelected) {

                //handleSkip
                const skipButtonXPath = `//button[@data-test-id='button-skip' and @data-action='skip']`;
                // Wait for the button to appear (max 10 seconds)
                await page.waitForXPath(skipButtonXPath, { timeout: 10000 });

                // Select the button
                const [skipButton] = await page.$x(skipButtonXPath);

                if (skipButton) {
                    await skipButton.click();
                    console.log("Clicked on 'Skip' button");
                } else {
                    console.log("Skip button not found");
                }

                //Creating Report
                await createReport(page, startDate, endDate)

                const csvFilePath = await downloadReport(page, browser)

                const jsonData = await parseCSVWithOffsetHeaders(csvFilePath)

                console.log("browser closing")
                await browser.close();

                return jsonData
            }
            console.log(accountSelected)

            

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
    let filesBefore: any = [];

    const downloadPath = path.resolve('./src/downloads');
    // Set download behavior
    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: '/tmp', // AWS Lambda compatible path
    });

    while (!downloadClicked) {
        const refreshButton = await page.$(
            "kat-table-body kat-table-row:first-child kat-button[label='Refresh']"
        );

        if (refreshButton) {
            console.log('Clicking Refresh...');
            await refreshButton.click();
        } else {
            console.log('Refresh button not found, waiting...');
        }

        await page.waitForTimeout(5000);

        filesBefore = new Set(fs.readdirSync('/tmp'));

        const downloadButton = await page.$(
            "kat-table-body kat-table-row:first-child kat-button[label='Download CSV']"
        );

        if (downloadButton) {
            console.log('Download CSV button found, clicking...');
            await downloadButton.click();
            downloadClicked = true;
        } else {
            console.log('Download CSV button not found, refreshing again...');
        }
    }

    console.log('Download process completed.');

    await page.waitForTimeout(10000);

    const filesAfter = new Set(fs.readdirSync('/tmp'));
    const newFiles = [...filesAfter].filter(file => !filesBefore.has(file));

    if (newFiles.length === 0) {
        console.error('No new file detected.');
        await browser.close();
        return;
    }

    const csvFile: any = newFiles[0];
    const csvFilePath = path.join('/tmp', csvFile);
    console.log(`Downloaded file detected: ${csvFilePath}`);


    // const result = await cloudinary.v2.uploader.upload(csvFilePath, {
    //     folder: "reports",
    //     use_filename: true,
    //     unique_filename: false
    // });

    // console.log("report uploaded to Cloudinary:", result.secure_url);


    return csvFilePath

    // **Upload to Cloudinary**
    try {
        const uploadResponse = await cloudinary.v2.uploader.upload(csvFilePath, {
            resource_type: 'raw', // Ensures it's uploaded as a non-image file
            folder: 'csv_reports', // Cloudinary folder
        });

        console.log('File uploaded to Cloudinary:', uploadResponse.secure_url);

        // **Optional: Delete local file after upload**
        fs.unlinkSync(csvFilePath);

        return uploadResponse.secure_url;
    } catch (error) {
        console.error('Cloudinary Upload Error:', error);
        return null;
    }
}


export { handler }
