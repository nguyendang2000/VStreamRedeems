const {buildRequest} = require('./utils');

function pollPosition(ws) {
  ws.send(buildRequest('currentModel'));
  setTimeout(() => pollPosition(ws), process.env.POLL_INTERVAL);
}

function changeModels(ws, modelID) {
  ws.send(buildRequest('modelChange', {modelID: modelID}));
}

function spinModel(ws) {
  ws.send(buildRequest('modelMove', {timeInSeconds: 2, valuesAreRelativeToModel: true, rotation: 180}));
  setTimeout(() => {
    ws.send(buildRequest('modelMove', {timeInSeconds: 2, valuesAreRelativeToModel: true, rotation: -90}));
    setTimeout(() => {
      ws.send(buildRequest('modelMove', {timeInSeconds: 2, valuesAreRelativeToModel: false, rotation: 0}));
    }, 200);
  }, 1000);
}

module.exports = {
  pollPosition: pollPosition,
  changeModels: changeModels,
  spinModel: spinModel,
};
