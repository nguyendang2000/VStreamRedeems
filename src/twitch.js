require('dotenv').config();
const fs = require('fs/promises');
const WebSocket = require('ws');
const ws = new WebSocket(`ws://localhost:${process.env.PORT}`);
const {buildRequest, pollPosition, changeModels, spinModel} = require('./utils');
const {processSticky, closeSticky} = require('./utils/sticky');
const {ApiClient} = require('twitch');
const {RefreshableAuthProvider, StaticAuthProvider} = require('twitch-auth');
const {PubSubClient} = require('twitch-pubsub-client');

const clientId = process.env.TWITCH_CLIENT;
const clientSecret = process.env.TWITCH_SECRET;

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
  }
});

async function main() {
  if (ws.readyState === 0) {
    setTimeout(main, 500);
  } else {
    const tokenData = JSON.parse(await fs.readFile(process.env.TOKEN_PATH, 'UTF-8'));
    const authProvider = new RefreshableAuthProvider(
        new StaticAuthProvider(clientId, tokenData.accessToken),
        {
          clientSecret,
          refreshToken: tokenData.refreshToken,
          expiry: tokenData.expiryTimestamp === null ? null : new Date(tokenData.expiryTimestamp),
          onRefresh: async ({accessToken, refreshToken, expiryDate}) => {
            const newTokenData = {
              accessToken,
              refreshToken,
              expiryTimestamp: expiryDate === null ? null : expiryDate.getTime(),
            };
            await fs.writeFile(process.env.TOKEN_PATH, JSON.stringify(newTokenData, null, 4), 'UTF-8');
          },
        },
    );
    const apiClient = new ApiClient({authProvider});
    const pubSubClient = new PubSubClient();
    pollPosition(ws);
    const userId = await pubSubClient.registerUserListener(apiClient);
    await pubSubClient.onRedemption(userId, (redemption) => { // PubSubRedemptionMessage
      switch (redemption.rewardName) {
        case 'Headpat':
          ws.send(buildRequest('hotkeyToggle', {hotkeyID: process.env.HEADPAT_BLUE}));
          ws.send(buildRequest('hotkeyToggle', {hotkeyID: process.env.HEADPAT_PINK}));
          break;
        case 'Cat Ears on/off':
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
            ws.send(buildRequest('modelMove', {valuesAreRelativeToModel: false, positionX: currX, positionY: currY, size: currSize}));
          }, 1000);
          break;
        case 'Model Change (Pink)':
          changeModels(ws, process.env.MODEL_PINK);
          setTimeout(() => {
            ws.send(buildRequest('modelMove', {valuesAreRelativeToModel: false, positionX: currX, positionY: currY, size: currSize}));
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
        case 'Shift Left':
          ws.send(buildRequest('modelMove', {valuesAreRelativeToModel: true, positionX: process.env.SHIFT_DISTANCE * -1}));
          break;
        case 'Shift Right':
          ws.send(buildRequest('modelMove', {valuesAreRelativeToModel: true, positionX: process.env.SHIFT_DISTANCE}));
          break;
        case 'Gigantamax Jelly':
        {
          const prevPos = {x: currX, y: currY, size: currSize};
          ws.send(buildRequest('modelMove', {valuesAreRelativeToModel: false, positionX: 0, positionY: -4.5, size: 100}));
          setTimeout(() => {
            ws.send(buildRequest('modelMove', {valuesAreRelativeToModel: false, positionX: prevPos.x, positionY: prevPos.y, size: prevPos.size}));
          }, process.env.GIGA_DURATION);
          break;
        }
        case 'Forehead Sticky':
          (async () => {
            await processSticky(redemption.message);
            ws.send(buildRequest('hotkeyToggle', {hotkeyID: process.env.STICKY_BLUE}));
            ws.send(buildRequest('hotkeyToggle', {hotkeyID: process.env.STICKY_PINK}));
            setTimeout(async () => {
              await closeSticky();
            }, process.env.STICKY_DURATION);
          })();
          break;
      }
    });
  }
}

main();
