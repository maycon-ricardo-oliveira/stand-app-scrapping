const puppeteer = require('puppeteer')


const events = [];
let counter = 1;

async function scrappingSympla() {
			const browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
			});
			const page = await browser.newPage();
	
			console.log("Abri o navegador");

			await page.goto(url);
			const cards = await page.$$('[class*="CustomGridstyle__CustomGridCardType"]');

			for (let i = 0; i < cards.length; i++) {
				const titleElement = await cards[i].$('[class*="EventCardstyle__EventTitle"]');
				const title = await titleElement?.evaluate(el => el.textContent?.trim());
				const linkEl = await cards[i].$('[class*="EventCardstyle__CardLink"]'); 
				const link = await linkEl?.evaluate(el => el.href)
				// console.log(`Event ${i + 1}: ${title} ${link} `);

				if (link) {
					events.push({title, link})
				}

			}

			console.log(events)

			await openEvent(page);
			
			console.log("Fechei o navegador");

}

scrappingSympla();


async function openEvent(page) {
	for (const event of events) {
		console.log("Página: ", counter);

		await page.goto(event?.link);

		const eventsAddress = await page.evaluate(() => {
			const address = document.getElementsByClassName('address')[0]?.innerText 
			const title = document.getElementsByClassName('sta-event-title-text')[0]?.innerText

			return {address, title}

		})

		console.log(eventsAddress);

	}

}

async function scrappingSymplaUsingNewTabs() {
		const browser = await puppeteer.launch({
		headless: false,
		args: ['--no-sandbox', '--disable-setuid-sandbox']
		});
		const page = await browser.newPage();

		console.log("Abri o navegador");

		await page.goto(url);
		const links =  page.$$eval('[class*="EventCardstyle__CardLink"]', el => el.map(link => link.href));

		console.log(links)

		
		for (let i = 0; i < links.length; i++) {
			console.log('Página: ', counter);

			await page.waitForSelector('.sta-event-title-text')

			const title = await page.$eval('.sta-event-title-text > span', element => element.innerHTML);
			const address = await page.$eval('.address > p', element => element.innerHTML);
	
			console.log(`Event ${i + 1}: ${title} - ${address}`);
			counter++;
		}

		console.log("Fechei o navegador");

		browser.close();
}