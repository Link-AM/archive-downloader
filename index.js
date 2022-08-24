const fs = require('fs')
const path = require('path')
const playwright = require('playwright')
const propReader = require('properties-reader')
const props = propReader(getPropFile()).getAllProperties()

const folderName = path.basename(props.downloadPageUrl)
const downloadPath = path.join(__dirname, `downloads`, folderName)

var results = {
    Success: 0,
    Failed: 0,
    Skipped: 0,
    Preexisted:0
}

main()

async function main() {
    let browser = await init(`chromium`)
    let page = await newPage(browser)
    await login(page)
    await downloadAllFiles(page)
    await browser.close()
    console.log(results)
}

async function downloadAllFiles(page) {
    await page.goto(props.downloadPageUrl)
    let links = page.locator('a:visible')
    let count = await links.count()
    for (let i = 0; i < count; i++) {
        let link = await links.nth(i).innerText()
        if (allConditionsMet(link)) {
            await download(link, page)
        }
    }
    console.log(`All files evaluated.  Save location: ${downloadPath}`)
}

async function download(link, page) {
    try {
        console.log(`Downloading file. Please wait...\t\t${link}`)
        let [download] = await Promise.all([
            page.waitForEvent('download'),
            page.locator(`text="${link}"`).click(),
        ])
        await download.saveAs(path.join(downloadPath, link))
        console.log(`\t Download complete`)
        results.Success++
    } catch (err) {
        console.error(`ERROR - Could not download file\t\t${link}'\n${err}` )
        results.Failed++
    }
}

function allConditionsMet(text) {
    if (props.fileExtension.length > 0) {
        if (!text.endsWith(props.fileExtension)) {
            return false
        }
    }
    if (props.includeText.length > 0) {
        if (testIncludesCondition(text) == `Fail`) {
            console.log(`File skipped because it does not contain '${props.includeText}'\t\t${text}`)
            results.Skipped++
            return false
        }
    }
    if (props.excludeText.length > 0) {
        if (testExcludesCondition(text) == `Fail`) {
            console.log(`File skipped because it contains '${props.excludeText}'\t\t\t\t${text}`)
            results.Skipped++
            return false
        }
    }
    if (fs.existsSync(path.join(downloadPath, text))) {
        console.log(`File already exists in the save location\t\t\t${text}`)
        results.Preexisted++
        return false
    }
    return true
}

function testIncludesCondition(text) {
    let result = `Fail`
    let arr = props.includeText.toString().split(`|`)
    for (let x = 0; x < arr.length; x++) {
        if (text.includes(arr[x])) {
            result = `Pass`
            break
        }
    }
    return result
}

function testExcludesCondition(text) {
    let result = `Pass`
    let arr = props.excludeText.toString().split(`|`)
    for (let x = 0; x < arr.length; x++) {
        if (text.includes(arr[x])) {
            result = `Fail`
            break
        }
    }
    return result
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