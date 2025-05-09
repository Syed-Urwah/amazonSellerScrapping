const { authenticator } = require('otplib');


export const login = async (email: string, password: string, page: any, cloudinary: any) => {


    const Captcha = require('@2captcha/captcha-solver')
    const solver = new Captcha.Solver('19ddb649da7bb2258a380fff8467b0f5')
    
    await page.type('input[name="email"]', email);
    await page.type('input[name="password"]', password);

    // page.click('.recaptcha-checkbox')

    // solver.recaptcha({
    //     pageurl: 'https://2captcha.com/demo/recaptcha-v2',
    //     googlekey: '6LeSJ4coAAAAAAENi0PV0tkwn5qwL5K4-z1jsLYy'
    //   })
    //   .then((res) => {
    //     console.log(res);
    //   })
    //   .catch((err) => {
    //     console.log(err);
    //   })

    // await page.solveRecaptchas()
  // Wait for the reCAPTCHA iframe to load
//   await page.waitForSelector('iframe[src*="recaptcha"]');

  // Get the iframe element
  const elementHandle = await page.$('iframe[src*="recaptcha"]');

  // Access the iframe's content
  const frame = await elementHandle.contentFrame();

  // Wait for the checkbox inside the iframe
  await frame.waitForSelector('#recaptcha-anchor', { visible: true });

  // Click the reCAPTCHA checkbox
  await frame.click('#recaptcha-anchor');

  console.log('✅ Checkbox clicked');

    // await page.mouse.move(100, 200); 
    // await page.mouse.move(150, 250, { steps: 10 });
    // await page.click('#ap_email');
    // await page.keyboard.type(email, { delay: 100 });
    // console.log("email typed")



    
    // await Promise.all([
    //     // page.waitForNavigation({ timeout: 60000 }), // The promise resolves after navigation has finished
    //     page.click('#continue') // Clicking the link will indirectly cause a navigation

    // ]);
    // page.click('#continue') // Clicking the link will indirectly cause a navigation
    // console.log("continue")

    // await new Promise(resolve => setTimeout(resolve, 5000));

    const screenshotPath = "/tmp/screenshot.png"; // Must use /tmp/ in Lambda
    await page.screenshot({ path: screenshotPath });
    // const result = await cloudinary.v2.uploader.upload(screenshotPath, {
    //     folder: "screenshots",
    //     use_filename: true,
    //     unique_filename: false
    // });

    // console.log("Screenshot uploaded to Cloudinary:", result.secure_url);


    // // await page.solveRecaptchas();


    // await page.type('#ap_password', password);
    // await Promise.all([
    //     // page.waitForNavigation({ timeout: 60000 }), // The promise resolves after navigation has finished
    //     page.click('#signInSubmit') // Clicking the link will indirectly cause a navigation
    // ]);

    page.click('button[type="submit"]') // Clicking the link will indirectly cause a navigation
    console.log("signIn")

    // await new Promise(resolve => setTimeout(resolve, 2000));


    // await page.type('#auth-mfa-otpcode', token);
    // await Promise.all([
    //     // page.waitForNavigation({ timeout: 60000 }), // The promise resolves after navigation has finished
    //     page.click('#auth-signin-button') // Clicking the link will indirectly cause a navigation
    // ]);
    // console.log("otp hit")
}