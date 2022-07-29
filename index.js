const fs = require('fs')
const path = require('path')
const playwright = require('playwright')
const propReader = require('properties-reader')
const props = propReader(getPropFile()).getAllProperties()

main()

async function main() {
    let browser = await init(`chromium`)
    let page = await newPage(browser)
    await login(page)
    await downloadAllFiles(page)
    await browser.close()
}

async function downloadAllFiles(page) {
    await page.goto(props.downloadPageUrl)
    let links = page.locator('a:visible')
    let count = await links.count()
    for (let i = 0; i < count; i++) {
        let text = await links.nth(i).innerText()
        if (verifyAllConditions(text)) {
            try {
                await download(text, page)
            } catch (err) {
                console.log(err)
            } 
        }
    }
}

async function download(text, page) {
    let saveFile = path.join(__dirname, `downloads`, path.basename(props.downloadPageUrl), text)
    if (fs.existsSync(saveFile)) {
        console.log(`Skipping file already downloaded: '${text}'`)
    } else {
        try {
            let [download] = await Promise.all([
                page.waitForEvent('download'),
                page.locator(`text=${text}`).click(),
            ])
            console.log(`Download started for file '${text}' - Please wait... `)
            await download.saveAs(saveFile)
            console.log(`\t Download complete - saved to '${saveFile}'`)
        } catch (err) {
            console.error(`ERROR - Could not download file ${text}: ${err}` )
        }
    }
}

function verifyAllConditions(text) {
    if (hasValue(props.includeText)) {
        if (!text.includes(props.includeText)) {
            return false
        }
    } 
    if (hasValue(props.excludeText)) {
        if (text.includes(props.excludeText)) {
            return false
        }
    } 
    if (hasValue(props.fileExtension)) {
        if (!text.endsWith(props.fileExtension)) {
            return false
        }
    }
    return true
}

function hasValue(str) {
    if (str.length > 0) return true
    else return false
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

function getPropFile() {
    let criteria = path.join(__dirname, `criteria.properties`)
    let personal = path.join(__dirname, `personal.properties`)
    let propFile = fs.existsSync(personal) ? personal : criteria
    return propFile
}

async function login(page) {
    await page.goto(`https://archive.org/account/login`)
    await page.locator('input[name="username"]').fill(props.username)
    await page.locator('input[name="password"]').fill(props.password)
    await page.locator('input[name="submit-to-login"]').click()
    await page.waitForURL('https://archive.org/')
}