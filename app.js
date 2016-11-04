var restify = require('restify');
var builder = require('botbuilder');
var http = require('http');

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
  var body = "<html><iframe height=550 src='https://webchat.botframework.com/embed/airBerlinQuery?s=P-3BUxC8uDE.cwA.Pys.MV295X7WE21Tj-3Df42VO9P_yuHTTtQVw87cKnc3nUg'></iframe></html>";
  res.writeHead(200, {
    'Content-Length': Buffer.byteLength(body),
    'Content-Type': 'text/html'
  });
  res.write(body);
  res.end();
  next();
});

//=========================================================
// API Info
//=========================================================
var apiToken = process.env.APITOKEN;
//var apiEndpoint = "https://xap.ix-io.net/api/v1/airberlin_lab_2016/available_combinations";



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
    builder.Prompts.choice(session, "What city are you starting your journey in?", ["LHR", "AAL"]);
  },
  function (session, results) {
    session.dialogData.start = results.response;
    builder.Prompts.choice(session, "Where would you like to fly to?", ["LHR", "AAL"]);
  },
  function (session, results) {
    session.dialogData.destination = results.response;
    session.send("Looking up flights from " + session.dialogData.start.entity + " to " + session.dialogData.destination.entity + "for you now...");
    // queryAPI(session.dialogData.start.entity, session.dialogData.destination.entity, function(err, res) {
      session.send("Results will be here");
      session.endDialog();
    // })
  }
]);

// bot.dialog("/commands", [
//   function(session) {
//     builder.Prompts.choice(session, "Here are the commands you can send me:", [])
//   }
// ]);

function queryAPI(origin, destination, apiResponseCallback) {
  var params = "";
  var options = {
    host: 'xap.ix-io.net',
    path: '/api/v1/airberlin_lab_2016/available_combinations'+params,
    auth: apiToken,
    headers: {
      "Accept": "application/json"
    }
  };

  
  http.get(options, function (res) {
    var apiResponseString = '';
    console.log('Status Code: ' + res.statusCode);
    if (res.statusCode != 200) {
      apiResponseCallback(new Error("Non 200 Response"));
    }

    res.on('data', function (data) {
      apiResponseString += data;
    });

    res.on('end', function () {
      var apiResponseObject = JSON.parse(apiResponseString);

      if (apiResponseObject.error) {
        console.log("API error: " + apiResponseObj.error.message);
        apiResponseCallback(new Error(apiResponseObj.error.message));
      } else {
        apiResponseCallback(null, apiResponseObject);
      }
    });
  }).on('error', function (e) {
    console.log("Communications error: " + e.message);
    apiResponseCallback(new Error(e.message));
  });
}