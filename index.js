'use strict';

const reddit = require('./reddit-api');
const debug = require('debug')('bot:slack');

let RtmClient = require('@slack/client').RtmClient;
let CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
let RTM_EVENTS = require('@slack/client').RTM_EVENTS;

let bot_token = process.env.SLACK_BOT_TOKEN;

let rtm = new RtmClient(bot_token);
let UNMODERATED_THRESHOLD = 20;
let unmoderatedAlertSet = true;
let generalChannelId;

let alertUnmoderated = () => {
  if (!unmoderatedAlertSet) {
    return;
  }

  reddit.getUnmoderatedCount((err, count) => {
    if (count > UNMODERATED_THRESHOLD) {
      rtm.sendMessage(
        `Unmoderated alert: ${count} things need your attention!`,
        generalChannelId
      );
    }

    setTimeout(() => {
      alertUnmoderated();
    }, 5 * 60 * 1000);
  });
};


// The client will emit an RTM.AUTHENTICATED event on successful connection, with the
// `rtm.start` payload if you want to cache it
rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, function(rtmStartData) {
  debug(`Logged in as ${rtmStartData.self.name} of team ${rtmStartData.team.name}`);

  const channels = rtm.dataStore.channels;

  generalChannelId = Object.keys(channels)
    .find(id => {
      return channels[id].name === 'general';
      // return channels[id].name === 'bot';
    });

  if (unmoderatedAlertSet) {
    alertUnmoderated();
  }
});

// you need to wait for the client to fully connect before you can send messages
// rtm.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, function() {
//   console.log(arguments);
//
//   // rtm.sendMessage("Hello!", channel);
// });

rtm.on(RTM_EVENTS.MESSAGE, function handleRtmMessage(message) {
  if (!message.channel || !message.user) {
    return;
  }

  const channel = rtm.dataStore.getChannelGroupOrDMById(message.channel);
  const user = rtm.dataStore.getUserById(message.user);

  if (channel.name !== 'bot' || !/^\!/.test(message.text)) {
    return;
  }

  debug(
    'User %s posted a message in \'#%s\' channel',
    user.name,
    channel.name
  );

  debug(message);

  if (message.text === '!reports') {
    reddit.getReports((err, msg) => {
      debug(`reddit: ${msg}`);

      rtm.sendMessage(msg, channel.id);
    });
  }

  if (message.text === '!enable unmoderated alert') {
    if (channel.name !== 'general') { return; }

    // horrible I know
    if (!unmoderatedAlertSet) {
      unmoderatedAlertSet = true;

      alertUnmoderated((msg) => {
        rtm.sendMessage(msg, channel.id);
      });
    }
  } else if (message.text === '!disable unmoderated alert') {
    if (channel.name !== 'general') { return; }

    unmoderatedAlertSet = false;
  }

  if (message.text.indexOf('!unmoderated threshold') !== -1) {
    if (channel.name !== 'general') { return; }

    try {
      UNMODERATED_THRESHOLD = parseInt(message.text.split(' ').pop(), 10) || UNMODERATED_THRESHOLD;
      rtm.sendMessage('UNMODERATED_THRESHOLD now set to ' + UNMODERATED_THRESHOLD, channel.id);
    } catch (e) {
      rtm.sendMessage('Bad syntax, use something like "!unmoderated threshold 15"', channel.id);
    }
  }
});

rtm.start();
