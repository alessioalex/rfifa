'use strict';

const Snoocore = require('snoocore');

/*
   Our new instance associated with a single account.
   It can take in various configuration options.
 */
const reddit = new Snoocore({
  // Unique string identifying the app
  userAgent: '/u/alessioalex rfifa@0.0.1',
  // It's possible to adjust throttle less than 1 request per second.
  // Snoocore will honor rate limits if reached.
  throttle: 300,
  oauth: {
    type: 'script',
    key: process.env.REDDIT_KEY,
    secret: process.env.REDDIT_SECRET,
    username: process.env.REDDIT_USER,
    password: new Buffer(process.env.REDDIT_PASS, 'base64').toString('utf8')
    //redirectUri: 'http://localhost:3000',
    // The OAuth scopes that we need to make the calls that we
    // want. The reddit documentation will specify which scope
    // is needed for evey call
    // scope: [ 'identity', 'read', 'vote' ]
  }
});

// reddit('/r/fifa/about/log').get().then(function(result) {
//   console.log(JSON.stringify(result, null, 2));
// });
//
// console.log('------------------');

const API = {};

API.getReports = (cb) => {
  console.log('making reddit request');

  reddit('/r/fifa/about/reports').get().then(function(result) {
    // result.data.children.length
    // children[.].data.author
    // children[.].data.body
    // "mod_reports": [
    //   [
    //     null,
    //     "AutoModerator"
    //   ]
    // ],
    // "user_reports": [
    //   [
    //     "offensive username",
    //     1
    //   ]
    // ],
    // "link_title": "All these players untradeable, 800k. Go!",
    // "banned_by": null,
    // "removal_reason": null,
    // "link_id": "t3_5v35f0",
    // "link_author": "[deleted]",

    // result = require('./sample-report.json');

    const reports = result.data.children.length;
    let msg = `*Reports: ${reports}*\n`;

    result.data.children.forEach((r, i) => {
      const report = r.data;

      msg += `\n#${i+1}: ${report.body} - *${report.author}*\n`;

      if (report.mod_reports.length || report.user_reports.length) {
        msg += '\nReports: \n';

        report.mod_reports.forEach(i => {
          msg += `${i[1]} - ${i[0]}\n`;
        });

        report.user_reports.forEach(i => {
          msg += `User - ${i[0]}\n`;
        });
      }

      msg += `------`;
    });

    cb(null, msg);
    // console.log(JSON.stringify(result, null, 2));
  });
};

// API.getConversations = (cb) => {
  // /api/mod/conversations?sort=recent&state=new&entity=fifa
  // reddit('/r/fifa/about/message/inbox').get().then(function(result) {
  //   console.log(result);
  // });
// };

API.getUnmoderatedCount = (cb) => {
  // TODO: error handling
  // /api/mod/conversations?sort=recent&state=new&entity=fifa
  reddit('/r/fifa/about/unmoderated').get().then(function(result) {
    cb(null, result.data.children.length);
  });
};

module.exports = API;
