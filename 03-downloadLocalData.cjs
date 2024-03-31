const fs = require("fs");
const puppeteer = require("puppeteer");

const filePath = "./output/OccupationCodes.json";
const rawOccupationCodes = fs.readFileSync(filePath, "utf8");
const OccupationCodes = JSON.parse(rawOccupationCodes);
console.log(OccupationCodes);

async function downloadCSVForStates(OccupationCode, states) {
  const browser = await puppeteer.launch({ headless: "new" });
  const pages = await Promise.all(states.map((state) => browser.newPage()));
  const downloadTasks = states.map(async (state, index) => {
    const page = pages[index];
    await page.goto(`https://www.mynextmove.org/profile/wages/${OccupationCode}?st=${state}`, { timeout: 60000 });
    const selector = `a[href$="LocalSalary_${OccupationCode}_${state}.csv?fmt=csv&st=${state}"]`;
    await page.waitForSelector(selector);
    await page.click(selector);
    await page.waitForTimeout(5000);
  });
  await Promise.all(downloadTasks);
  await browser.close();
}

const allStates = ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "AS", "GU", "MP", "PR", "VI"];

(async () => {
  const batchSize = 1;
  let codeCounter = 1;
  for (let OccupationCode of OccupationCodes) {
    for (let i = 0; i < allStates.length; i += batchSize) {
      const stateBatch = allStates.slice(i, i + batchSize);
      await downloadCSVForStates(OccupationCode, stateBatch);
    }
    console.log(`Completed ${codeCounter} out of ${OccupationCodes.length}`);
    codeCounter += 1;
    fs.appendFileSync("OccupationCodes.txt", `${OccupationCode}\n`);
  }
})();