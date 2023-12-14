const puppeteer = require('puppeteer')
const fs = require('fs');

const url = 'https://www.sympla.com.br/eventos/stand-up-comedy/todos-eventos?page=';

let currentPage = 2;

const events = [];
let counter = 1;
let existElementsToConsume = true;

function getUrl() {
	return url + currentPage;
}

async function scrappingSympla() {
	console.log("Abri o navegador");

	const browser = await puppeteer.launch({
		headless: false,
		args: ['--no-sandbox', '--disable-setuid-sandbox']
	});

	const page = await browser.newPage();

	while(existElementsToConsume) {
		await page.goto(getUrl());
		await getEvents(page);

		currentPage++;
	}
	
	browser.close();

	console.log("Fechei o navegador");

}

async function getEvents(page) 
{

	await page
	.waitForSelector('[class*="CustomGridstyle__CustomGridCardType"]')
	.then(() =>{ })
	.catch(() => {
		existElementsToConsume = false
	});

	const eventsList = await page.evaluate(() => {
		const nodeList = document.querySelectorAll('[class*="CustomGridstyle__CustomGridCardType"] > a')
		const nodes = [...nodeList];
		return nodes.map((item) =>  item.href	);

	});

	if (eventsList.length == 0) {
		existElementsToConsume = false;
		return;
	}

	for (const event of eventsList) {

		if (event.includes('bileto.')) {

			console.log(`Event link: ${event}`);
			await page.goto(event);

			await page
			.waitForSelector('.address')
			.then(() =>{ })
			.catch(() => {
				existElementsToConsume = false
			});

			// wrapping are so dificult 
			// try use api Request URL: https://bff-sales-api-cdn.bileto.sympla.com.br/api/v1/events/71535
			// https://event-page.svc.sympla.com.br/api/event-bff/purchase/event/1957541

			counter++
			const addressSelector = '.address';
			await page.waitForSelector(addressSelector);

			const addressElement = await page.$('.address p.title');

			console.log(addressElement);

			return;
  
			// Get the address text
			const address = await page.evaluate(addressElement => addressElement.textContent, addressElement);
			

			return;
			const eventObj = await page.evaluate(() => {

				const title =  document.querySelector('.event__section');
				const ticket =  document.querySelector('.ticket-information');
				const address =  document.querySelectorAll('.address');
				
				console.log(title)
	
				console.log(address)
				return {
					title
				}
	
			})

			console.log(`Event ${counter}: ${eventObj?.title}`);

		}

	}

}

async function eventOnSymplaDefault(event) {

	await page.goto(event);
		await page.waitForSelector('.row > .col-12 > h1');

		await page
    .waitForSelector('.row > .col-12 > h1')
		.then(() =>{ })
		.catch(() => {
			existElementsToConsume = false
		});

		const eventObj = await page.evaluate(() => {

			const title =  document.querySelector('.row > .col-12 > h1')?.innerHTML;
			const price = document.querySelector('.valor_sampa')?.innerHTML;
			const duration = document.querySelector('.ul_dados_espetaculo').children[1]?.innerHTML;
			const address = document.querySelector('.endereco_local_espetaculo')?.innerHTML;
			const image = document.querySelector('#imgEspetaculo')?.src;

			const classification = {
				label: document.querySelector('.img_classificacao') ?? '',
				image: document.querySelector('.img_classificacao')?.src
			}

			return {
				title,
				price,
				duration,
				classification,
				address,
				image
			}

		})

		console.log(`Event ${counter}: ${eventObj.title} - ${eventObj.price}`);
		events.push(eventObj);
		insertOnFile();
		counter++;

	return {

	}
}

async function eventOnSymplaBileto(page, event) {

		await page.goto(event);

		await page
    .waitForSelector('.event__section')
		.then(() =>{ })
		.catch(() => {
			existElementsToConsume = false
		});

		const eventObj = await page.evaluate(() => {
			const title =  document.querySelector('.event__section')?.innerHTML;

			return {
				title
			}

		})

		console.log(`Event ${counter}: ${eventObj.title} - ${eventObj.price}`);
		events.push(eventObj);
		insertOnFile();
		counter++;


}

async function insertOnFile() {

	try {
		const filename = 'events.json';

		const jsonString = JSON.stringify(events, null, 2);
		fs.writeFile(filename, jsonString, error => {
			if (error) {
				throw new Error('Something is wrong')
			}
			console.log('Inserted')
		});
	} catch (err) {

	}
	
}

scrappingSympla();

