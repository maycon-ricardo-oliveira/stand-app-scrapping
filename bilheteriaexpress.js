const puppeteer = require('puppeteer');
const fs = require('fs');
const csv = require("simple-json-to-csv");

const url = 'https://www.bilheteriaexpress.com.br/ingressos-para-comedia-stand-up-1/ingressos-para-comedia-stand-up-agenda-completa.html#page=';

let currentPage = 1;

const events = [];
let counter = 1;
let existElementsToConsume = true;

const comedians = [
	"Fábio Rabin",
	"Bruna Louise",
	"Oscar Filho"
];

const meses = {
  janeiro: 0,
  fevereiro: 1,
  março: 2,
  abril: 3,
  maio: 4,
  junho: 5,
  julho: 6,
  agosto: 7,
  setembro: 8,
  outubro: 9,
  novembro: 10,
  dezembro: 11
};

const mesesAbrev = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11
};


function getUrl() {
	return url + currentPage;
}

async function scrappingBilheteriaExpress() {
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
	.waitForSelector('.products-grid')
	.then(() =>{ })
	.catch(() => {
		existElementsToConsume = false
	});

	const eventsList = await page.evaluate(() => {
		const nodeList = document.querySelectorAll('.product-image > a')
		const nodes = [...nodeList];

		return nodes.map((item) =>  item.href	);

	});

	if (eventsList.length == 0) {
		existElementsToConsume = false;
		return;
	}

	for (const event of eventsList) {

		await page.goto(event);

		await page
    .waitForSelector('.product-info.row')
		.then(() =>{ })
		.catch(() => {
			existElementsToConsume = false
			return;
		});

		let attractionObj = await page.evaluate(() => {
			let address = document.querySelector('table > tbody').childElements()[4].childElements()[1].innerText.trim();
			let dateTime = document.querySelector('table > tbody').childElements()[2].childElements()[1].innerText.trim();
			let classification = document.querySelector('table > tbody').childElements()[6].childElements()[1].innerText.trim();	
			let price = document.querySelector('table > tbody').childElements()[8].childElements()[1].innerText.trim();	
	
			return {

				dateTime,
				price,
				classification,
				address,
			}

			// const title =  document.querySelector('.row > .col-12 > h1')?.innerHTML;
			// const price = document.querySelector('.valor_sampa')?.innerHTML;
			// const season = document.querySelector('.texto_temporada')?.innerHTML;
			// const schedule = document.querySelector('.texto_horarios')?.innerHTML;
			// const time = document.querySelector('.ul_dados_espetaculo')?.children[1]?.innerHTML;
			// const address = document.querySelector('.endereco_local_espetaculo')?.innerHTML;
			// const placeLink = document.querySelector('.link_local_espetaculo')?.href;
			// const image = document.querySelector('#imgEspetaculo')?.src;

			// const classification = {
			// 	label: document.querySelector('.img_classificacao').parentElement.innerText ?? '',
			// 	image: document.querySelector('.img_classificacao')?.src
			// }

			// const duration = time.includes('<img') ? null : time;

			return {
				title,
				season,
				schedule,
				placeLink,
				price,
				duration,
				classification,
				address,
				image
			}

		})

		console.log('Endereço:', attractionObj.address);
		console.log('Classificação:', attractionObj.classification);
		console.log('Preço:', attractionObj.price);
		console.log('Data e Hora:', attractionObj.dateTime);
		console.log('________');

		
		// const comedianName = getComedianNameOnTitle(eventObj.title);

		// const season = getSeasonTime(eventObj.season);

		// console.log(`Data: ${season}`)
		// eventObj.comedianName = comedianName;
		// eventObj.seasonDate = season;

		// console.log(`Comedian Name: ${comedianName} `  )
		// console.log(`Event ${counter}: ${eventObj.title} - ${eventObj.price}`);
		// events.push(eventObj);
		// insertOnFile();
		// // insertInCsv();
		// counter++;

	}

}

function getSeasonTime(data) {
	let str = data;
	const regex1 = /até\s+(\d+)\s+de\s+([^\s]+)\.?/i;
	const regex2 = /dia\s+(\d+)\s+de\s+([^\s]+)\s+\(.+\)\.?/i;
	const regex3 = /estreia\s+dia\s+(\d+)\s+de\s+([^\s]+)\s+\(.+\)\.\s+até\s+(\d+)\s+de\s+([^\s]+)\.?/i;
	const regex4 = /Sessão única hoje \((\w+)\)/i;

	const match1 = str.match(regex1);
	if (match1) {
		const diaFim = parseInt(match1[1]);
		const mesFimNum = meses[match1[2].toLowerCase()];
		const ano = new Date().getFullYear();
		const fim = new Date(ano, mesFimNum, diaFim).toISOString();
		console.log(`Date match 1: ${diaFim}  ${mesFimNum}  ${ano} | Full date:  ${fim.toString()} `)

		return { fim };
	}
	
	const match2 = str.match(regex2);
	if (match2) {
		const dia = parseInt(match2[1]);
		const mesNum = meses[match2[2].toLowerCase()];
		const ano = new Date().getFullYear();
		const data = new Date(ano, mesNum, dia).toISOString();
		return { data };
	}

	const match3 = str.match(regex3);
	if (match1) {
		const diaInicio = parseInt(match3[1]);
		const mesInicioNum = meses[match3[2].toLowerCase()];
		const diaFim = parseInt(match3[3]);
		const mesFimNum = meses[match3[4].toLowerCase()];
		const ano = new Date().getFullYear();
		const inicio = new Date(ano, mesInicioNum, diaInicio).toISOString();
		const fim = new Date(ano, mesFimNum, diaFim).toISOString();
		return { inicio, fim };
	}

	const match4 = str.match(regex4);
  if (match4) {
    const dia = new Date().getDate();
    const mes = new Date().getMonth();
    const ano = new Date().getFullYear();
    return { inicio: new Date(ano, mes, dia).toISOString() };
  }

  return null;

}
function getComedianNameOnTitle (title) {
	const standUpRegex = /\bstand[-\s]up\b/i;
  const ignoreDashRegex = /([^\s]+)(?:\s*-\s*)(.*)/;
	const regex = /^([^\s-]+(?:\s+[^\s-]+)*)\s*(?:-|\bat\b|\bstand[-\s]up\b)\s*(.*)$/i;
	
	let comedian = null;

	comedians.forEach(name => {
    if (title.includes(name)) {
      comedian = name;
    }
  });

  const colonMatch = title.match(/^(.*):\s+(.*)$/);

	if (comedian == null) {
		if (colonMatch) {
			comedian = colonMatch[1];
		} else {
			const match = title.match(regex);
			if (match) {
				comedian = match[1];
			} else {
				const originalMatch = title.match(ignoreDashRegex);
				if (originalMatch) {
					const comedianMatch = originalMatch[2].match(standUpRegex)
						? originalMatch[3]
						: originalMatch[2];
					comedian = comedianMatch.trim();
				}
			}
		}
	
		if (comedian) {
			const comedianName = comedian.replace(/\b(?:stand[-\s]?up\s*|\s*-\s*stand\s*|\s*stand\s*)/i, "").trim()
			comedian = comedianName;
		}

		if (comedian && !comedians.includes(comedian)) {
			comedians.push(comedian);
		}

	}

	return comedian;
}

async function insertInCsv(){
	const file = new csv(events)
	file.convert("out/result.csv").then("Saved")
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

scrappingBilheteriaExpress();




