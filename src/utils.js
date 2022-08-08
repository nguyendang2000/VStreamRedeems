require('dotenv').config();

function getTokenRequest(pluginName, pluginDev) {
  return JSON.stringify({
    'apiName': 'VTubeStudioPublicAPI',
    'apiVersion': '1.0',
    'requestID': 'SomeID',
    'messageType': 'AuthenticationTokenRequest',
    'data': {
      'pluginName': pluginName,
      'pluginDeveloper': pluginDev,
    },
  });
}

function buildRequest(requestType, params) {
  const request = {
    'apiName': 'VTubeStudioPublicAPI',
    'apiVersion': '1.0',
    'requestID': 'SomeID',
  };
  if (requestType === 'auth') {
    request['messageType'] = 'AuthenticationRequest';
    request['data'] = {
      'pluginName': process.env.PLUGIN_NAME,
      'pluginDeveloper': process.env.PLUGIN_DEV,
      'authenticationToken': process.env.TOKEN,
    };
  } else if (requestType === 'stats') {
    request['messageType'] = 'StatisticsRequest';
  } else if (requestType === 'folders') {
    request['messageType'] = 'VTSFolderInfoRequest';
  } else if (requestType === 'currentModel') {
    request['messageType'] = 'CurrentModelRequest';
  } else if (requestType === 'allModels') {
    request['messageType'] = 'AvailableModelsRequest';
  } else if (requestType === 'modelChange') {
    request['messageType'] = 'ModelLoadRequest';
    request['data'] = {
      'modelID': params['modelID'],
    };
  } else if (requestType === 'modelMove') {
    request['messageType'] = 'MoveModelRequest';
    request['data'] = {
      'timeInSeconds': params['timeInSeconds'] || 2,
      'valuesAreRelativeToModel': params['valuesAreRelativeToModel'],
      'positionX': params['positionX'],
      'positionY': params['positionY'],
      'rotation': params['rotation'],
      'size': params['size'],
    };
  } else if (requestType === 'hotkeyList') {
    request['messageType'] = 'HotkeysInCurrentModelRequest';
    if (params) {
      request['data'] = {
        'modelID': params['modelID'],
        'live2DItemFileName': params['live2DItemFileName'],
      };
    }
  } else if (requestType === 'hotkeyToggle') {
    request['messageType'] = 'HotkeyTriggerRequest';
    request['data'] = {
      'hotkeyID': params['hotkeyID'],
      'itemInstanceID': params['itemInstanceID'],
    };
  } else if (requestType === 'expressionList') {
    request['messageType'] = 'ExpressionStateRequest';
    request['data'] = {
      'details': params['details'],
      'expressionFile': params['expressionFile'],
    };
  } else if (requestType === 'expressionToggle') {
    request['messageType'] = 'ExpressionActivationRequest';
    request['data'] = {
      'expressionFile': params['expressionFile'],
      'active': params['active'],
    };
  } else if (requestType === 'itemLoad') {
    request['messageType'] = 'ItemLoadRequest';
    request['data'] = {
      'fileName': params['fileName'],
      'positionX': params['positionX'] || 0,
      'positionY': params['positionY'] || 0,
      'size': params['size'] || 0.33,
      'rotation': params['rotation'] || 0,
      'fadeTime': params['fadeTime'] || 0.5,
      'order': params['order'] || -15,
      'failIfOrderTaken': params['failIfOrderTaken'] || false,
      'smoothing': params['smoothing'] || 0,
      'censored': params['censored'] || false,
      'flipped': params['flipped'] || false,
      'locked': params['locked'] || false,
      'unloadWhenPluginDisconnects': params['unloadWhenPluginDisconnects'] || true,
    };
  } else if (requestType === 'itemUnload') {
    request['messageType'] = 'ItemUnloadRequest';
    request['data'] = {
      'unloadAllInScene': params['unloadAllInScene'] || false,
      'unloadAllLoadedByThisPlugin': params['unloadAllLoadedByThisPlugin'] || false,
      'allowUnloadingItemsLoadedByUserOrOtherPlugins': params['allowUnloadingItemsLoadedByUserOrOtherPlugins'] || true,
      'instanceIDs': params['instanceIDs'],
      'fileNames': params['fileNames'],
    };
  }
  return JSON.stringify(request);
}

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  getTokenRequest: getTokenRequest,
  buildRequest: buildRequest,
  pollPosition: pollPosition,
  changeModels: changeModels,
  spinModel: spinModel,
  sleep: sleep,
};
