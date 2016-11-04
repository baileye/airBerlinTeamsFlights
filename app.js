var restify = require('restify');
var builder = require('botbuilder');

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log("%s listening to %s", server.name, server.url); 
});
  
// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);
server.post("/api/messages", connector.listen());

// TEST WEB CHAT:
server.get("/", function(req, res, next) {
  var body = "<html><iframe src='https://webchat.botframework.com/embed/airBerlinQuery?s=P-3BUxC8uDE.cwA.Pys.MV295X7WE21Tj-3Df42VO9P_yuHTTtQVw87cKnc3nUg'></iframe></html>";
  res.writeHead(200, {
    'Content-Length': Buffer.byteLength(body),
    'Content-Type': 'text/html'
  });
  res.write(body);
  res.end();
  next();
});



//=========================================================
// Bots Dialogs
//=========================================================

bot.dialog("/", [
  function (session, args, next) {
    session.beginDialog("/routeQuery");
  }
]);

bot.dialog("/routeQuery", [
  function (session) {
    builder.Prompts.choice(session, "Are you feeling unwell today?", ["Yes", "No"]);
  },
  function (session, results) {
    session.dialogData.feelingSick = results.response;
    if (session.dialogData.feelingSick.entity == "Yes") {
      // sick
      builder.Prompts.choice(session, "Is your head or neck sore?", ["Yes", "No"]);
    } else {
      // not sick
      builder.Prompts.choice(session, "Did you exercise hard yesterday?", ["Yes", "No"]);
    }
  },
  function (session, results) {
    if (session.dialogData.feelingSick.entity == "Yes") {
      if (results.response.entity == "Yes") {
        session.send("I don't think you should run today. If you're not feeling well for a few days I can delay your next order by a week?");
      } else {
        session.send("Go for a gentle run today. Make a Nut-late with the Bonk-Cup after you stretch.");
      }
    } else {
      if (results.response.entity == "Yes") {
        session.send("Go for a moderate run today. I think the Mid-Cup from your last order will really help your recovery.");
      } else {
        session.send("Go for a normal run today and eat the Super-Cup from your last order during your run.");
      }
    }
    session.endDialog();
  }
]);

// bot.dialog("/commands", [
//   function(session) {
//     builder.Prompts.choice(session, "Here are the commands you can send me:", [])
//   }
// ]);