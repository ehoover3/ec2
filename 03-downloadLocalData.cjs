const fs = require("fs");
const puppeteer = require("puppeteer");
const AWS = require("aws-sdk");

const s3 = new AWS.S3({
  accessKeyId: process.env.ACCESS_KEY,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
  region: "us-east-1",
});

const filePath = "./OccupationCodes.json";
const rawOccupationCodes = fs.readFileSync(filePath, "utf8");
const OccupationCodes = JSON.parse(rawOccupationCodes);
console.log(OccupationCodes);

async function downloadCSVForStates(OccupationCode, states) {
  const browser = await puppeteer.launch({ headless: "true", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  const pages = await Promise.all(states.map((state) => browser.newPage()));
  const downloadTasks = states.map(async (state, index) => {
    const page = pages[index];
    await page.goto(`https://www.mynextmove.org/profile/wages/${OccupationCode}?st=${state}`, { timeout: 60000 });
    const selector = `a[href$="LocalSalary_${OccupationCode}_${state}.csv?fmt=csv&st=${state}"]`;
    await page.waitForSelector(selector);
    await page.click(selector);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    console.log(`${OccupationCode} ${stateBatch} downloaded`);

    const fileKey = `OccupationCodes/${OccupationCode}_${state}.csv`;
    const fileContent = fs.readFileSync(`${__dirname}/../Downloads/LocalSalary_${OccupationCode}_${state}.csv`);
    await s3
      .upload({
        Bucket: "local-career-files",
        Key: fileKey,
        Body: fileContent,
      })
      .promise();
    console.log(`File uploaded to S3: ${fileKey}`);

    fs.unlinkSync(`${__dirname}/../Downloads/LocalSalary_${OccupationCode}_${state}.csv`);
    console.log(`File deleted from Downloads folder: LocalSalary_${OccupationCode}_${state}.csv`);
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
    console.log("********************************************************");
    console.log(`Completed ${codeCounter} out of ${OccupationCodes.length}`);
    console.log("********************************************************");
    codeCounter += 1;
    fs.appendFileSync("OccupationCodes.txt", `${OccupationCode}\n`);
  }
})();
