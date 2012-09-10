# Raffle

Edit the cookie information (log in with your browser and copy the response cookie info to the bot.js file)


## roadmap

I started by trying to script [phantomjs](http://phantomjs.org/). I found it hard to control the callback behaviour.
Then I briefly attempted to use [zombiejs](http://zombie.labnotes.org/).
Ended up using a combination of the [request](https://github.com/mikeal/request) module and [jsdom](https://github.com/tmpvar/jsdom).

While testing these different ways of scripting the bot, I wrote the webscrapping and strategy parts, which didn't differ all that much throughout the former.

**Request** is used to fetch the pages and submit bids,
while **jsdom** offers a DOM interface to a HTML document for easy webscrapping. This was the most low-level approach of the three, since this doesn't keep a session, window
or scripting environment.


## how it works

1. looks for the current money and ongoing raffles.
1. extracts relevant data from the raffles computes a series of additional info.
1. makes several simulations to assert most valuable bet choice according to the parameters defined on the configuration.
1. sends POST requests to make bids if decided to play
1. watch command makes sure the algorithm runs again ASAP (nodejs is therefore restarted, since the request module acted weird after several seconds spawning requests)


# configuration

**N** is the number of simulations that are run as base for the decision, for each bid.
That is, imagine a raffle has 12 tickets available.
The bot determines the benefit of betting and losing 1 ticket (min, in this case -cost) and the benefit of betting and winning the same ticket (max, payout - cost).
It randomizes N raffle results and checks what's the min and average benefit. Then it tries the same for buying 2 of the tickets, etc.

There are several cutoff parameters.

**MIN_AVG_RATIO** is used to check the ratio of average benefit versus the bot money. Ex: MIN_AVG_RATIO of 0.1 means that the bid is put only
if on average one will earn 10% of its money.

**MAX_BET_RATIO** defines a top bet that the bot can place. Ex: for 0.5 means that the bot won't spend above half his money on a raffle.

Probably I should have used different parameters, based on the probability of winning... Oh well :P



## points of difficulty

1. apparently no throttling existed on the server side, therefore some aggressive bots got many valuable bids before mine did.
1. there was no clear way of knowing who got the raffle money, one only knew when he himself won.
1. it was hard to tweak the bot since there were no training grounds (there could be an additional page were the money didn't count in the end but could allow us to test the bot before spending all our money...)



## results

This bot got the 10th place on the competition.
Given that I didn't begin my participation on day one nor did I spend whole days coding it, wasn't bad at all.
Additionally I got familiar with a lot of browser simulation environments.
