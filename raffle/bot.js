'use strict';

/*jshint node:true, eqeqeq:true, undef:true, curly:true, laxbreak:true, forin:true, smarttabs:true */
/*global */



var request = require('request'),
    jsdom   = require('jsdom'),
    fs      = require('fs');


// config params
var N             = 400;
var MIN_AVG_RATIO = 0;     // 0 -2
var MAX_BET_RATIO = 0.5;   // 0.25 0.5

var HEADERS = {
    'Cookie':     'COOKIE GOES HERE',
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.4 (KHTML, like Gecko) Chrome/22.0.1229.26 Safari/537.4'
};

var STATE = {
    cash:     0,
    betsLeft: 0
};



var rgx = /Payout: (\d+) greens. Cost to bid: (\d+\.\d+) greens/;
var rgx2 = /\((\d+) \-/;



// generic utility fns

var getTs = function() {
    var ts = new Date().toISOString();
    var i = ts.lastIndexOf('.');
    return ts.substring(0, i).replace('T', '_');
};

var log = function(msg, toAlternateFile) {
    console.log(msg);
    msg = [getTs(), ' - ', msg, '\n'].join('');
    fs.appendFile(toAlternateFile ? 'bets.txt' : 'log.txt', msg);
};

var save = function(fn, content) {
    fs.writeFile(fn, content);
};

var _p = function(n) {
    return (n * 100).toFixed(0) + '%';
};

var _f = function(n) {
    return (n).toFixed(1);
};



// scrapping fns

var handleRafflePageDocument = function(cb) {
    request({
            uri:    'https://codebits.eu/quiz',
            method: 'GET',
            timeout: 500,
            headers: HEADERS
        }, function(err, response, body) {

        if (err) { return log(err); }
        
        //return save('page.html', body.toString());

        var document = jsdom.jsdom(body);

        STATE.cash = scrapeCash(document);
        log('CASH: ' + _f(STATE.cash));

        scrapeWells(document, cb);
    });
};

var scrapeCash = function(document) {
    var el = document.getElementsByClassName('pull-right')[0];
    return parseFloat( el.childNodes[2].nodeValue.trim().split(' ')[0] );
};

var scrapeWells = function(document, cb) {
    var wellEls = document.body.getElementsByClassName('well');
    wellEls = Array.prototype.slice.call(wellEls);

    for (var i = 0, f = wellEls.length, pwRes; i < f; ++i) {
        pwRes = scrapeWell( wellEls[i] );
        STATE.betsLeft = pwRes.nrBets;
        if (pwRes.nrBets > 0) {
            for (var I = pwRes.nrBets; I > 0; --I) {
                bid(pwRes.formEls, cb);
            }
            break;
        }
        else {
            if (cb) { cb(); }
        }
    }
};

var scrapeWell = function(wellEl) {
    var formEls = wellEl.getElementsByTagName('form');
    formEls = Array.prototype.slice.call(formEls);

    var id = formEls.length > 0 ? formEls[0].action.split('/')[3] : '';

    if (!id) {
        return {nrBets:0};
    }

    var title   = wellEl.getElementsByTagName('h3')[0].innerHTML;
    var spanEls = wellEl.getElementsByTagName('span');
    var spanEl  = spanEls[0];
    var m       = rgx.exec(title);
    var payout  = parseInt(m[1], 10);
    var cost    = parseFloat(m[2]);

    var scriptEl = wellEl.parentNode.parentNode.getElementsByTagName('script')[0];
    var time     = rgx2.exec(scriptEl.innerHTML)[1];
    time = (time - new Date().valueOf()) / 1000;
    
    var nrFreeSlots    = formEls.length;
    var nrBidSlots     = spanEls.length - 1;
    var nrSlots        = nrFreeSlots + nrBidSlots;
    var freeSlotsRatio = nrFreeSlots / nrSlots;

    //TODO
    //nrFreeSlots = nrSlots;

    var min = -cost;
    var max = min + payout;

    var o = decide(N, MIN_AVG_RATIO, MAX_BET_RATIO, min, max, nrSlots, nrFreeSlots, cost);

    var nrBets  = o.nrBets;
    var betsAvg = o.betsAvg;

    var minN = min * nrBets;
    var maxN = minN + payout;

    var prob = nrBets / nrSlots;

    if (false) {//nrBets === 0) {
        log('skipped.\n');
    }
    else {
        log([
            '------------------------------\n',
            ' time:     ', _f(time), '\n',
            ' maxBetPO: ', _f((nrSlots - 1) * min + max), '\n',
            ' payout:   ', payout, '\n',
            ' cost:     ', _f(cost), '\n',
            ' slots:    ', nrFreeSlots, '/', nrSlots, ' (', _p(nrFreeSlots / nrSlots) ,')\n',
            ' nrBets:   ', nrBets,      '/', nrSlots, ' (', _p(nrBets      / nrSlots) ,')\n',
            ' bets:     ', _f(minN), ' | ', _f(betsAvg), ' | ', _f(maxN), '\n',
            ' prob:     ', _p(prob)
            
        ].join(''));
    }

    if (nrBets > 0) {
        log([
            'Trying to bet ', _f(minN), ' on ', nrBets, ' out of ', nrSlots, ' slots. Possible profit: ', _f(maxN), ', probability of profit: ', _p(prob)
        ].join(''), true);
    }

    return {
        formEls:    formEls,
        nrBets:     nrBets,
        id:         id
    };
};

var bidCb = function(err, response, body) {
    var cb = this;

    --STATE.bidsLeft;

    if (err) {
        log('ERR: ' + err);
        if (cb && STATE.bidsLeft === 0) { cb(); }
        return;
    }

    /*var n = Math.floor( Math.random() * 100000 );
    save(n + '.html', body);*/

    var document = jsdom.jsdom(body);

    var alertEl = document.getElementsByClassName('alert')[0];
    var alertText = alertEl.getElementsByTagName('strong')[0].innerHTML;
    var alertClasses = alertEl.className.split(' ');

    var success = (alertClasses.indexOf('alert-success') !== -1);

    log(success ? 'OK' : 'FAILED (' + alertText + ')');

    if (cb && STATE.bidsLeft === 0) { cb(); }
};

var bid = function(formEls, cb) {
    var i = Math.floor( Math.random() * formEls.length );
    var formEl = formEls.splice(i, 1)[0];
    var uri = 'https://codebits.eu' + formEl.action;
    log('Submitting ' + uri + '...');

    request(
        {
            uri:     uri,
            method: 'POST',
            jar:    false,
            timeout: 10000,
            //timeout:500,
            headers: HEADERS
        } ,bidCb.bind(cb || function(){})
    );
};



// bot logic fns

var outcome = function(min, max, slots, bets) {
    if (!bets) { bets = 1; }
    var winR = bets / slots;
    var r = Math.random();
    if (r < winR) { return max + min * (bets -1); } // won
    else {          return min * bets;            } // lost
};

var runNOutcomes = function(n, min, max, slots, bets) {
    var res = 0;
    for (var i = 0; i < n; ++i) {
        res += outcome(min, max, slots, bets);
    }
    return res;
};

var decide = function(n, minAvgRatio, maxBetRatio, min, max, nrSlots, nrFreeSlots, cost) {
    var cash = STATE.cash;
    var minAvg = minAvgRatio * cash;
    var i, avg, bcr, nrBets = 0, betsAvg = minAvg;  // at least minAvg greens on average
    for (i = 1; i <= nrFreeSlots; ++i) {
        avg = runNOutcomes(n, min, max, nrSlots, i) / n;
        bcr = cost * n / cash;  // bet cost ratio

        if (bcr > maxBetRatio) { break; } // don't bet cost be above maxBetRatio of cash

        if (avg > betsAvg) {
            betsAvg = avg;
            nrBets  = i;
        }
    }

    return {
        nrBets:  nrBets,
        betsAvg: betsAvg
    };
};



// go!

//log('starting...');

if (true) {
    handleRafflePageDocument();

    setTimeout(
        function() {
            //console.log('\nAborting in 1 sec...');
            process.exit(0);
        },
        2000
    );
}
else {
    var cycleCb = function() {
        setTimeout(
            function() {
                handleRafflePageDocument(cycleCb);
            },
            500
        );
    };

    cycleCb();
}
