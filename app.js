var restify = require('restify');
var builder = require('botbuilder');
var https = require('https');

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

// INTENTS
var model = process.env.LUISMODEL 
var recognizer = new builder.LuisRecognizer(model);
var intents = new builder.IntentDialog({ recognizers: [recognizer] });
intents.matches(/^trip/i, '/routeQuery');
intents.matches(/^help/i, '/help');
intents.onDefault(builder.DialogAction.send("I'm sorry. I didn't understand."));

intents.matches('flightquery', '/routeQuery');

//=========================================================
// Bots Dialogs
//=========================================================

bot.dialog("/", intents);

bot.dialog("/help", [
  function (session) {
    session.send("To start a flight search you can either use the direct command 'trip', or ask me to 'start planing a trip'");
  }
]);

bot.dialog("/routeQuery", [
  function (session) {
    builder.Prompts.text(session, "What city are you starting your journey in?");
  },
  function (session, results) {
    session.dialogData.origin = results.response;
    builder.Prompts.text(session, "Where would you like to fly to?");
  },
  function (session, results) {
    session.dialogData.destination = results.response;
    session.send("Looking up flights from " + session.dialogData.origin + " to " + session.dialogData.destination + " for you now...");
    queryAPI(session.dialogData.origin, session.dialogData.destination, function(err, res) {
      if (err) {
        session.send("Woops, something went wrong. How about you try again?");
      } else {
        session.send("How about these flight options...");
      }
      session.endDialog();
    });
  }
]);

function queryAPI(origin, destination, apiResponseCallback) {
  var params = "?filter%5Bdeparture%5D=" + origin + "&filter%5Bdestination%5D=" + destination;
  params += "&fields%5Bavailabilities%5D=destination%2Cdeparture%2Crandom_id%2Cprevious_outbound_flight_date%2Cnext_outbound_flight_date&sort=random_id&page%5Bnumber%5D=1&page%5Bsize%5D=100";
  var options = {
    host: 'xap.ix-io.net',
    path: '/api/v1/airberlin_lab_2016/availabilities'+params,
    // auth: apiToken,
    headers: {
      "Accept": "application/json",
      "Authorization": apiToken
    }
  };

  https.get(options, function (res) {
    var apiResponseString = '';
    console.log('Status Code: ' + res.statusCode);
    console.log(res);
    if (res.statusCode != 200) {
      apiResponseCallback(new Error("Non 200 Response"));
    }

    res.on('data', function (data) {
      apiResponseString += data;
    });

    res.on('end', function () {
      var apiResponseObject = JSON.parse(apiResponseString);

      if (apiResponseObject.error) {
        console.log("API error: " + apiResponseObject.error.message);
        apiResponseCallback(new Error(apiResponseObject.error.message));
      } else {
        apiResponseCallback(null, apiResponseObject);
      }
    });
  }).on('error', function (e) {
    console.log("Communications error: " + e.message);
    apiResponseCallback(new Error(e.message));
  });
}