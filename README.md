## Inspiration
Planning a team trip can be challenging. Removing the friction of finding out how to get from your city to the team-city makes things a lot easier! Do this within slack, Microsoft Teams, Skype, or the web!

## What it does
Look for flight options from the city the team is in (or each team member) to the city everyone needs to get to. The app queries for flight combinations and returns the top options to the team without them leaving the tool they're already using to plan the trip.

## How I built it
The app is built with the Microsoft Bot Framework, LUIS.ai from Microsoft, the AirBerlin APIs, and NodeJs.

## Challenges I ran into
The bot can use natural language processing as well as directed commands. Directed commands are relatively straight forward to manage, but natural language questions require lots of training data and figuring out all the ways someone might ask even a simple question is tricky!

## Accomplishments that I'm proud of
Microsoft Teams talks to the Bot Framework, the Bot Framework talks to LUIS for natural language processing, LUIS returns to the Bot, the Bot acts on the response which leads to a query on the Air Berlin API, the response from the API provides an answer to the user. Getting each of those components to talk to each other successfully is something I'm proud of!

## What I learned
Bots need to be able to understand directed commands as well as natural language questions. Different users interact with the bot in their own way.

## What's next for Air Berlin Team Flights
Integrate a query to get airport codes for cities -- and for cities with multiple airports confirm the correct airport option.