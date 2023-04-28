var axios = require('axios');
const apiKey = require('./config');
const fs = require('fs');

var origins = ["Gradual Investimentos, Av. Antônio de Goes, 60 - Pina, Recife - PE, 51110-100", "COMITÊ PARQUE 20120, Av. Antônio de Goes, 470 - Pina, Recife - PE, 51010-000"];
var destinations = ["Cabanga Yacht Club Pernambuco, Av. Eng. José Estelita, s/n - Cabanga, Recife - PE, 50090-040"];

var config = {
  method: 'get',
  url: "https://maps.googleapis.com/maps/api/distancematrix/json?origins=" + encodeURIComponent(origins.join('|')) + "&destinations=" + encodeURIComponent(destinations.join('|')) + "&departure_time=now&traffic_model=best_guess&key="+ apiKey.apiKey,
  headers: { }
};

function filtrarDados(data) {
  const jsonData = JSON.parse(data);
  const rows = jsonData.rows;

  return rows.flatMap((row, index) => {
    const origin = jsonData.origin_addresses[index];
    return row.elements.map((element, idx) => {
      const destination = jsonData.destination_addresses[idx];
      const durationInTraffic = element.duration_in_traffic.value;
      const distanceValue = element.distance.value;

      return {
        origin,
        destination,
        duration_in_traffic: durationInTraffic,
        distance_value: distanceValue
      };
    });
  });
}

axios(config)
.then(function ({ data }) {
  const filteredData = filtrarDados(JSON.stringify(data));
  saveToHistory(filteredData);
})
.catch(function (error) {
  console.log(error);
});

function calcularVelocidades(duration1, distance1, duration2, distance2) {
  return {
    velocidade1: distance1 / duration1,
    velocidade2: distance2 / duration2
  };
}

function formatarDiferencaVelocidade(velocidade1, velocidade2) {
  if (velocidade1 > velocidade2) {
    return `caminho 1 é ${Math.round(((velocidade1 / velocidade2)*100)-100)}% mais rapido do que o 2`;
  } else {
    return `caminho 2 é ${Math.round(((velocidade2 / velocidade1)*100)-100)}% mais rapido do que o 1`;
  }
}

function saveToHistory(filteredData) {
  fs.readFile('history.json', 'utf8', (err, data) => {
    if (err) {
      console.error('Erro ao ler o arquivo history.json:', err);
      return;
    }

    let history;
    try {
      history = JSON.parse(data);
    } catch (e) {
      console.error('Erro ao analisar o arquivo history.json:', e);
      return;
    }

    history.push(filteredData);

    if (history.length > 10) {
      history.shift(); // Remove o primeiro elemento do array se tiver mais de 10 itens
    }

    fs.writeFile('history.json', JSON.stringify(history, null, 2), 'utf8', (err) => {
      if (err) {
        console.error('Erro ao escrever no arquivo history.json:', err);
      }
    });
  });
}

