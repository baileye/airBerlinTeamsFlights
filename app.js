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
  var body = "<html><iframe height=550 width=350 src='https://webchat.botframework.com/embed/airBerlinQuery?s=P-3BUxC8uDE.cwA.Pys.MV295X7WE21Tj-3Df42VO9P_yuHTTtQVw87cKnc3nUg'></iframe></html>";
  res.writeHead(200, {
    'Content-Length': Buffer.byteLength(body),
    'Content-Type': 'text/html'
  });
  res.write(body);
  res.end();
  next();
});

// Universal Actions
bot.endConversationAction('goodbye', 'Goodbye :)', { matches: /^goodbye/i });

//=========================================================
// API Info
//=========================================================
var apiToken = process.env.APITOKEN;

// INTENTS
var model = process.env.LUISMODEL 
var recognizer = new builder.LuisRecognizer(model);
var intents = new builder.IntentDialog({ recognizers: [recognizer] });
intents.matches(/trip/i, '/routeQuery');
intents.matches(/flight/i, '/routeQuery');
intents.matches(/holiday/i, '/routeQuery');
intents.matches(/^help/i, '/help');
intents.matches(/who/i, '/who');
intents.onDefault('/help');

intents.matches('flightquery', '/routeQuery');

//=========================================================
// Bots Dialogs
//=========================================================

bot.dialog("/who", [
  function (session, args) {
    session.send("I am the Air Berlin flight booking bot. I can look up flights for you, and help you make the booking.");
    session.endDialog();
  }
]);

bot.dialog("/", intents);

bot.dialog("/help", [
  function (session, args) {
    // console.log(session);
    // console.log(args);
    session.send("To start a flight search you can either use the direct command 'trip', or ask me to 'start planning a trip'");
    session.endDialog();
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
    session.send("Looking up flights from " + session.dialogData.origin + " to " + session.dialogData.destination + " for you now");
    session.sendTyping();
    availabitiesQuery(session.dialogData.origin, session.dialogData.destination, function(err, res) {
      console.log(res);
      if (err) {
        // session.send("Woops, I'm having trouble finding that information for you. Ask me again shortly!");
        // session.endDialog();

        // API is having issues, so adding in test data
        session.dialogData.flightDate = "2016-11-28";
        session.dialogData.flightPrice = "147.80";

        session.dialogData.flightFuelPrice = "0.00";
        session.dialogData.flightTaxPrice = "52.80";
        session.dialogData.flightPlanePrice = "95.00";
        // END TEST DATA
      } else {
        session.dialogData.flightDate = res.availabilities[0].next_outbound_flight_date;
        session.dialogData.flightPrice = res.combinations[0].onward_flight_info.passenger_pricing.pricing["@total"];

        session.dialogData.flightFuelPrice = res.combinations[0].onward_flight_info.passenger_pricing.pricing.fare_detail[0]['@amount'];
        session.dialogData.flightTaxPrice = res.combinations[0].onward_flight_info.passenger_pricing.pricing.fare_detail[2]['@amount'];
        session.dialogData.flightPlanePrice = res.combinations[0].onward_flight_info.passenger_pricing.pricing.fare_detail[1]['@amount'];
      }
      var card = new builder.HeroCard(session)
          .title(session.dialogData.origin + " -> " + session.dialogData.destination)
          .subtitle(session.dialogData.flightDate)
          .text("€" + session.dialogData.flightPrice)
          .images([
                builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/commons/d/d4/Logo_Air_Berlin_mit_Claim.jpg")
          ])
          .buttons([
              builder.CardAction.imBack(session, "Book", "Book"),
              builder.CardAction.imBack(session, "New Search", "New Search")
          ]);
      var msg = new builder.Message(session).attachments([card]);
      builder.Prompts.choice(session, msg, ['Book', 'New Search']);
    });
  },
  function (session, results) {
    console.log(results.response);
    if (results.response.entity == "Book") {
      session.send("Great! I'll need some information from you to make the booking.");
      builder.Prompts.text(session, "What's your full name?");
    } else {
      // session.endDialog();
      session.beginDialog('/routeQuery');
    }
  },
  function (session, results) {
    session.dialogData.fullName = results.response;
    // TODO: Lookup credit card details of user, for now pretend they're already set up
    var card = new builder.HeroCard(session)
        .title(session.dialogData.fullName)
        .subtitle("123 Fake St, London, UK")
        .text("XXXX XXXX XXXX 1234  -  Exp: 12/18")
        .buttons([
            builder.CardAction.imBack(session, "That's me!", "That's me!"),
            builder.CardAction.imBack(session, "Not correct", "Not correct")
    ]);
    var msg = new builder.Message(session).attachments([card]);
    builder.Prompts.choice(session, msg, ["That's me", "Not correct"]);      
  },
  function(session, results) {
    if (results.response.entity == "Not correct") {
      session.send("Good job on testing this path -- this will ask the user to enter their information and be saved.");
      session.send("For now I'm going to pretend you are " + session.dialogData.fullName + " who lives at 123 Fake Street.");
    }
    session.send("Great! I'll use your credit card on file for the booking.");
    session.sendTyping();
    // Send a receipt
    var msg = new builder.Message(session)
        .attachments([
            new builder.ReceiptCard(session)
                .title("Booked: " + session.dialogData.origin + " -> " + session.dialogData.destination)
                .items([
                    builder.ReceiptItem.create(session, "€" + session.dialogData.flightFuelPrice, "Fuel Charge"),
                    builder.ReceiptItem.create(session, "€" + session.dialogData.flightPlanePrice, "Flight")
                ])
                .facts([
                    builder.Fact.create(session, session.dialogData.fullName, "Name"),
                    builder.Fact.create(session, session.dialogData.flightDate, "Flight Date"),
                    // builder.Fact.create(session, "1234567898", "Order Number"),                  
                    builder.Fact.create(session, "1234567898", "Order Number"),
                    builder.Fact.create(session, "VISA 4076", "Payment Method"),
                    builder.Fact.create(session, "E-Mail", "Delivery Method")
                ])
                .tax("€" + session.dialogData.flightTaxPrice)
                .total("€" + session.dialogData.flightPrice)
    ]);
    session.send(msg);
    session.endDialog();
  }
]);

function availabitiesQuery(origin, destination, apiResponseCallback) {
  var query = 'availabilities';
  var params = "?filter%5Bdeparture%5D=" + origin + "&filter%5Bdestination%5D=" + destination;
  params += "&fields%5Bavailabilities%5D=destination%2Cdeparture%2Crandom_id%2Cprevious_outbound_flight_date%2Cnext_outbound_flight_date&include=combinations&sort=random_id&page%5Bnumber%5D=1&page%5Bsize%5D=100";
  queryAPI(query+params, apiResponseCallback);
}

function queryAPI(endpoint, apiResponseCallback) {
  var options = {
    host: 'xap.ix-io.net',
    path: '/api/v1/airberlin_lab_2016/'+endpoint,
    // auth: apiToken,
    headers: {
      "Accept": "application/json",
      "Authorization": apiToken
    }
  };

  https.get(options, function (res) {
    var apiResponseString = '';
    console.log('Status Code: ' + res.statusCode);
    //console.log(res);
    if (res.statusCode != 200) {
      apiResponseCallback(new Error("Non 200 Response"));
    } else {

      res.on('data', function (data) {
        apiResponseString += data;
      });

      res.on('end', function () {
        var apiResponseObject;
        try {
          apiResponseObject = JSON.parse(apiResponseString);
        } catch (e) {
          // apiResponseCallback('JSON parsing error');
        }

        if ( (typeof apiResponseObject !== 'undefined') && (apiResponseObject.error) ) {
          console.log("API error: " + apiResponseObject.error.message);
          apiResponseCallback(new Error(apiResponseObject.error.message));
        } else {
          apiResponseCallback(null, apiResponseObject);
        }
      });
    }
  }).on('error', function (e) {
    console.log("Communications error: " + e.message);
    apiResponseCallback(new Error(e.message));
  });
}