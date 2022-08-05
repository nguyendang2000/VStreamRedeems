require('dotenv').config();

const WebSocket = require('ws');
const PORT = process.env.PORT;
const ws = new WebSocket(`ws://localhost:${PORT}`);
const {buildRequest, pollPosition, changeModels, spinModel} = require('./utils');

const {ApiClient} = require('twitch');
const {StaticAuthProvider} = require('twitch-auth');
const {PubSubClient} = require('twitch-pubsub-client');
const clientId = process.env.TWITCH_CLIENT;
const accessToken = process.env.TWITCH_ACCESS;
const authProvider = new StaticAuthProvider(clientId, accessToken);
const apiClient = new ApiClient({authProvider});
const pubSubClient = new PubSubClient();

let currX = 0;
let currY = 0;
let currSize = -50;

ws.on('open', () => {
  ws.send(buildRequest('auth'));
});

ws.on('message', (message) => {
  const response = JSON.parse(message);
  const data = response.data;
  if (response.messageType === 'CurrentModelResponse') {
    const curr = data.modelPosition;
    currX = curr.positionX;
    currY = curr.positionY;
    currSize = curr.size;
    console.log(data);
  }
});

async function main() {
  if (ws.readyState === 0) {
    setTimeout(main, 500);
  } else {
    pollPosition(ws);
    const userId = await pubSubClient.registerUserListener(apiClient);
    await pubSubClient.onRedemption(userId, (redemption) => { // PubSubRedemptionMessage
      switch (redemption.rewardName) {
        case 'Headpat':
          ws.send(buildRequest('hotkeyToggle', {hotkeyID: process.env.HEADPAT_BLUE}));
          ws.send(buildRequest('hotkeyToggle', {hotkeyID: process.env.HEADPAT_PINK}));
          break;
        case 'Cat/Dog Ears on/off':
          ws.send(buildRequest('hotkeyToggle', {hotkeyID: process.env.EARS_BLUE}));
          ws.send(buildRequest('hotkeyToggle', {hotkeyID: process.env.EARS_PINK}));
          break;
        case 'Baby Hat on/off':
          ws.send(buildRequest('hotkeyToggle', {hotkeyID: process.env.HAT_BLUE}));
          ws.send(buildRequest('hotkeyToggle', {hotkeyID: process.env.HAT_PINK}));
          break;
        case 'Model Change (Blue)':
          changeModels(ws, process.env.MODEL_BLUE);
          setTimeout(() => {
            ws.send(buildRequest('modelMove', {timeInSeconds: 0.5, valuesAreRelativeToModel: false, positionX: currX, positionY: currY, size: currSize}));
          }, 1000);
          break;
        case 'Model Change (Pink)':
          changeModels(ws, process.env.MODEL_PINK);
          setTimeout(() => {
            ws.send(buildRequest('modelMove', {timeInSeconds: 0.5, valuesAreRelativeToModel: false, positionX: currX, positionY: currY, size: currSize}));
          }, 1000);
          break;
        case 'Model Change (Jelly Tech Tips)':
          changeModels(ws, process.env.MODEL_JTT);
          setTimeout(() => {
            ws.send(buildRequest('modelMove', {timeInSeconds: 0.5, valuesAreRelativeToModel: false, positionX: currX, positionY: -0.4, size: currSize}));
          }, 1000);
          break;
        case 'Spin':
          spinModel(ws);
          break;
        case 'Scoot Left':
          ws.send(buildRequest('modelMove', {timeInSeconds: 2, valuesAreRelativeToModel: true, positionX: -0.005}));
          break;
        case 'Scoot Right':
          ws.send(buildRequest('modelMove', {timeInSeconds: 2, valuesAreRelativeToModel: true, positionX: 0.005}));
          break;
        case 'Gigantamax Jelly':
        {
          const prevPos = {x: currX, y: currY, size: currSize};
          ws.send(buildRequest('modelMove', {timeInSeconds: 2, valuesAreRelativeToModel: false, positionX: 0, positionY: -4.5, size: 100}));
          setTimeout(() => {
            ws.send(buildRequest('modelMove', {timeInSeconds: 2, valuesAreRelativeToModel: false, positionX: prevPos.x, positionY: prevPos.y, size: prevPos.size}));
          }, 10000);
          break;
        }
      }
    });
  }
}

main();
