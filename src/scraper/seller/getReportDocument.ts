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

const tempDir = path.join(__dirname, 'temp');
const chromePath = path.join(process.cwd(), 'chrome/win64-129.0.6668.100/chrome-win64/chrome.exe');



const email = "amazonninja04@gmail.com"
const password = "alphabet"


const handler: Handler = async (event: APIGatewayProxyEventV2): Promise<any> => {
    const { account_name, location_name } = JSON.parse(event.body || '');

    // startupCheck();
    // const token = await getVerificationToken()
    // if (token) {
    //     await login(process.env.FLORIDA_USERID!, process.env.FLORIDA_PASSWORD!, token)
    // }

    await createFloridaConnection(account_name, location_name);
    // return getCookies();
};


async function createFloridaConnection(accountName, locationName) {
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


            console.log("login start")
            // Navigate the page to a URL
            // await page.goto('https://wotc.floridajobs.org/',  { waitUntil: 'networkidle2', timeout: 30000 } );
            // // // Type into login form


            // await Promise.all([
            //     page.waitForNavigation(), // The promise resolves after navigation has finished
            //     page.click('.btn1') // Clicking the link will indirectly cause a navigation
            // ]);
            // await login(process.env.FLORIDA_USERID!.toString(), process.env.FLORIDA_PASSWORD!.toString(), page)
            // console.log("login success")

            await page.goto('https://sellercentral.amazon.com/payments/reports-repository/ref=xx_rrepo_dnav_xx'); 4

            //login
            await login(email, password, page)
            // await page.type('#ap_email', email);
            // await Promise.all([
            //     page.waitForNavigation(), // The promise resolves after navigation has finished
            //     page.click('#continue') // Clicking the link will indirectly cause a navigation
            // ]);

            // await page.type('#ap_password', password);
            // await Promise.all([
            //     page.waitForNavigation(), // The promise resolves after navigation has finished
            //     page.click('#signInSubmit') // Clicking the link will indirectly cause a navigation
            // ]);

            // await page.type('#auth-mfa-otpcode', token);
            // await Promise.all([
            //     page.waitForNavigation(), // The promise resolves after navigation has finished
            //     page.click('#auth-signin-button') // Clicking the link will indirectly cause a navigation
            // ]);


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
                // Wait for the input field and type the date
                //startDate
                await page.waitForSelector('kat-date-picker[name="startDate"]');
                await page.click('kat-date-picker[name="startDate"]'); // Open date picker
                await page.waitForSelector('input[name="startDate"]');
                await page.type('input[name="startDate"]', '03/01/2025', { delay: 100 });

                // await page.keyboard.type('12/31/2025'); // Type date
                await page.keyboard.press('Enter'); // Confirm

                //endDate
                await page.waitForSelector('kat-date-picker[name="endDate"]');
                await page.click('kat-date-picker[name="endDate"]'); // Open date picker
                await page.waitForSelector('input[name="endDate"]');
                await page.type('input[name="endDate"]', '03/17/2025', { delay: 100 });
                await page.keyboard.press('Enter'); // Confirm


                //click Request Report
                await page.evaluate(() => {
                    const btn: any = document.getElementById('filter-generate-button');
                    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                });

                let downloadClicked = false;

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
                await page.waitForTimeout(5000);


                // Function to wait for the first row's status to become "Ready"
                // await page.waitForFunction(() => {
                //     const firstRowStatus = document.querySelector(
                //         "kat-table-body kat-table-row:first-child kat-statusindicator"
                //     );
                //     return firstRowStatus && firstRowStatus.getAttribute("label") === "Ready";
                // }, { timeout: 0 }); // No timeout, it waits indefinitely

                // console.log('Status is Ready. Clicking Download CSV...');

                // // Click the Download button in the first row
                // await page.evaluate(() => {
                //     const downloadButton: any = document.querySelector(
                //         "kat-table-body kat-table-row:first-child kat-button[label='Download CSV']"
                //     );
                //     if (downloadButton) {
                //         downloadButton.click();
                //     }
                // });

                // console.log('Download CSV button clicked.');

                // // Optional: Wait some time for the download to start
                // await page.waitForTimeout(5000);


                // const xpathStartDate = `//kat-input[@name='startDate']`;
                // await page.waitForXPath(xpathStartDate, { timeout: 10000 }); // Waits up to 10 seconds
                // const [katElement] = await page.$x(xpathStartDate);

                // if (katElement) {
                //     await katElement.click();
                // }

                // await page.waitForSelector('input[name="startDate"]');
                // await page.type('input[name="startDate"]', '01/01/2025', { delay: 100 });

                // await page.waitForSelector('input[name="endDate"]');
                // await page.type('input[name="startDate"]', '12/31/2025', { delay: 100 });

            }
            console.log(accountSelected)




            // // Clear all input fields
            // await page.evaluate(() => {
            //     const inputs = document.querySelectorAll('input');
            //     inputs.forEach(input => input.value = '');
            // });










            // await page.screenshot({
            //     path: '/tmp/hn.png',
            // });

            // fs.unlinkSync(pdfFilePath); // Deletes the file after uploading

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

function getCurrentDate() {
    const currentDate = new Date();
    return `${currentDate.getMonth() + 1}/${currentDate.getDate()}/${currentDate.getFullYear()}`;
}

function appendEntityDataToFormData(entity, formData, { firstName, middleName, lastName }) {

    const entity_fein = entity?.fein.replace(/[^a-zA-Z0-9]/g, '');

    const { addr1, addr2, state, county, city, zip, mailingAddressLine1, mailingAddressLine2, mailingState, mailingCounty, mailingCity, mailingZipCode, is_mailing_address_same } = entity;

    formData.append("FirstName", firstName);
    formData.append("MiddleName", middleName);
    formData.append("LastName", lastName);
    formData.append("PoaStartDate", entity.form9198s[0].clientFormValues['POA Start Date']);
    formData.append("PoaEndDate", entity.form9198s[0].clientFormValues['POA End Date']);
    formData.append("EmployerSignatureDate", entity.form9198s[0].tenantFormValues['Preparer Firm Signature Date']);
    formData.append("FederalEmployerIdentificationNumber", entity_fein);
    formData.append("EmployerName", entity.name);
    formData.append("AddressLine1", addr1);
    formData.append("AddressLine2", addr2);
    formData.append("State", state);
    formData.append("County", county);
    formData.append("City", city);
    formData.append("ZipCode", zip);

    if (is_mailing_address_same) {
        formData.append("IsMailingAddressSame", "true");
        formData.append("MailingAddressLine1", addr1);
        formData.append("MailingAddressLine2", addr2);
        formData.append("MailingState", state);
        formData.append("MailingCounty", county);
        formData.append("MailingCity", city);
        formData.append("MailingZipCode", zip);
    } else {
        formData.append("IsMailingAddressSame", "false");
        formData.append("MailingAddressLine1", mailingAddressLine1);
        formData.append("MailingAddressLine2", mailingAddressLine2);
        formData.append("MailingState", mailingState);
        formData.append("MailingCounty", mailingCounty);
        formData.append("MailingCity", mailingCity);
        formData.append("MailingZipCode", mailingZipCode);
    }
}

function appendFormValuesToFormData(form9198, formData) {

    const { clientFormValues, tenantFormValues } = form9198;
    formData.append("PoaStartDate", clientFormValues['POA Start Date']);
    formData.append("PoaEndDate", clientFormValues['POA End Date']);
    formData.append("EmployerSignatureDate", tenantFormValues['Preparer Firm Signature Date']);
}


export { handler }
