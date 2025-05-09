const { authenticator } = require('otplib');


export const login = async (email: string, password: string, page: any, cloudinary: any) => {
    

    // Replace with your actual secret key from Google Authenticator setup
    const secret = 'NMGJRKZOEJRSYKKTBLDU7QRJFPIM6EDB7YOIEC6ALXUC76LHVD5Q';
    const token = authenticator.generate(secret);

    console.log('OTP:', token);

    

    await page.mouse.move(100, 200); 
    await page.mouse.move(150, 250, { steps: 10 });
    await page.click('#ap_email');
    await page.keyboard.type(email, { delay: 100 });
    console.log("email typed")



    
    // await Promise.all([
    //     // page.waitForNavigation({ timeout: 60000 }), // The promise resolves after navigation has finished
    //     page.click('#continue') // Clicking the link will indirectly cause a navigation

    // ]);
    page.click('#continue') // Clicking the link will indirectly cause a navigation
    console.log("continue")

    await new Promise(resolve => setTimeout(resolve, 5000));

    const screenshotPath = "/tmp/screenshot.png"; // Must use /tmp/ in Lambda
    await page.screenshot({ path: screenshotPath });
    const result = await cloudinary.v2.uploader.upload(screenshotPath, {
        folder: "screenshots",
        use_filename: true,
        unique_filename: false
    });

    console.log("Screenshot uploaded to Cloudinary:", result.secure_url);


    // await page.solveRecaptchas();


    await page.type('#ap_password', password);
    // await Promise.all([
    //     // page.waitForNavigation({ timeout: 60000 }), // The promise resolves after navigation has finished
    //     page.click('#signInSubmit') // Clicking the link will indirectly cause a navigation
    // ]);

    page.click('#signInSubmit') // Clicking the link will indirectly cause a navigation
    console.log("signIn")

    await new Promise(resolve => setTimeout(resolve, 5000));


    await page.type('#auth-mfa-otpcode', token);
    await Promise.all([
        // page.waitForNavigation({ timeout: 60000 }), // The promise resolves after navigation has finished
        page.click('#auth-signin-button') // Clicking the link will indirectly cause a navigation
    ]);
    console.log("otp hit")
}