const functions = require('firebase-functions');
const puppeteer = require('puppeteer-core');
const chrome = require('chrome-aws-lambda');
const fs = require('fs');

const runtimeOpts = {
    timeoutSeconds: 300,
    memory: '1GB',
}

exports.createHomebrew = functions
    .runWith(runtimeOpts)
    .https
    .onRequest(async (req, res) => {
    // Ensure the request is a POST request
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    const { content } = req.body;
    if (!content) {
        res.status(400).send({ error: 'Content is required' });
        return;
    }

    try {
        const url = await processTextAndGetUrl(content);
        res.status(200).send({ url });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

async function processTextAndGetUrl(text) {
    const browser = await puppeteer.launch({
        executablePath: await chrome.executablePath,
        args: chrome.args,
        headless: chrome.headless,
    });

    const page = await browser.newPage();
    await page.goto('https://homebrewery.naturalcrit.com/');

    await page.waitForSelector('.CodeMirror');
    await page.evaluate((text) => {
        const editor = document.querySelector('.CodeMirror').CodeMirror;
        editor.setValue(text);
    }, text);

    await page.click('.floatingSaveButton');
    await page.waitForNavigation();

    const newUrl = page.url();
    await browser.close();
    return newUrl;
}

exports.privacyPolicy = functions.https.onRequest((request, response) => {
    const filePath = './privacyPolicy.txt'
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading the privacy policy file:', err);
            response.status(500).send('Error loading the privacy policy');
            return;
        }
        response.send(data);
    });
});