const puppeteer = require('puppeteer');
const fs = require('fs');
const csv = require("simple-json-to-csv");
const axios = require('axios');

const url = 'https://www.sampaingressos.com.br/espetaculos/standUp?pagina=';

let currentPage = 1;

const events = [];
let counter = 1;
let existElementsToConsume = true;

const comedians = [

];

const places = [

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

async function scrappingSampaIngressos() {
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

	await getAllComedians();

	await page
	.waitForSelector('.col-card a')
	.then(() =>{ })
	.catch(() => {
		existElementsToConsume = false
	});

	const eventsList = await page.evaluate(() => {
		const nodeList = document.querySelectorAll('.col-card a')
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
    .waitForSelector('.row > .col-12 > h1')
		.then(() =>{ })
		.catch(() => {
			existElementsToConsume = false
			return;
		});

		let eventObj = await page.evaluate(() => {

			const title =  document.querySelector('.row > .col-12 > h1')?.innerHTML;
			const price = document.querySelector('.valor_sampa')?.innerHTML;
			const season = document.querySelector('.texto_temporada')?.innerHTML;
			const schedule = document.querySelector('.texto_horarios')?.innerHTML;
			const time = document.querySelector('.ul_dados_espetaculo')?.children[1]?.innerHTML;
			const address = document.querySelector('.endereco_local_espetaculo')?.innerHTML;
			const placeLink = document.querySelector('.link_local_espetaculo')?.href;
			const image = document.querySelector('#imgEspetaculo')?.src;

			const classification = {
				label: document.querySelector('.img_classificacao').parentElement.innerText ?? '',
				image: document.querySelector('.img_classificacao')?.src
			}

			const duration = time.includes('<img') ? null : time;
			
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

		if (eventObj.placeLink) {
			await page.goto(eventObj?.placeLink);

			await page
			.waitForSelector('.col-12.local > h3')
			.then(() =>{ })
			.catch(() => {
				existElementsToConsume = false
			});
	
			const placeObj = await page.evaluate(() => {
				const place =  document.querySelector('.col-12.local > h3').innerText;
	
				const regex = /\((\d+) lugares\)/;
				const match = place.match(regex);

				const placeSeats = match ? parseInt(match[1]) : 0;
				const placeTitle = place.replace(regex, '').trim();

				return {
					placeTitle,
					placeSeats
				}
			})
	
			eventObj.placeTitle = placeObj.placeTitle
			eventObj.placeSeats = placeObj.placeSeats
		}
		
		const comedianName = getComedianNameOnTitle(eventObj.title);

		const season = getSeasonTime(eventObj.season);

		eventObj.comedianName = comedianName;
		eventObj.seasonDate = season;

		console.log(`Comedian Name: ${comedianName} `)
		console.log(`Event ${counter}: ${eventObj.title} - ${eventObj.price}`);
		console.log(`Address: ${eventObj.address}`);
		events.push(eventObj);

		if (comedianName) {
			const data = {
				name: comedianName,
				miniBio: 'Comedian bio',
				thumbnail: eventObj.image,	
				attractions: []
			};
			const location = getZipcodeFromAddress(eventObj.address);
			const placeImage = getPlaceImage(eventObj.placeTitle);

			console.log('zipcode:', 
			  location.zipcode,
				location.lat, 
				location.lon,
				placeImage
			)

			const placeData = {
				name: eventObj.placeTitle,
				seats: eventObj.placeSeats,
				address: eventObj.address,
				zipcode: location.zipcode,
				image: placeImage && '',
				lat: location.lat,
				lng: location.lon
			};

			insertOnFile('events.json')

			if (!comedians.find(comedianName)) {
				insertComedianOnApi(data)
			}
			
			if (!places.find(eventObj.placeTitle)) {
				insertPlaceOnApi(placeData)
			}


		} else {
			const filename = 'events-error.json';
			insertOnFile(filename);
		}
		// insertInCsv();
		counter++;
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

async function insertOnFile(fileName) {

	try {

		const jsonString = JSON.stringify(events, null, 2);
		fs.writeFile(fileName, jsonString, error => {
			if (error) {
				throw new Error('Something is wrong')
			}
			console.log('Inserted on file: ', fileName)
		});
	} catch (err) {

	}

}

const baseUrl = 'http://localhost:8888/api/v1';

async function insertComedianOnApi(data)
{
	console.log('Inserting comedian');

	axios.post(baseUrl + '/comedians', data)
		.then(response => {
			comedians.push(response.data.data.name);
			console.log('Comedian registered:', response.data.status, response.data.data.name );
		})
		.catch(error => {
			console.error('Erro ao fazer a requisição POST:', error.message);
		});
}

async function insertPlaceOnApi(data)
{
	console.log('Inserting place');

	axios.post(baseUrl + '/places', data)
		.then(response => {
			comedians.push(response.data.data.name);
			console.log('Place registered:', response.data.status, response.data.data.name);
		})
		.catch(error => {
			console.error('Erro ao fazer a requisição POST:', error.message);
		});
}

async function getAllComedians()
{
	axios.get(baseUrl + '/comedians')
	.then(response => {

		const comediansData = response.data.data;

		for(comedian of comediansData) {
			comedians.push(comedian.name)
		}

	})
	.catch(error => {
		console.error('Erro ao fazer a requisição:', error.message);
	});
}

async function getZipcodeFromAddress(address) {

	console.log('getting zipcode');

	var apiUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;

		await axios.get(apiUrl).then(response => {

			const data = response.data;

			if (data.length > 0) {
				if (data[0].address?.postcode) {
					var zipcode = data[0].address.postcode;
				} else {
					var zipcode = getZipcodeFromDisplayName(data[0].display_name)
				}

				const lat = data[0].lat;
				const lon = data[0].lon;

				console.log('zipcode: ' + zipcode);

				return {
					zipcode,
					lat,
					lon
				}

			}
	})
	.catch(error => {
		console.error('Erro ao fazer a requisição:', error.message);
	});
}

function getZipcodeFromDisplayName(str) {
  var regexCep = /\b\d{5}-?\d{3}\b/;
  var match = str.match(regexCep);
	
  return match ? match[0] : null;
}

function getPlaceImage(term) {
  var apiKey = 'AIzaSyAh7Vpx8BY4Blf-LpWA3MvOs-pB1B4NJ7Q';
  var apiUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(term)}&inputtype=textquery&fields=photos,formatted_address,name&key=${apiKey}`;

  axios.get(apiUrl)
    .then(response => {
			var data = response.data;

      if (data.status === 'OK' && data.candidates && data.candidates.length > 0) {
        var lugar = data.candidates[0];

        if (lugar.photos && lugar.photos.length > 0) {
          var referenceIMG = lugar.photos[0].photo_reference;
          return getImage(referenceIMG);
        } else {
          console.log('Nenhuma imagem encontrada para o lugar.');
        }
      } else {
        console.log('Local não encontrado.');
      }
    })
    .catch(error => {
      console.error('Erro na busca do lugar:', error);
    });
}

function getImage(referenciaFoto) {
  var apiKey = 'AIzaSyAh7Vpx8BY4Blf-LpWA3MvOs-pB1B4NJ7Q';
  var apiUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${referenciaFoto}&key=${apiKey}`;
	return apiUrl
}

scrappingSampaIngressos();