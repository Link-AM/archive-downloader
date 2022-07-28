const playwright = require('playwright')
const propertiesReader = require('properties-reader')
const fs = require('fs')
const path = require('path')

const downloadPath = path.join(__dirname, `downloads`)
const properties = propertiesReader(path.join(__dirname, `credentials.properties`))

main()

async function main() {
    let browser = await init(`chromium`)
    let page = await newPage(browser)
    await login(page)
    await downloadAllFiles(page)
    await browser.close()
}

async function downloadAllFiles(page) {
    await page.goto(properties.get(`downloadPage`))
    let links = page.locator('a:visible')
    let count = await links.count()
    for (let i = 0; i < count; i++) {
        let text = await links.nth(i).innerText()
        if (text.endsWith(properties.get(`fileExtension`))) {
            await download(text, page)
        }
    }
}

async function download(text, page) {
    let saveLocation = path.join(downloadPath, text)
    if (fs.existsSync(saveLocation)) {
        console.log(`File was already downloaded: ${text}`)
    } else {
        const [download] = await Promise.all([
            page.waitForEvent('download'),
            page.locator(`text=${text}`).click(),
        ])
        console.log(`Download complete - saving to ${saveLocation}`)
        await download.saveAs(saveLocation)
    }
}

async function init(driver) {
    let browser = await playwright[driver].launch({
        headless: false
    })
    return browser
}

async function newPage(browser) {
    let context = await browser.newContext({ acceptDownloads: true })
    let page = await context.newPage()
    return page
}

async function login(page) {
    await page.goto(`https://archive.org/account/login`)
    await page.locator('input[name="username"]').fill(properties.get(`username`))
    await page.locator('input[name="password"]').fill(properties.get(`password`))
    await page.locator('input[name="submit-to-login"]').click()
    await page.waitForURL('https://archive.org/')
}