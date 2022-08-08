require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const {createCanvas, loadImage} = require('canvas');
const {sleep} = require('../utils');

async function stickyApproved(stickerText) {
  let status;
  const form = new FormData();
  form.append('message', stickerText);
  try {
    await axios.post(`${process.env.VALIDATOR_URL}/message`, form);
  } catch (err) {
    console.log('Error with message POST');
  }
  while (!status || status === 'Review') {
    try {
      await sleep(10000);
      const res = await axios.get(`${process.env.VALIDATOR_URL}/message`);
      status = res.data.status;
    } catch (err) {
      console.log('Error with message GET');
      console.log(err.message);
    }
  }
  return status === 'Approved' ? true : false;
}

function addText(ctx, canvas, text, maxWidth, offset, maxLines) {
  const words = text.split(' ');
  let lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + ' ' + word).width + offset;
    if (width < maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);

  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
  }

  const heightOffset = ctx.measureText('M').width * Math.floor(lines.length / 2);
  ctx.fillText(lines.join('\n'), (canvas.width + 10) * 0.5, canvas.height * 0.5 - heightOffset);
}

async function createStickyFile(text) {
  const canvas = createCanvas(550, 550);
  const ctx = canvas.getContext('2d');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '60px Comic Sans MS';

  const newSticky = await loadImage(path.join(process.env.ITEMS_DIRECTORY, process.env.STICKY_TEMPLATE));
  ctx.drawImage(newSticky, 0, 0, 550, 550);
  addText(ctx, canvas, text, 500, 55, 4);
  canvas.createPNGStream().pipe(fs.createWriteStream(path.join(process.env.ITEMS_DIRECTORY, process.env.STICKY_OUTPUT)));
}

async function processSticky(text) {
  const isApproved = await stickyApproved(text);
  if (!isApproved) {
    console.log('Sticky was denied');
  } else {
    console.log('Sticky was approved');
    await createStickyFile(text);
  }
}

async function closeSticky() {
  try {
    await axios.post(`${process.env.VALIDATOR_URL}/close`);
  } catch (err) {
    console.log('Error during sticky closure');
    console.log(err.message);
  }
}

module.exports = {
  processSticky: processSticky,
  closeSticky: closeSticky,
};
