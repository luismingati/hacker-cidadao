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

axios(config)
.then(function ({ data }) {
  const filteredData = filtrarDados(JSON.stringify(data));
  saveToHistory(filteredData);
})
.catch(function (error) {
  console.log(error);
})
.finally(function () {
  calculateAverageSpeed();
});


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

function calculateAverageSpeed() {
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

    let totalDuration1 = 0;
    let totalDistance1 = 0;
    let totalDuration2 = 0;
    let totalDistance2 = 0;

    for (const call of history) {
      totalDuration1 += call[0].duration_in_traffic;
      totalDistance1 += call[0].distance_value;
      totalDuration2 += call[1].duration_in_traffic;
      totalDistance2 += call[1].distance_value;
    }

    const averageSpeed1 = totalDistance1 / totalDuration1;
    const averageSpeed2 = totalDistance2 / totalDuration2;

    console.log('Velocidade média da rota 1:', averageSpeed1);
    console.log('Velocidade média da rota 2:', averageSpeed2);

    console.log(speedDifference(averageSpeed1, averageSpeed2));
    console.log(adjustSemaphoreDuration(averageSpeed1, averageSpeed2, 60, 60));
  });
}

function speedDifference(velocidade1, velocidade2) {
  if (velocidade1 > velocidade2) {
    return `caminho 1 é ${Math.round(((velocidade1 / velocidade2)*100)-100)}% mais rapido do que o 2`;
  } else {
    return `caminho 2 é ${Math.round(((velocidade2 / velocidade1)*100)-100)}% mais rapido do que o 1`;
  }
}


function adjustSemaphoreDuration(averageSpeed1, averageSpeed2, initialDuration1, initialDuration2) {
  if (averageSpeed1 === 0 || averageSpeed2 === 0) {
    console.error('Não é possível ajustar a duração do semáforo se uma das velocidades médias for 0.');
    return;
  }

  const speedRatio = averageSpeed1 / averageSpeed2;
  const percentageDifference = Math.abs((speedRatio - 1) * 100);

  let adjustedDuration1 = initialDuration1;
  let adjustedDuration2 = initialDuration2;

  if (percentageDifference > 15) {
    if (speedRatio > 1) {
      // Rota 1 é mais rápida que a rota 2, então aumentamos o tempo de duração do semáforo da rota 2
      adjustedDuration2 = Math.min(initialDuration2 * speedRatio, initialDuration2 * 1.5);
    } else if (speedRatio < 1) {
      // Rota 2 é mais rápida que a rota 1, então aumentamos o tempo de duração do semáforo da rota 1
      adjustedDuration1 = Math.min(initialDuration1 / speedRatio, initialDuration1 * 1.5);
    }
  }
  
  adjustedDuration1 = Math.round(adjustedDuration1 / 5) * 5;
  adjustedDuration2 = Math.round(adjustedDuration2 / 5) * 5;

  return {
    adjustedDuration1,
    adjustedDuration2,
  };
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

