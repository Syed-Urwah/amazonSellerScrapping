const { authenticator } = require('otplib');


export const login=async(email: string, password: string, page: any)=> {

    // Replace with your actual secret key from Google Authenticator setup
    const secret = 'NMGJRKZOEJRSYKKTBLDU7QRJFPIM6EDB7YOIEC6ALXUC76LHVD5Q';
    const token = authenticator.generate(secret);

    console.log('OTP:', token);

    await page.type('#ap_email', email);
    await Promise.all([
        page.waitForNavigation(), // The promise resolves after navigation has finished
        page.click('#continue') // Clicking the link will indirectly cause a navigation
    ]);

    await page.type('#ap_password', password);
    await Promise.all([
        page.waitForNavigation(), // The promise resolves after navigation has finished
        page.click('#signInSubmit') // Clicking the link will indirectly cause a navigation
    ]);

    await page.type('#auth-mfa-otpcode', token);
    await Promise.all([
        page.waitForNavigation(), // The promise resolves after navigation has finished
        page.click('#auth-signin-button') // Clicking the link will indirectly cause a navigation
    ]);
}