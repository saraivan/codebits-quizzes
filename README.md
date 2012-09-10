# Raffle

Edit the cookie information (log in with your browser and copy the response cookie info to the bot.js file)


## how it works

1. looks for the current money and ongoing raffles.
1. extracts relevant data from the raffles computes a series of additional info.
1. makes several simulations to assert most valuable bet choice according to the parameters defined on the configuration.
1. sends POST requests to make bids


## points of difficulty

1. apparently no throttling existed on the server side, therefore some aggressive bots got many valuable bids before mine did.
1. there was no clear way of knowing who got the raffle money, one only knew when he himself won.
1. it was hard to tweak the bot since there were no training grounds (there could be an additional page were the money didn't count in the end but could allow us to test the bot before spending all our money...)



## results

This bot got the 10th place on the competition.
