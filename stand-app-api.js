
async function insertComedianOnApi(data)
{

	axios.post(baseUrl + '/comedians', data)
		.then(response => {
			comedians.push(response.data.data.name);
			console.log('Comedian registered:', response.data.status, response.data.data.name );
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

module.exports = {
  insertComedianOnApi, getAllComedians
};